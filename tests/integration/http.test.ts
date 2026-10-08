import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile } from "node:fs/promises";
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
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "-p", String(port)], {
    env: { ...process.env, VERCEL_ENV: "production", POLICY_REVIEW_ENABLED: "true", VERCEL: "", DATABASE_URL: "", DATABASE_URL_UNPOOLED: "", DATABASE_PATH: `${directory}/test.db`, SEED_DEMO: "false",
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
  // Configured Auth0 must not turn public policy routes into a sign-in wall.
  for (const route of ["privacy", "terms", "support"]) {
    const response = await fetch(`${base}/${route}`, { redirect: "manual" });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") || "", /no-store/);
    assert.match(response.headers.get("x-robots-tag") || "", /noindex/);
    const markup = await response.text();
    assert.match(markup, /Not yet available/);
    assert.ok(!markup.includes("Decisions before publication"));
  }
  assert.equal((await fetch(`${base}/mcp`)).status, 401);
  const headers = { Authorization: `Basic ${Buffer.from("test:local-test-only").toString("base64")}`, "Content-Type": "application/json" };
  for (const date of ["not-a-date", "2026-02-31"]) {
    assert.equal((await fetch(`${base}/issues/${date}`, { redirect: "manual" })).status, 307);
    assert.equal((await fetch(`${base}/api/issues/${date}`, { headers })).status, 404);
  }
  // An old edition must still be the latest without a false missing-today warning.
  const issue = { ...seedIssue, date: "2021-01-15", title: "Original HTTP edition" };
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
  const defaultEdition = await (await fetch(`${base}/issues/${issue.date}`, { headers: ownerSession })).text();
  assert.ok(defaultEdition.includes("Curiofold"));
  assert.ok(defaultEdition.includes(`href="${base}/latest">Latest</a>`));
  assert.ok(!defaultEdition.includes("edition has not arrived yet"));
  assert.ok(!defaultEdition.includes("Daybook"));
  assert.ok(defaultEdition.includes('data-reader-theme="quiet-book"'));
  assert.ok(defaultEdition.includes('class="edition-sidebar"'));
  assert.equal((defaultEdition.match(/class="edition-sidebar"/g) ?? []).length, 1);
  assert.ok(defaultEdition.includes('class="article-byline"'));
  assert.ok(!defaultEdition.includes('class="item-details"'));
  assert.ok(defaultEdition.includes('class="article-controls"'));
  assert.ok(!defaultEdition.includes('class="item-utilities"'));
  assert.ok(!defaultEdition.includes('Edition appearance'));
  for (const style of ["quiet-book", "tactile-correspondence"]) {
    const response = await fetch(`${base}/issues/${issue.date}/${style}`, { headers: ownerSession, redirect: "manual" });
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), `/issues/${issue.date}`);
  }
  const otherArchive = await (await fetch(`${base}/archive`, { headers: otherSession })).text();
  assert.ok(!otherArchive.includes(issue.title));
  assert.ok(otherArchive.includes("Your first edition has not been published"));
  assert.equal((await fetch(`${base}/onboarding`, { redirect: "manual" })).status, 307);
  const legacyToday = await fetch(`${base}/today`, { headers: otherSession, redirect: "manual" });
  assert.equal(legacyToday.headers.get("location"), "/latest");
  const newReaderLatest = await fetch(`${base}/latest`, { headers: otherSession, redirect: "manual" });
  assert.equal(newReaderLatest.headers.get("location"), "/onboarding");
  const ownerLatest = await fetch(`${base}/latest`, { headers: ownerSession, redirect: "manual" });
  assert.equal(ownerLatest.headers.get("location"), `/issues/${issue.date}`);
  const onboarding = await fetch(`${base}/onboarding`, { headers: otherSession });
  assert.equal(onboarding.status, 200);
  assert.match(await onboarding.text(), /Make room for reading/);
  const interests = await fetch(`${base}/onboarding?step=interests`, { headers: otherSession });
  assert.match(await interests.text(), /Science &amp; nature/);
  const privateSettings = await fetch(`${base}/settings`, { headers: otherSession });
  assert.equal(privateSettings.status, 200);
  assert.equal((await fetch(`${base}/settings`, { redirect: "manual" })).status, 307);
  // Exercise the actual compiled server action through Next's HTTP boundary.
  const actionManifest = JSON.parse(await readFile(".next/server/server-reference-manifest.json", "utf8"));
  // Submit the bound onboarding forms exactly as a browser without JavaScript can.
  async function submitOnboarding(step: string, fields: Record<string, string>) {
    const markup = await (await fetch(`${base}/onboarding?step=${step}`, { headers: otherSession })).text();
    const formMarkup = markup.match(/<form\b[^>]*>[\s\S]*?<\/form>/g)?.find(value => value.includes(`name="${step === "rhythm" ? "deliveryFrequency" : "guidelines"}"`));
    assert.ok(formMarkup, "onboarding step includes its form");
    const body = new FormData();
    for (const input of formMarkup.matchAll(/<input\b[^>]*>/g)) {
      const name = input[0].match(/name="([^"]*)"/)?.[1];
      if (!name?.startsWith("$ACTION")) continue;
      const value = input[0].match(/value="([^"]*)"/)?.[1] ?? "";
      body.set(name, value.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&"));
    }
    for (const [key, value] of Object.entries(fields)) body.set(key, value);
    return fetch(`${base}/onboarding?step=${step}`, { method: "POST", headers: { ...otherSession, Origin: base }, body, redirect: "manual" });
  }
  const rhythmSaved = await submitOnboarding("rhythm", { readingMinutes: "25", editionMinutes: "50", timeZone: "Europe/Amsterdam", deliveryFrequency: "weekly", deliveryTime: "19:45", deliveryDay: "Sunday" });
  assert.equal(rhythmSaved.status, 303);
  assert.equal(rhythmSaved.headers.get("location"), "/onboarding?step=interests");
  const interestsSaved = await submitOnboarding("interests", { interests: "Technology", guidelines: "More useful ideas" });
  assert.equal(interestsSaved.headers.get("location"), "/onboarding?step=connect");
  assert.equal((await fetch(`${base}/onboarding?step=interests`, { headers: otherSession, redirect: "manual" })).headers.get("location"), "/settings");
  const connectMarkup = await (await fetch(`${base}/onboarding?step=connect`, { headers: otherSession })).text();
  assert.ok(connectMarkup.includes("Every Sunday at 19:45 (Europe/Amsterdam)"));
  assert.ok(connectMarkup.includes("Create or update my recurring ChatGPT task"));
  const rhythmMarkup = await (await fetch(`${base}/onboarding?step=rhythm`, { headers: otherSession })).text();
  assert.match(rhythmMarkup, /value="weekly" selected=""/);
  assert.match(rhythmMarkup, /value="Sunday" selected=""/);
  assert.ok(rhythmMarkup.includes('value="19:45"'));
  const ownerConnect = await (await fetch(`${base}/onboarding?step=connect`, { headers: ownerSession })).text();
  assert.ok(!ownerConnect.includes("Every Sunday at 19:45"));
  const settingsMarkup = await privateSettings.text();
  const themeActionId = settingsMarkup.match(/name="\$ACTION_ID_([^"]+)"/)?.[1];
  assert.ok(themeActionId, "appearance action must be present in the production build");
  async function changeTheme(cookie: Record<string, string>, theme: string) {
    const form = new FormData();
    form.set(`$ACTION_ID_${themeActionId}`, "");
    form.set("theme", theme);
    return fetch(`${base}/settings`, { method: "POST", headers: { ...cookie, Origin: base }, body: form, redirect: "manual" });
  }
  const themeSaved = await changeTheme(ownerSession, "tactile-correspondence");
  assert.equal(themeSaved.status, 303);
  assert.equal(themeSaved.headers.get("location"), "/settings?appearance=saved");
  for (const route of [`/issues/${issue.date}`, "/archive", "/settings"]) {
    assert.ok((await (await fetch(`${base}${route}`, { headers: ownerSession })).text()).includes('data-reader-theme="tactile-correspondence"'));
  }
  assert.ok((await (await fetch(`${base}/settings`, { headers: otherSession })).text()).includes('data-reader-theme="quiet-book"'));
  assert.equal((await changeTheme(ownerSession, "original")).headers.get("location"), "/settings?error=theme");
  assert.equal((await changeTheme({}, "quiet-book")).status, 303);
  assert.ok((await (await fetch(`${base}/settings`, { headers: ownerSession })).text()).includes('data-reader-theme="tactile-correspondence"'));
  await changeTheme(ownerSession, "quiet-book");
  const actionId = Object.entries(actionManifest.node).find(([, action]) => (action as {exportedName?: string}).exportedName === "changeArticleFeedback")?.[0];
  assert.ok(actionId, "feedback action must be present in the production build");
  async function feedbackAction(cookie: Record<string, string>, patch: unknown) {
    const response = await fetch(`${base}/saved`, { method: "POST", headers: { ...cookie, "Next-Action": actionId!, Origin: base, "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify([patch]), redirect: "manual" });
    return { status: response.status, body: await response.text() };
  }
  const articleUrl = issue.sections[0].items[0].url;
  let action = await feedbackAction(ownerSession, { url: articleUrl, saved: true });
  assert.equal(action.status, 200);
  assert.ok(action.body.includes('"saved":true'));
  const savedPage = await fetch(`${base}/saved`, { headers: ownerSession });
  assert.equal(savedPage.status, 200);
  assert.match(savedPage.headers.get("cache-control") || "", /private/);
  assert.ok((await savedPage.text()).includes(articleUrl.replaceAll("&", "&amp;")));
  assert.ok(!(await (await fetch(`${base}/saved`, { headers: otherSession })).text()).includes(articleUrl));
  assert.equal((await fetch(`${base}/saved`, { redirect: "manual" })).status, 307);
  assert.ok((await feedbackAction(otherSession, { url: articleUrl, note: "Intrusion" })).body.includes("could not be saved"));
  assert.ok((await feedbackAction({}, { url: articleUrl, note: "Anonymous" })).body.includes("session has ended"));
  assert.ok((await feedbackAction(ownerSession, { url: articleUrl, note: "x".repeat(2001) })).body.includes("2,000"));
  action = await feedbackAction(ownerSession, { url: articleUrl, reaction: "more", note: "HTTP private editorial note" });
  assert.equal(action.status, 200);
  assert.ok(action.body.includes('"saved":true'));
  assert.ok((await (await fetch(`${base}/settings`, { headers: ownerSession })).text()).includes("HTTP private editorial note"));
  assert.ok(!(await (await fetch(`${base}/settings`, { headers: otherSession })).text()).includes("HTTP private editorial note"));
  const editorialBrief = await client.callTool({ name: "get_editorial_brief", arguments: {} });
  assert.ok(JSON.stringify(editorialBrief.structuredContent).includes("HTTP private editorial note"));
  const savedConstitution = "# Editorial constitution\n\nFirst constitution paragraph.\n\nPreserve this second paragraph. <script>unsafe()</script>";
  const editableConstitution = (await client.callTool({ name: "get_editorial_constitution", arguments: {} })).structuredContent as { markdown: string; revision: string };
  assert.ok(!editableConstitution.markdown.includes("HTTP private editorial note"));
  await client.callTool({ name: "update_editorial_constitution", arguments: { revision: editableConstitution.revision, edits: [{ oldText: editableConstitution.markdown, newText: savedConstitution }] } });
  const activeBriefResponse = await client.callTool({ name: "get_editorial_brief", arguments: {} });
  const activeBrief = activeBriefResponse.structuredContent as { constitution: string; readingContext: { readingMinutes: number; editionMinutes: number } };
  const constitutionMarkup = await (await fetch(`${base}/settings`, { headers: ownerSession })).text();
  const constitutionDocument = constitutionMarkup.match(/<article[^>]*>([\s\S]*?)<\/article>/)?.[1];
  assert.ok(constitutionDocument, "Settings renders the active constitution as a reading document");
  const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
  assert.equal(activeBrief.constitution, savedConstitution);
  assert.equal(activeBrief.readingContext.readingMinutes, 60);
  assert.equal(activeBrief.readingContext.editionMinutes, 120);
  assert.ok(constitutionDocument.includes("First constitution paragraph"));
  assert.ok(constitutionDocument.includes("Preserve this second paragraph"));
  assert.ok(!constitutionDocument.includes("<script>unsafe()"));
  const briefPreview = await (await fetch(`${base}/settings/brief`, { headers: ownerSession })).text();
  assert.ok(briefPreview.includes("First constitution paragraph"));
  assert.ok(briefPreview.includes("HTTP private editorial note"));
  assert.ok(briefPreview.includes("For each edition, first call get_editorial_brief"));
  assert.equal((await fetch(`${base}/settings/brief`, { redirect: "manual" })).status, 307);
  const otherConstitution = await (await fetch(`${base}/settings`, { headers: otherSession })).text();
  assert.ok(!otherConstitution.includes("First constitution paragraph"));
  assert.ok(otherConstitution.includes("More useful ideas"));
  assert.ok(otherConstitution.includes("Make a finite personal edition"));
  assert.ok((await (await fetch(`${base}/settings`, { headers: ownerSession })).text()).includes(escapeHtml(savedConstitution)));
  action = await feedbackAction(ownerSession, { url: articleUrl, reaction: null, note: "" });
  assert.ok(action.body.includes('"saved":true'));
  const afterClear = await client.callTool({ name: "get_editorial_brief", arguments: {} });
  assert.ok(!Object.hasOwn(afterClear.structuredContent ?? {}, "articleFeedback"));
  const clearedSettings = await (await fetch(`${base}/settings`, { headers: ownerSession })).text();
  assert.ok(!clearedSettings.includes("HTTP private editorial note"));
  assert.ok(clearedSettings.includes(escapeHtml(savedConstitution)));
  const constitutionForm = clearedSettings.match(/<form\b[^>]*>[\s\S]*?<\/form>/g)?.find(value => value.includes('name="constitutionMarkdown"'));
  const constitutionActionId = constitutionForm?.match(/name="\$ACTION_ID_([^"]+)"/)?.[1];
  assert.ok(constitutionActionId, "Settings exposes an editable constitution form");
  const browserConstitution = "# Editorial constitution\n\nA change made on the website.";
  const constitutionBody = new FormData();
  constitutionBody.set(`$ACTION_ID_${constitutionActionId}`, "");
  const browserRevision = constitutionForm?.match(/name="revision" value="([^"]+)"/)?.[1];
  assert.ok(browserRevision);
  constitutionBody.set("revision", browserRevision);
  constitutionBody.set("constitutionMarkdown", browserConstitution);
  const browserSaved = await fetch(`${base}/settings`, { method: "POST", headers: { ...ownerSession, Origin: base }, body: constitutionBody, redirect: "manual" });
  assert.equal(browserSaved.headers.get("location"), "/settings?constitution=saved");
  const browserBrief = await client.callTool({ name: "get_editorial_brief", arguments: {} });
  assert.equal((browserBrief.structuredContent as { constitution: string }).constitution, browserConstitution);
  constitutionBody.set("constitutionMarkdown", "A stale browser tab must not replace the latest edit.");
  const staleBrowser = await fetch(`${base}/settings`, { method: "POST", headers: { ...ownerSession, Origin: base }, body: constitutionBody, redirect: "manual" });
  assert.equal(staleBrowser.headers.get("location"), "/settings?error=constitution-conflict");
  const afterStaleBrowser = await client.callTool({ name: "get_editorial_constitution", arguments: {} });
  assert.equal((afterStaleBrowser.structuredContent as { markdown: string }).markdown, browserConstitution);
  await feedbackAction(ownerSession, { url: articleUrl, saved: false });
  assert.ok(!(await (await fetch(`${base}/saved`, { headers: ownerSession })).text()).includes(articleUrl));

  // Exercise the social opt-in and sharing loop through real server actions.
  const thirdSession = await session("social-unrelated-reader");
  function exportedAction(name: string) {
    const id = Object.entries(actionManifest.node).find(([, action]) => (action as {exportedName?: string}).exportedName === name)?.[0];
    assert.ok(id, `${name} is present in the compiled action manifest`);
    return id;
  }
  async function socialForm(name: string, cookie: Record<string, string>, fields: Record<string, string>) {
    const form = new FormData();
    form.set(`$ACTION_ID_${exportedAction(name)}`, "");
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    return fetch(`${base}/friends`, { method: "POST", headers: { ...cookie, Origin: base }, body: form, redirect: "manual" });
  }
  assert.equal((await fetch(`${base}/friends`, {redirect:"manual"})).status, 307);
  for (const [cookie, username] of [[ownerSession, "http_sender"], [otherSession, "http_recipient"], [thirdSession, "http_outsider"]] as const) {
    const saved = await socialForm("updateSocialProfile", cookie, {username, enabled:"on"});
    assert.equal(saved.status, 303);
    assert.ok(!saved.headers.get("location")?.includes("error="));
  }
  await socialForm("sendFriendRequest", ownerSession, {username:"http_recipient"});
  const incoming = await (await fetch(`${base}/friends`, {headers:otherSession})).text();
  const requestId = incoming.match(/name="id" value="([^"]+)"/)?.[1];
  assert.ok(requestId, "Recipient sees the pending request");
  const unauthorizedAccept = await socialForm("respondToRequest", thirdSession, {id:requestId,decision:"accept"});
  assert.ok(unauthorizedAccept.headers.get("location")?.includes("error="));
  const accepted = await socialForm("respondToRequest", otherSession, {id:requestId,decision:"accept"});
  assert.ok(!accepted.headers.get("location")?.includes("error="));
  const socialShareId = exportedAction("sendArticleToFriend");
  async function share(cookie: Record<string,string>, username: string) {
    const response = await fetch(`${base}/friends`, {method:"POST",headers:{...cookie, "Next-Action":socialShareId,Origin:base,"Content-Type":"text/plain;charset=UTF-8"},body:JSON.stringify([{username,url:articleUrl,title:"Untrusted client title",note:"A deliberate HTTP recommendation"}]),redirect:"manual"});
    return response.text();
  }
  assert.ok((await share(ownerSession,"http_recipient")).includes('"sent":true'));
  assert.ok(!(await share(thirdSession,"http_recipient")).includes('"sent":true'));
  assert.ok(!(await share({},"http_recipient")).includes('"sent":true'));
  const inbox = await (await fetch(`${base}/friends/http_sender`, {headers:otherSession})).text();
  assert.ok(inbox.includes("A deliberate HTTP recommendation"));
  assert.ok(inbox.includes("http_sender"));
  assert.ok(!inbox.includes("Untrusted client title"));
  assert.ok(!(await (await fetch(`${base}/friends`, {headers:thirdSession})).text()).includes("A deliberate HTTP recommendation"));
  assert.equal((await fetch(`${base}/issues/${issue.date}`, {headers:otherSession})).status,404);
  await socialForm("endFriendship", otherSession, {username:"http_sender"});
  assert.ok(!(await share(ownerSession,"http_recipient")).includes('"sent":true'));
  assert.equal((await fetch(`${base}/friends/http_sender`, {headers:otherSession})).status, 404);

  assert.equal((await fetch(`${base}/issues/${issue.date}`, { headers: { Cookie: "__session=tampered" }, redirect: "manual" })).status, 307);
  for (const [date, payload, expected] of [
    ["2031-01-16", { ...issue, date: "2031-01-16" }, 201],
    [issue.date, { ...issue, title: "Explicit replacement" }, 200],
    ["2031-01-17", issue, 409],
    ["2026-02-31", { ...issue, date: "2026-02-31" }, 422],
    [issue.date, { ...issue, availableMinutes: 1441 }, 422],
  ] as const) {
    const response = await fetch(`${base}/api/issues/${date}`, { method: "PUT", headers, body: JSON.stringify(payload) });
    assert.equal(response.status, expected);
  }
  assert.equal((await fetch(`${base}/api/issues/${issue.date}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(issue) })).status, 401);
});
