import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { seedIssue } from "../../lib/seed.ts";
import { hkdfSync } from "node:crypto";
import { EncryptJWT } from "jose";

test("HTTP publishing, duplicate protection, authentication and public validation", { timeout: 60_000 }, async (context) => {
  const directory = await mkdtemp(`${tmpdir()}/cerulean-http-`);
  const socket = createServer().listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = (socket.address() as { port: number }).port;
  await new Promise<void>((resolve) => socket.close(() => resolve()));
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    env: { ...process.env, VERCEL: "", DATABASE_URL: "", DATABASE_URL_UNPOOLED: "", DATABASE_PATH: `${directory}/test.db`, SEED_DEMO: "false",
      AUTH0_DOMAIN: "test.example.com", AUTH0_CLIENT_ID: "http-test", AUTH0_CLIENT_SECRET: "test-only", AUTH0_SECRET: "a".repeat(64),
      CERULEAN_APP_URL: base, CERULEAN_MARKETING_URL: base, APP_BASE_URL: base,
      CERULEAN_OWNER_SUBJECT: "http-test-owner", CERULEAN_SITE_URL: base, CERULEAN_API_USER: "test", CERULEAN_API_PASSWORD: "local-test-only", CERULEAN_MCP_AUTH_MODE: "pilot", CERULEAN_MCP_TOKEN: "local-mcp-only" },
    stdio: "ignore",
  });
  let client: Client | undefined;
  context.after(async () => {
    await client?.close();
    if (server.exitCode === null && server.signalCode === null) {
      const exited = once(server, "exit");
      server.kill();
      const timeout = setTimeout(() => server.kill("SIGKILL"), 3_000);
      await exited;
      clearTimeout(timeout);
    }
    await rm(directory, { recursive: true, force: true });
  });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { ready = (await fetch(`${base}/`)).status === 200; } catch { /* Server is starting. */ }
    if (ready) break;
    if (server.exitCode !== null) throw new Error("Next.js server exited before becoming ready");
    await delay(100);
  }
  assert.equal(ready, true);
  assert.equal((await fetch(`${base}/mcp`)).status, 401);
  const headers = { Authorization: `Basic ${Buffer.from("test:local-test-only").toString("base64")}`, "Content-Type": "application/json" };
  for (const date of ["not-a-date", "2026-02-31"]) {
    assert.equal((await fetch(`${base}/issues/${date}`, { redirect: "manual" })).status, 307);
    assert.equal((await fetch(`${base}/api/issues/${date}`, { headers })).status, 404);
  }
  const issue = { ...seedIssue, date: "2031-01-15", title: "Original HTTP edition" };
  client = new Client({ name: "http-test", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { Authorization: "Bearer local-mcp-only" } } }));
  const tools = await client.listTools();
  assert.ok(tools.tools.some((tool) => tool.name === "create_daily_edition"));
  const created = await client.callTool({ name: "create_daily_edition", arguments: issue });
  assert.equal((created.structuredContent as Record<string, unknown>)?.status, "created");
  const duplicate = await client.callTool({ name: "create_daily_edition", arguments: { ...issue, title: "Must not replace" } });
  assert.equal((duplicate.structuredContent as Record<string, unknown>)?.status, "already_exists");
  assert.equal((await (await fetch(`${base}/api/issues/${issue.date}`, { headers })).json()).title, issue.title);
  assert.equal((await fetch(`${base}/issues/${issue.date}`, { redirect: "manual" })).status, 307);
  // Exercise the real SDK session decoder with test-only encrypted cookies.
  // No authentication bypass is added to the application.
  async function session(subject: string) {
    const now = Math.floor(Date.now() / 1000);
    const key = new Uint8Array(hkdfSync("sha256", "a".repeat(64), "", "JWE CEK", 32));
    const token = await new EncryptJWT({ user: { sub: subject }, internal: { sid: subject, createdAt: now }, tokenSet: { expiresAt: now + 3600 } })
      .setProtectedHeader({ alg: "dir", enc: "A256GCM" }).setExpirationTime(now + 3600).encrypt(key);
    return { Cookie: `__session=${token}` };
  }
  const ownerSession = await session("http-test-owner");
  const otherSession = await session("other-reader");
  const privatePage = await fetch(`${base}/issues/${issue.date}`, { headers: ownerSession });
  assert.equal(privatePage.status, 200);
  assert.match(privatePage.headers.get("cache-control") || "", /private/);
  assert.match(await privatePage.text(), /Original HTTP edition|A focused|issue-hero/);
  assert.equal((await fetch(`${base}/issues/${issue.date}`, { headers: otherSession })).status, 404);
  const otherArchive = await (await fetch(`${base}/archive`, { headers: otherSession })).text();
  assert.ok(!otherArchive.includes(issue.title));
  assert.ok(otherArchive.includes("Your first edition has not been published"));
  assert.equal((await fetch(`${base}/onboarding`, { redirect: "manual" })).status, 307);
  const newReaderToday = await fetch(`${base}/today`, { headers: otherSession, redirect: "manual" });
  assert.equal(newReaderToday.headers.get("location"), "/onboarding");
  const onboarding = await fetch(`${base}/onboarding`, { headers: otherSession });
  assert.equal(onboarding.status, 200);
  assert.match(await onboarding.text(), /Make room for reading/);
  const interests = await fetch(`${base}/onboarding?step=interests`, { headers: otherSession });
  assert.match(await interests.text(), /Science &amp; nature/);
  const privateSettings = await fetch(`${base}/settings`, { headers: otherSession });
  assert.equal(privateSettings.status, 200);
  assert.equal((await fetch(`${base}/settings`, { redirect: "manual" })).status, 307);
  assert.equal((await fetch(`${base}/issues/${issue.date}`, { headers: { Cookie: "__session=tampered" }, redirect: "manual" })).status, 307);
  for (const [date, payload, expected] of [
    ["2031-01-16", { ...issue, date: "2031-01-16" }, 201],
    [issue.date, { ...issue, title: "Explicit replacement" }, 200],
    ["2031-01-17", issue, 409],
    ["2026-02-31", { ...issue, date: "2026-02-31" }, 422],
    [issue.date, { ...issue, availableMinutes: 1400 }, 422],
  ] as const) {
    const response = await fetch(`${base}/api/issues/${date}`, { method: "PUT", headers, body: JSON.stringify(payload) });
    assert.equal(response.status, expected);
  }
  assert.equal((await fetch(`${base}/api/issues/${issue.date}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(issue) })).status, 401);
});
