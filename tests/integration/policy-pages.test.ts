import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

// Requires npm run build. Exercise SSR/proxy boundaries, not just source strings.
for (const deployment of ["production", "preview"] as const) {
  test(`anonymous policy routes in ${deployment} do not need authentication or a database`, { timeout: 30_000 }, async context => {
    const socket = createServer().listen(0, "127.0.0.1");
    await once(socket, "listening");
    const port = (socket.address() as { port: number }).port;
    await new Promise<void>(resolve => socket.close(() => resolve()));
    const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "-p", String(port)], {
      env: { ...process.env, NODE_ENV: "production", VERCEL_ENV: deployment, POLICY_REVIEW_ENABLED: "true",
        AUTH0_DOMAIN: "", AUTH0_CLIENT_ID: "", AUTH0_CLIENT_SECRET: "", AUTH0_SECRET: "",
        DATABASE_URL: "postgres://unreachable.invalid/no-database", CERULEAN_APP_URL: "", APP_BASE_URL: "", CERULEAN_SITE_URL: "", CERULEAN_MARKETING_URL: "" },
      stdio: "ignore",
    });
    context.after(async () => {
      if (server.exitCode === null && server.signalCode === null) {
        const exited = once(server, "exit");
        server.kill();
        const timeout = setTimeout(() => server.kill("SIGKILL"), 3000);
        await exited;
        clearTimeout(timeout);
      }
    });
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { ready = (await fetch(`${base}/support`)).status === 200; } catch { /* Starting. */ }
      if (ready) break;
      if (server.exitCode !== null) throw new Error("Next exited before readiness");
      await delay(100);
    }
    assert.ok(ready);
    for (const path of ["privacy", "terms", "support"]) {
      const response = await fetch(`${base}/${path}`, { redirect: "manual" });
      assert.equal(response.status, 200);
      assert.match(response.headers.get("cache-control") ?? "", /no-store/);
      assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
      const html = await response.text();
      assert.match(html, /<main/);
      assert.match(html, /name="robots" content="noindex, nofollow"/);
      assert.ok(!html.includes("mailto:"));
      if (deployment === "production") {
        assert.match(html, /Not yet available/);
        assert.ok(!html.includes("Decisions before publication"));
        assert.ok(!html.includes("Draft for review"));
        assert.ok(!html.includes("Privacy draft"));
        assert.ok(!html.includes("up to 50"));
      } else {
        assert.match(html, /Draft for review/);
        assert.match(html, /Decisions before publication/);
        assert.match(html, /Privacy draft/);
        if (path === "privacy") {
          assert.match(html, /not exclusively browser-local/);
          assert.match(html, /pending friend recommendations/);
          assert.match(html, /up to 50/);
        }
      }
    }
  });
}
