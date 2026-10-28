import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { promisify } from "node:util";
import { brotliDecompress, gunzip, inflate } from "node:zlib";
import { Readability, isProbablyReaderable } from "@mozilla/readability";
import { JSDOM, VirtualConsole } from "jsdom";
import ipaddr from "ipaddr.js";

export type LinkMetadata = {
  title: string | null;
  publication: string;
  readingMinutes: number | null;
};

type Address = { address: string; family: number };
export type MetadataResponse = {
  status: number;
  headers: Record<string, string | undefined>;
  body: AsyncIterable<Uint8Array>;
  close: () => void;
};
export type MetadataRequest = {
  url: URL;
  address: Address;
  signal: AbortSignal;
};
type Dependencies = {
  lookup?: (hostname: string) => Promise<Address[]>;
  request?: (input: MetadataRequest) => Promise<MetadataResponse>;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
};

const MAX_BYTES = 2 * 1024 * 1024;
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const unzip = promisify(gunzip);
const unflate = promisify(inflate);
const unbrotli = promisify(brotliDecompress);

function isPublicAddress(address: Address): boolean {
  if (isIP(address.address) !== address.family) return false;
  const parsed = ipaddr.parse(address.address);
  // Reject all special ranges, including mapped IPv4, NAT64 and transition
  // addresses. IPv6 must also be in the globally allocated unicast space.
  return parsed.range() === "unicast" &&
    (parsed.kind() === "ipv4" || parsed.match(ipaddr.parse("2000::"), 3));
}

function checkedUrl(input: string): URL {
  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) {
    throw new Error("Metadata requires a public HTTP(S) URL on its standard port");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("Metadata cannot access local hosts");
  }
  url.hash = "";
  return url;
}

/** The lookup callback is the only DNS source used by the socket. The URL's
 * original host remains in Host and TLS SNI/certificate verification. */
export function pinnedLookup(address: Address): LookupFunction {
  return (_hostname, options, callback) => {
    if (options.all) callback(null, [address]);
    else callback(null, address.address, address.family);
  };
}

function requestPinned({ url, address, signal }: MetadataRequest): Promise<MetadataResponse> {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
      method: "GET",
      signal,
      agent: false,
      lookup: pinnedLookup(address),
      family: address.family,
      maxHeaderSize: 16 * 1024,
      headers: {
        accept: "text/html, application/xhtml+xml",
        "accept-encoding": "identity",
        "user-agent": "filtered.page link metadata (+https://filtered.page)",
      },
    }, (response) => resolve({
      status: response.statusCode ?? 0,
      headers: Object.fromEntries(Object.entries(response.headers).map(([key, value]) =>
        [key, Array.isArray(value) ? value.join(", ") : value])),
      body: response,
      close: () => response.destroy(),
    }));
    request.on("error", reject);
    request.end();
  });
}

async function readHtml(response: MetadataResponse, maxBytes: number): Promise<Buffer> {
  const length = Number(response.headers["content-length"]);
  if (Number.isFinite(length) && length > maxBytes) throw new Error("Metadata response is too large");
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.byteLength;
    if (bytes > maxBytes) throw new Error("Metadata response is too large");
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks);
  const encoding = (response.headers["content-encoding"] ?? "identity").trim().toLowerCase();
  // Some servers compress even when identity was requested. Bound both the
  // transfer and decoded output to reject compression bombs.
  const options = { maxOutputLength: maxBytes };
  if (encoding === "gzip") return unzip(raw, options);
  if (encoding === "deflate") return unflate(raw, options);
  if (encoding === "br") return unbrotli(raw, options);
  if (encoding !== "identity") throw new Error("Unsupported metadata content encoding");
  return raw;
}

function clean(value: string | null | undefined, maxLength: number): string | null {
  return value?.replace(/\s+/g, " ").trim().slice(0, maxLength) || null;
}

function metadataFromHtml(html: Buffer, url: URL, contentType: string): LinkMetadata {
  // No script execution, subresource loading or cookies. The DOM and article
  // text exist only for this call; only the three metadata fields escape it.
  const dom = new JSDOM(html, { url: url.href, contentType, virtualConsole: new VirtualConsole() });
  try {
    const doc = dom.window.document;
    const meta = (key: string) => doc.querySelector(`meta[property="${key}"], meta[name="${key}"]`)?.getAttribute("content");
    const title = clean(meta("og:title") || meta("twitter:title") || doc.title, 500);
    const publication = clean(meta("og:site_name"), 160) || url.hostname.replace(/^www\./, "");
    const paywalled = !!doc.querySelector('[class~="paywall"], #paywall, [data-testid="paywall"]') ||
      [...doc.querySelectorAll('script[type="application/ld+json"]')].some((script) =>
        /"isAccessibleForFree"\s*:\s*(?:false|"false")/i.test(script.textContent ?? ""));
    // Navigation and subscription scaffolding should never become a made-up
    // reading duration. Readability's heuristic plus a minimum word count
    // deliberately leaves short articles and uncertain captures unknown.
    doc.querySelectorAll('nav, header, footer, aside, form, [role="navigation"], [hidden], [aria-hidden="true"]').forEach((node) => node.remove());
    if (!isProbablyReaderable(doc) || paywalled) return { title, publication, readingMinutes: null };
    const article = new Readability(doc, { maxElemsToParse: 30_000, charThreshold: 500 }).parse();
    const words = article?.textContent?.match(/\p{L}[\p{L}\p{N}'’\-]*/gu)?.length ?? 0;
    const estimatedMinutes = Math.ceil(words / 230);
    return {
      title: title || clean(article?.title, 500),
      publication,
      readingMinutes: words >= 200 && estimatedMinutes <= 240 ? estimatedMinutes : null,
    };
  } finally {
    dom.window.close();
  }
}

/** Inject DNS and HTTP seams in tests; production always pins validated DNS.
 * Failures are reported to the caller, which can still retain the saved URL. */
export function createLinkMetadataExtractor(dependencies: Dependencies = {}) {
  const lookup = dependencies.lookup ?? ((hostname: string) => dnsLookup(hostname, { all: true, verbatim: true }));
  const request = dependencies.request ?? requestPinned;
  const maxBytes = dependencies.maxBytes ?? MAX_BYTES;
  const maxRedirects = dependencies.maxRedirects ?? 4;
  return async (input: string): Promise<LinkMetadata> => {
    const controller = new AbortController();
    let activeResponse: MetadataResponse | undefined;
    const timer = setTimeout(() => controller.abort(new Error("Metadata request timed out")), dependencies.timeoutMs ?? 10_000);
    const abort = new Promise<never>((_, reject) => {
      controller.signal.addEventListener("abort", () => {
        reject(controller.signal.reason);
        activeResponse?.close();
      }, { once: true });
    });
    const retrieve = async () => {
      let url = checkedUrl(input);
      for (let redirects = 0; ; redirects++) {
        controller.signal.throwIfAborted();
        const hostname = url.hostname.replace(/^\[|\]$/g, "");
        const family = isIP(hostname);
        const addresses = family ? [{ address: hostname, family }] : await lookup(hostname);
        // A mixed public/private DNS answer is also unsafe. Never fall back to
        // an unchecked address after connection errors or a redirect.
        if (!addresses.length || addresses.some((address) => !isPublicAddress(address))) {
          throw new Error("Metadata cannot access a non-public address");
        }
        controller.signal.throwIfAborted();
        const response = await request({ url, address: addresses[0], signal: controller.signal });
        activeResponse = response;
        try {
          controller.signal.throwIfAborted();
          if (REDIRECTS.has(response.status)) {
            if (redirects >= maxRedirects || !response.headers.location) throw new Error("Too many or invalid metadata redirects");
            url = checkedUrl(new URL(response.headers.location, url).href);
            continue;
          }
          if (response.status < 200 || response.status >= 300) throw new Error(`Metadata request failed (${response.status})`);
          const contentType = response.headers["content-type"] ?? "";
          if (!/^(?:text\/html|application\/xhtml\+xml)(?:\s*;|\s*$)/i.test(contentType)) throw new Error("Metadata response is not HTML");
          const html = await readHtml(response, maxBytes);
          controller.signal.throwIfAborted();
          return metadataFromHtml(html, url, contentType);
        } finally {
          response.close();
          activeResponse = undefined;
        }
      }
    };
    try {
      return await Promise.race([retrieve(), abort]);
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  };
}

export const extractLinkMetadata = createLinkMetadataExtractor();
