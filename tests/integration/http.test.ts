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

test("HTTP publishing, duplicate protection, authentication and public validation", { timeout: 60_000 }, async (context) => {
  const directory = await mkdtemp(`${tmpdir()}/cerulean-http-`);
  const socket = createServer().listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = (socket.address() as { port: number }).port;
  await new Promise<void>((resolve) => socket.close(() => resolve()));
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    env: { ...process.env, VERCEL: "", DATABASE_URL: "", DATABASE_URL_UNPOOLED: "", DATABASE_PATH: `${directory}/test.db`, SEED_DEMO: "false",
      CERULEAN_SITE_URL: base, CERULEAN_API_USER: "test", CERULEAN_API_PASSWORD: "local-test-only", CERULEAN_MCP_AUTH_MODE: "pilot", CERULEAN_MCP_TOKEN: "local-mcp-only" },
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
    try { ready = (await fetch(`${base}/archive`)).status === 200; } catch { /* Server is starting. */ }
    if (ready) break;
    if (server.exitCode !== null) throw new Error("Next.js server exited before becoming ready");
    await delay(100);
  }
  assert.equal(ready, true);
  assert.equal((await fetch(`${base}/mcp`)).status, 401);
  const headers = { Authorization: `Basic ${Buffer.from("test:local-test-only").toString("base64")}`, "Content-Type": "application/json" };
  for (const date of ["not-a-date", "2026-02-31"]) {
    assert.equal((await fetch(`${base}/issues/${date}`)).status, 404);
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
  assert.equal((await fetch(`${base}/issues/${issue.date}`)).status, 200);
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
