import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
process.env.DATABASE_PATH = `${mkdtempSync(`${tmpdir()}/cerulean-mcp-`)}/test.db`;
delete process.env.DATABASE_URL;
import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createCeruleanMcpServer } from "../lib/mcp-server.ts";
import type { IssueInput } from "../lib/schema.ts";

const issue: IssueInput = {
  date: "2031-01-15", title: "Cerulean Crest", editorNote: "A focused edition.", coverageGap: null,
  availableMinutes: 20, expectedMinutes: 6,
  sections: [{ title: "Read First", items: [{ title: "A useful piece", author: "Author", publication: "Publication",
    publishedAt: "15 January 2031", readingMinutes: 12, type: "Essay", url: "https://example.com/piece",
    summary: "Why this earned a place in the edition." }] }],
};

async function connectedClient(subject = "mcp-test-owner", scopes = ["editions:read", "editions:write"], createEdition?: (input: IssueInput) => Promise<{ issueId: number; created: boolean }>) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createCeruleanMcpServer({ baseUrl: "https://cerulean.example", scopes, subject, createEdition });
  const client = new Client({ name: "cerulean-test", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, server };
}

test("concurrent constitution edits accept one writer and preserve unrelated settings", async (context) => {
  const { client, server } = await connectedClient("concurrent-policy");
  context.after(async () => { await client.close(); await server.close(); });
  const db = await import("../lib/db.ts");
  const expected = await db.getSettings("concurrent-policy");
  await db.patchSettings("concurrent-policy", { readingMinutes: 35 });
  const document = (await client.callTool({ name: "get_editorial_constitution", arguments: {} })).structuredContent as { markdown: string; revision: string };
  const results = await Promise.all(["First policy", "Second policy"].map(newText => client.callTool({
    name: "update_editorial_constitution", arguments: { revision: document.revision, edits: [{ oldText: document.markdown, newText }] },
  })));
  assert.equal(results.filter(result => !result.isError).length, 1);
  assert.equal(results.filter(result => result.isError).length, 1);
  assert.equal((await db.getSettings("concurrent-policy")).readingMinutes, 35);
  assert.equal(await db.compareAndSetConstitution("concurrent-policy", expected, "Stale replacement"), null);

  const legacy = await db.getSettings("legacy-policy");
  await db.patchSettings("legacy-policy", { guidelines: "New legacy preference" });
  assert.equal(await db.compareAndSetConstitution("legacy-policy", legacy, "Stale legacy replacement"), null);
});

test("MCP separates curation context from constitution reads and writes", async (context) => {
  const { client, server } = await connectedClient();
  context.after(async () => { await client.close(); await server.close(); });
  const tools = (await client.listTools()).tools;
  assert.deepEqual(tools.map((tool) => tool.name).sort(), ["create_daily_edition", "get_editorial_brief", "get_editorial_constitution", "update_editorial_constitution"]);
  assert.equal(tools.find((tool) => tool.name === "get_editorial_brief")?.annotations?.readOnlyHint, true);
  assert.equal(tools.find((tool) => tool.name === "get_editorial_constitution")?.annotations?.readOnlyHint, true);
  assert.equal(tools.find((tool) => tool.name === "create_daily_edition")?.annotations?.idempotentHint, true);
  assert.equal(tools.find((tool) => tool.name === "update_editorial_constitution")?.annotations?.destructiveHint, true);
});

test("brief combines the reader's document and current context without empty placeholders", async (context) => {
  const { saveSettings } = await import("../lib/db.ts");
  await saveSettings("brief-reader", { readingMinutes: 15, editionMinutes: 35, guidelines: "Legacy astronomy preference", interests: ["Science & nature"], timeZone: "Pacific/Auckland" });
  await saveSettings("private-reader", { readingMinutes: 90, editionMinutes: 180, guidelines: "Private interests", timeZone: "UTC" });
  const { client, server } = await connectedClient("brief-reader");
  context.after(async () => { await client.close(); await server.close(); });
  const result = await client.callTool({ name: "get_editorial_brief", arguments: {} });
  const brief = result.structuredContent as { brief: string; constitution: string; readingContext: { readingMinutes: number; editionMinutes: number; localDate: string; timeZone: string }; recentEditions: unknown[]; articleFeedback?: unknown[]; friendRecommendations?: unknown[] };
  assert.match(brief.constitution, /Legacy astronomy preference/);
  assert.match(brief.constitution, /Science & nature/);
  assert.equal(brief.readingContext.readingMinutes, 15);
  assert.equal(brief.readingContext.editionMinutes, 35);
  assert.equal(brief.readingContext.timeZone, "Pacific/Auckland");
  assert.match(brief.readingContext.localDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(brief.recentEditions, []);
  assert.ok(!("articleFeedback" in brief));
  assert.ok(!("friendRecommendations" in brief));
  assert.ok(!brief.brief.includes("No feedback"));
  assert.ok(!brief.brief.includes("Private interests"));
  assert.match(brief.brief, /Never save this complete response/);
  const document = (await client.callTool({ name: "get_editorial_constitution", arguments: {} })).structuredContent as { markdown: string; revision: string };
  const copiedBrief = await client.callTool({ name: "update_editorial_constitution", arguments: {
    revision: document.revision,
    edits: [{ oldText: document.markdown, newText: brief.brief }],
  } });
  assert.equal(copiedBrief.isError, true);
});

test("explicit constitution edits reach the next brief and preserve other settings", async (context) => {
  const { saveSettings, getSettings } = await import("../lib/db.ts");
  await saveSettings("editor-reader", { readingMinutes: 25, editionMinutes: 50, guidelines: "Old", timeZone: "UTC", theme: "tactile-correspondence", onboardingStep: "connect" });
  const { client, server } = await connectedClient("editor-reader");
  context.after(async () => { await client.close(); await server.close(); });
  const read = await client.callTool({ name: "get_editorial_constitution", arguments: {} });
  const current = read.structuredContent as { markdown: string; revision: string };
  assert.match(current.revision, /^[a-f0-9]{64}$/);
  const markdown = "# Editorial constitution\n\nOriginal research. Keep unrelated guidance.";
  const update = await client.callTool({ name: "update_editorial_constitution", arguments: { revision: current.revision, edits: [{ oldText: current.markdown, newText: markdown }] } });
  const result = update.structuredContent as { constitution: string; revision: string; settingsUrl: string };
  assert.equal(result.constitution, markdown);
  assert.match(result.revision, /^[a-f0-9]{64}$/);
  assert.equal(result.settingsUrl, "https://cerulean.example/settings");
  const saved = await getSettings("editor-reader");
  assert.equal(saved.constitutionMarkdown, markdown);
  assert.equal(saved.theme, "tactile-correspondence");
  assert.equal(saved.onboardingStep, "connect");
  assert.equal(saved.readingMinutes, 25);
  const brief = await client.callTool({ name: "get_editorial_brief", arguments: {} });
  assert.equal((brief.structuredContent as { constitution: string }).constitution, markdown);
  for (const arguments_ of [{ revision: "invalid", edits: [{ oldText: markdown, newText: "x" }] }, { revision: result.revision, edits: [] }]) {
    const invalid = await client.callTool({ name: "update_editorial_constitution", arguments: arguments_ });
    assert.equal(invalid.isError, true);
  }
  await client.callTool({ name: "update_editorial_constitution", arguments: { revision: result.revision, edits: [{ oldText: markdown, newText: "# Private reader hijack" }], owner: "private-reader" } });
  assert.equal((await getSettings("private-reader")).constitutionMarkdown, undefined);
  const stale = await client.callTool({ name: "update_editorial_constitution", arguments: { revision: current.revision, edits: [{ oldText: markdown, newText: "stale" }] } });
  assert.equal(stale.isError, true);
});

test("read and write scopes protect the brief, document and publication", async (context) => {
  const read = await connectedClient("scope-reader", ["editions:read"]);
  const write = await connectedClient("scope-reader", ["editions:write"]);
  context.after(async () => { for (const connection of [read, write]) { await connection.client.close(); await connection.server.close(); } });
  assert.equal((await read.client.callTool({ name: "update_editorial_constitution", arguments: { revision: "a".repeat(64), edits: [{ oldText: "old", newText: "new" }] } })).isError, true);
  assert.equal((await read.client.callTool({ name: "create_daily_edition", arguments: issue })).isError, true);
  assert.equal((await write.client.callTool({ name: "get_editorial_brief", arguments: {} })).isError, true);
  assert.equal((await write.client.callTool({ name: "get_editorial_constitution", arguments: {} })).isError, true);
});

test("final publication accepts discretionary duration but still validates shape", async (context) => {
  let calls = 0;
  const { client, server } = await connectedClient("publication-reader", ["editions:read", "editions:write"], async () => { calls++; return { issueId: 1, created: true }; });
  context.after(async () => { await client.close(); await server.close(); });
  const created = await client.callTool({ name: "create_daily_edition", arguments: issue });
  assert.equal((created.structuredContent as { status: string }).status, "created");
  assert.equal(calls, 1);
  const invalid = await client.callTool({ name: "create_daily_edition", arguments: { ...issue, date: "2031-02-31" } });
  assert.equal(invalid.isError, true);
  assert.equal(calls, 1);
});

test("brief includes only the reader's recent editions and explicit article feedback", async (context) => {
  const { createIssue, updateArticleFeedback } = await import("../lib/db.ts");
  await createIssue("history-reader", issue);
  await createIssue("other-history-reader", { ...issue, sections: [{ ...issue.sections[0], items: [{ ...issue.sections[0].items[0], url: "https://example.com/private" }] }] });
  await updateArticleFeedback("history-reader", { url: issue.sections[0].items[0].url, reaction: "more", note: "More depth" });
  const { client, server } = await connectedClient("history-reader");
  context.after(async () => { await client.close(); await server.close(); });
  const brief = (await client.callTool({ name: "get_editorial_brief", arguments: {} })).structuredContent as { brief: string; recentEditions: Array<{ items: Array<{ url: string }> }>; articleFeedback: Array<{ note: string }> };
  assert.equal(brief.recentEditions[0].items[0].url, issue.sections[0].items[0].url);
  assert.equal(brief.articleFeedback[0].note, "More depth");
  assert.ok(!brief.brief.includes("https://example.com/private"));
  const document = (await client.callTool({ name: "get_editorial_constitution", arguments: {} })).structuredContent as { markdown: string; revision: string };
  assert.ok(!document.markdown.includes("More depth"));
  const contaminated = await client.callTool({ name: "update_editorial_constitution", arguments: {
    revision: document.revision,
    edits: [{ oldText: document.markdown, newText: `${document.markdown}\n\nMore depth` }],
  } });
  assert.equal(contaminated.isError, true);
  const after = (await client.callTool({ name: "get_editorial_constitution", arguments: {} })).structuredContent as { markdown: string };
  assert.equal(after.markdown, document.markdown);
});

test("pending friend recommendations appear before research and disappear after inclusion", async (context) => {
  const social = await import("../lib/social-store.ts");
  const { createIssue } = await import("../lib/db.ts");
  const sender = "nomination-sender", recipient = "nomination-recipient";
  await social.saveSocialProfile(sender, { username: "nomination_sender", enabled: true });
  await social.saveSocialProfile(recipient, { username: "nomination_reader", enabled: true });
  await social.requestFriend(sender, "nomination_reader");
  const request = (await social.getSocialState(recipient)).incomingRequests[0];
  await social.respondFriendRequest(recipient, request.id, "accept");
  const nominated = { ...issue, date: "2031-06-11", sections: [{ ...issue.sections[0], items: [{ ...issue.sections[0].items[0], url: "https://example.com/friend-nomination" }] }] };
  await createIssue(sender, nominated);
  await social.shareArticle(sender, { username: "nomination_reader", url: nominated.sections[0].items[0].url, title: "A useful piece", note: "Original evidence" });
  const { client, server } = await connectedClient(recipient);
  context.after(async () => { await client.close(); await server.close(); });
  const first = (await client.callTool({ name: "get_editorial_brief", arguments: {} })).structuredContent as { friendRecommendations: Array<{ username: string; note: string }> };
  assert.equal(first.friendRecommendations[0].username, "nomination_sender");
  assert.equal(first.friendRecommendations[0].note, "Original evidence");
  await createIssue(recipient, nominated);
  const next = (await client.callTool({ name: "get_editorial_brief", arguments: {} })).structuredContent as { friendRecommendations?: unknown[]; brief: string };
  assert.ok(!("friendRecommendations" in next));
  assert.ok(!next.brief.includes("Friend recommendations"));
});
