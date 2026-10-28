import assert from "node:assert/strict";
import test from "node:test";
import { gzipSync } from "node:zlib";
import { createLinkMetadataExtractor, pinnedLookup, type MetadataRequest, type MetadataResponse } from "../lib/link-metadata.ts";

const PUBLIC = { address: "93.184.216.34", family: 4 };
const paragraph = "A quiet afternoon gives us time to notice the small details of everyday life. Walking through the garden, we find that patient observation changes how we understand familiar places and the people who share them with us.";
const article = `<html><head><title>A quiet afternoon</title><meta property="og:site_name" content="Field Notes"></head><body><article><h1>A quiet afternoon</h1>${Array.from({ length: 12 }, () => `<p>${paragraph}</p>`).join("")}</article></body></html>`;

function response(body: string | Buffer = article, options: { status?: number; headers?: Record<string, string>; close?: () => void } = {}): MetadataResponse {
  return {
    status: options.status ?? 200,
    headers: { "content-type": "text/html; charset=utf-8", ...options.headers },
    body: (async function* () { yield Buffer.from(body); })(),
    close: options.close ?? (() => {}),
  };
}

test("extracts only title, publication and a duration from actual article text", async () => {
  let closed = false;
  const extract = createLinkMetadataExtractor({
    lookup: async () => [PUBLIC],
    request: async ({ url, address }) => {
      assert.equal(url.href, "https://example.com/essay");
      assert.deepEqual(address, PUBLIC);
      return response(article, { close: () => { closed = true; } });
    },
  });
  assert.deepEqual(await extract("https://example.com/essay#section"), {
    title: "A quiet afternoon", publication: "Field Notes", readingMinutes: 2,
  });
  assert.ok(closed);
});

test("sparse pages and navigation do not fabricate reading time", async () => {
  const extract = createLinkMetadataExtractor({ lookup: async () => [PUBLIC], request: async () => response(`<title>Bookmarks</title><nav>${`<p>${paragraph}</p>`.repeat(30)}</nav><p>Sign in to read.</p>`) });
  assert.deepEqual(await extract("https://www.example.com/"), { title: "Bookmarks", publication: "example.com", readingMinutes: null });
});

test("an article beyond the supported four-hour range keeps its title but has unknown duration", async () => {
  const longArticle = `<title>A very long work</title><article>${`<p>${paragraph}</p>`.repeat(1600)}</article>`;
  const extract = createLinkMetadataExtractor({ lookup: async () => [PUBLIC], request: async () => response(longArticle) });
  const metadata = await extract("https://example.com/long-work");
  assert.equal(metadata.title, "A very long work");
  assert.equal(metadata.readingMinutes, null, "do not clamp a longer work to an inaccurate four-hour estimate");
});

test("missing titles stay unknown and scripts do not run", async () => {
  const extract = createLinkMetadataExtractor({ lookup: async () => [PUBLIC], request: async () => response('<script>document.title="Executed"</script><p>Hello</p>') });
  assert.deepEqual(await extract("https://example.com/"), { title: null, publication: "example.com", readingMinutes: null });
});

test("paywall and paid-access schema prevent estimating from a partial article", async () => {
  for (const marker of ['<div class="paywall">Subscribe</div>', '<script type="application/ld+json">{"isAccessibleForFree":false}</script>']) {
    const extract = createLinkMetadataExtractor({ lookup: async () => [PUBLIC], request: async () => response(article.replace("</body>", `${marker}</body>`)) });
    assert.equal((await extract("https://example.com/")).readingMinutes, null);
  }
});

test("redirect targets are independently resolved, validated and pinned", async () => {
  const hosts: string[] = [];
  const requests: MetadataRequest[] = [];
  let closed = 0;
  const extract = createLinkMetadataExtractor({
    lookup: async (host) => { hosts.push(host); return [PUBLIC]; },
    request: async (request) => {
      requests.push(request);
      return requests.length === 1
        ? response("", { status: 302, headers: { location: "https://publisher.example/read" }, close: () => { closed++; } })
        : response(article, { close: () => { closed++; } });
    },
  });
  assert.equal((await extract("https://example.com/")).title, "A quiet afternoon");
  assert.deepEqual(hosts, ["example.com", "publisher.example"]);
  assert.deepEqual(requests.map(({ address }) => address), [PUBLIC, PUBLIC]);
  assert.equal(closed, 2);
});

test("re-resolves a redirect to the same hostname and rejects DNS rebinding", async () => {
  let lookups = 0;
  let requests = 0;
  const extract = createLinkMetadataExtractor({
    lookup: async () => [++lookups === 1 ? PUBLIC : { address: "127.0.0.1", family: 4 }],
    request: async () => { requests++; return response("", { status: 302, headers: { location: "/private" } }); },
  });
  await assert.rejects(extract("https://example.com/"), /non-public/);
  assert.equal(requests, 1);
});

test("rejects redirect targets to private IPs, credentials and non-web schemes", async () => {
  for (const location of ["http://169.254.169.254/", "https://user:secret@example.com/", "file:///etc/passwd", "http://example.com:8080/"]) {
    let requests = 0;
    const extract = createLinkMetadataExtractor({
      lookup: async () => [PUBLIC],
      request: async () => { requests++; return response("", { status: 302, headers: { location } }); },
    });
    await assert.rejects(extract("https://example.com/"));
    assert.equal(requests, 1);
  }
});

test("blocks private, loopback, link-local, multicast, reserved and encoded IP hosts before connecting", async () => {
  let calls = 0;
  const extract = createLinkMetadataExtractor({ request: async () => { calls++; return response(); } });
  for (const host of ["127.0.0.1", "127.1", "2130706433", "0x7f000001", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "192.0.2.1", "198.18.0.1", "224.0.0.1", "240.0.0.1", "0.0.0.0", "[::1]", "[::]", "[fc00::1]", "[fe80::1]", "[::ffff:127.0.0.1]", "[2001:db8::1]", "[64:ff9b::7f00:1]", "[2002:7f00:1::]", "[ff02::1]", "localhost", "service.localhost", "host.local"]) {
    await assert.rejects(extract(`http://${host}/`), { name: "Error" }, host);
  }
  assert.equal(calls, 0);
});

test("rejects unsafe or empty DNS results, including mixed public and private answers", async () => {
  for (const addresses of [[], [{ address: "10.0.0.1", family: 4 }], [PUBLIC, { address: "::1", family: 6 }], [{ address: PUBLIC.address, family: 6 }]]) {
    const extract = createLinkMetadataExtractor({
      lookup: async () => addresses,
      request: async () => { assert.fail("Unsafe DNS must never reach the transport"); },
    });
    await assert.rejects(extract("https://example.com/"), /non-public/);
  }
});

test("permits globally routable IPv6 and standard explicit web ports", async () => {
  const extract = createLinkMetadataExtractor({ request: async ({ address }) => {
    assert.deepEqual(address, { address: "2606:4700:4700::1111", family: 6 });
    return response();
  } });
  assert.equal((await extract("https://[2606:4700:4700::1111]:443/")).title, "A quiet afternoon");
});

test("connection lookup returns only the pinned address without a second resolution", () => {
  const lookup = pinnedLookup(PUBLIC);
  lookup("attacker.example", {}, (error, address, family) => {
    assert.equal(error, null);
    assert.equal(address, PUBLIC.address);
    assert.equal(family, 4);
  });
  lookup("attacker.example", { all: true }, (error, addresses) => {
    assert.equal(error, null);
    assert.deepEqual(addresses, [PUBLIC]);
  });
});

test("limits redirects and closes every discarded response", async () => {
  let closed = 0;
  const extract = createLinkMetadataExtractor({
    lookup: async () => [PUBLIC], maxRedirects: 2,
    request: async () => response("", { status: 302, headers: { location: "/again" }, close: () => { closed++; } }),
  });
  await assert.rejects(extract("https://example.com/"), /redirects/);
  assert.equal(closed, 3);
});

test("limits announced and streamed bodies, and closes them on rejection", async () => {
  for (const headers of [{ "content-length": "10000" }, {}] as Record<string, string>[]) {
    let closed = false;
    const extract = createLinkMetadataExtractor({
      lookup: async () => [PUBLIC], maxBytes: 100,
      request: async () => response(article, { headers, close: () => { closed = true; } }),
    });
    await assert.rejects(extract("https://example.com/"), /too large/);
    assert.ok(closed);
  }
});

test("bounds decoded gzip size and accepts safely bounded compression", async () => {
  const compressed = gzipSync(article);
  const request = async () => response(compressed, { headers: { "content-encoding": "gzip" } });
  const extract = createLinkMetadataExtractor({ lookup: async () => [PUBLIC], request });
  assert.equal((await extract("https://example.com/")).title, "A quiet afternoon");
  const limited = createLinkMetadataExtractor({ lookup: async () => [PUBLIC], request, maxBytes: compressed.length + 1 });
  await assert.rejects(limited("https://example.com/"));
});

test("timeouts cover DNS resolution and stalled response bodies", async () => {
  const stalledDns = createLinkMetadataExtractor({ timeoutMs: 10, lookup: async () => new Promise(() => {}) });
  await assert.rejects(stalledDns("https://example.com/"), /timed out/);
  let signal: AbortSignal | undefined;
  const stalledBody = createLinkMetadataExtractor({
    timeoutMs: 10, lookup: async () => [PUBLIC],
    request: async (input) => {
      signal = input.signal;
      return { ...response(), body: (async function* () { await new Promise(() => {}); yield Buffer.alloc(0); })() };
    },
  });
  await assert.rejects(stalledBody("https://example.com/"), /timed out/);
  assert.equal(signal?.aborted, true);
});

test("rejects retrieval errors and non-HTML responses", async () => {
  for (const reply of [response("Denied", { status: 403 }), response("{}", { headers: { "content-type": "application/json" } })]) {
    const extract = createLinkMetadataExtractor({ lookup: async () => [PUBLIC], request: async () => reply });
    await assert.rejects(extract("https://example.com/"));
  }
});
