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
  date: "2031-01-15",
  title: "Cerulean Crest",
  editorNote: "A focused edition.",
  coverageGap: null,
  availableMinutes: 12,
  expectedMinutes: 6,
  sections: [{
    title: "Read First",
    items: [{
      title: "A useful piece",
      author: "Author",
      publication: "Publication",
      publishedAt: "15 January 2031",
      readingMinutes: 12,
      type: "Essay",
      url: "https://example.com/piece",
      summary: "Why this earned a place in the edition.",
    }],
  }],
};

async function connectedClient(createEdition: (input: IssueInput) => Promise<{ issueId: number; created: boolean }>, scopes = ["editions:read", "editions:write"]) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createCeruleanMcpServer({ baseUrl: "https://cerulean.example", scopes, subject: "mcp-test-owner", createEdition });
  const client = new Client({ name: "cerulean-test", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, server };
}

test("advertises the editorial brief and idempotent create tools with accurate hints", async (context) => {
  const { client, server } = await connectedClient(async () => ({ issueId: 1, created: true }));
  context.after(async () => {
    await client.close();
    await server.close();
  });

  const result = await client.listTools();
  const brief = result.tools.find((tool) => tool.name === "get_editorial_brief");
  const create = result.tools.find((tool) => tool.name === "create_daily_edition");

  assert.equal(brief?.annotations?.readOnlyHint, true);
  assert.equal(create?.annotations?.readOnlyHint, false);
  assert.equal(create?.annotations?.destructiveHint, false);
  assert.equal(create?.annotations?.openWorldHint, false);
});

test("creates a complete edition and returns its canonical URL", async (context) => {
  let received: IssueInput | undefined;
  const { client, server } = await connectedClient(async (input) => {
    received = input;
    return { issueId: 42, created: true };
  });
  context.after(async () => {
    await client.close();
    await server.close();
  });

  const result = await client.callTool({ name: "create_daily_edition", arguments: issue });

  assert.deepEqual(received, issue);
  assert.deepEqual(result.structuredContent, {
    created: true,
    date: issue.date,
    status: "created",
    url: "https://cerulean.example/issues/2031-01-15",
  });
});

test("rejects an invalid edition before calling storage", async (context) => {
  let calls = 0;
  const { client, server } = await connectedClient(async () => {
    calls += 1;
    return { issueId: 1, created: true };
  });
  context.after(async () => {
    await client.close();
    await server.close();
  });

  const invalid = structuredClone(issue);
  invalid.availableMinutes = 100;
  const result = await client.callTool({ name: "create_daily_edition", arguments: invalid });

  assert.equal(result.isError, true);
  assert.equal(calls, 0);
});

test("read-only authorization cannot publish, and the brief specifies date and timezone", async (context) => {
  let writes = 0;
  const { client, server } = await connectedClient(async () => { writes++; return { issueId: 1, created: true }; }, ["editions:read"]);
  context.after(async () => { await client.close(); await server.close(); });
  const result = await client.callTool({ name: "create_daily_edition", arguments: issue });
  assert.equal(result.isError, true);
  assert.equal(writes, 0);
  const brief = await client.callTool({ name: "get_editorial_brief", arguments: {} });
  const parsed = JSON.parse(String((brief.structuredContent as Record<string, unknown>)?.brief));
  assert.match(parsed.localDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(typeof parsed.timeZone, "string");
});

test("MCP editorial brief reads only the authenticated reader's preferences", async (context) => {
  const { saveSettings } = await import("../lib/db.ts");
  await saveSettings("mcp-test-owner", { readingMinutes: 15, editionMinutes: 35, guidelines: "Find original astronomy work", interests: ["Science & nature"], timeZone: "Pacific/Auckland" });
  await saveSettings("another-reader", { readingMinutes: 90, editionMinutes: 180, guidelines: "Private interests", timeZone: "UTC" });
  const { client, server } = await connectedClient(async () => ({ issueId: 1, created: true }));
  context.after(async () => { await client.close(); await server.close(); });
  const result = await client.callTool({ name: "get_editorial_brief", arguments: {} });
  const brief = JSON.parse(String((result.structuredContent as Record<string, unknown>).brief));
  assert.equal(brief.defaults.expectedMinutes, 15);
  assert.equal(brief.defaults.availableMinutes, 35);
  assert.equal(brief.editorialGuidelines, "Find original astronomy work");
  assert.deepEqual(brief.interests, ["Science & nature"]);
  assert.equal(brief.timeZone, "Pacific/Auckland");
});

test("MCP create and recent-history tools isolate two authenticated readers on the same date", async (context) => {
  async function reader(subject: string) {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createCeruleanMcpServer({ baseUrl: "https://cerulean.example", scopes: ["editions:read", "editions:write"], subject });
    const client = new Client({ name: "isolation-test", version: "1" });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    context.after(async () => { await client.close(); await server.close(); });
    return client;
  }
  const [alice, bob] = await Promise.all([reader("alice"), reader("bob")]);
  const aliceIssue = { ...issue, editorNote: "Alice's private note" };
  const bobIssue = structuredClone(issue);
  bobIssue.sections[0].items[0].url = "https://example.com/bob-private";
  for (const [client, input] of [[alice, aliceIssue], [bob, bobIssue]] as const) {
    const result = await client.callTool({ name: "create_daily_edition", arguments: input });
    assert.equal((result.structuredContent as Record<string, unknown>).created, true);
  }
  const result = await alice.callTool({ name: "get_recent_editions", arguments: { limit: 7 } });
  const data = JSON.stringify(result.structuredContent);
  assert.ok(data.includes("https://example.com/piece"));
  assert.ok(!data.includes("bob-private"));
});

test("a short edition's item count fits its configured reading volume", async (context) => {
  const { saveSettings } = await import("../lib/db.ts");
  await saveSettings("mcp-test-owner", { readingMinutes: 5, editionMinutes: 5, guidelines: "", timeZone: "UTC" });
  const { client, server } = await connectedClient(async () => ({ issueId: 1, created: true }));
  context.after(async () => { await client.close(); await server.close(); });
  const result = await client.callTool({ name: "get_editorial_brief", arguments: {} });
  const brief = JSON.parse(String((result.structuredContent as Record<string, unknown>).brief));
  assert.equal(brief.defaults.availableMinutes, 5);
  assert.equal(brief.defaults.itemCount.minimum, 1);
  assert.ok(brief.defaults.itemCount.maximum <= brief.defaults.availableMinutes);
});


test("MCP preference writes preserve unrelated fields and isolate readers", async (context) => {
  const { saveSettings, getSettings } = await import("../lib/db.ts");
  await saveSettings("mcp-test-owner", { readingMinutes: 25, editionMinutes: 50, guidelines: "Original", interests: ["Technology"], timeZone: "UTC", onboardingStep: "connect", theme: "tactile-correspondence" });
  await saveSettings("unrelated-settings-reader", { readingMinutes: 60, editionMinutes: 120, guidelines: "Private", timeZone: "UTC" });
  const { client, server } = await connectedClient(async () => ({ issueId: 1, created: true }));
  context.after(async () => { await client.close(); await server.close(); });
  const result = await client.callTool({ name: "update_editorial_preferences", arguments: { guidelines: "More original research; avoid daily market news" } });
  assert.notEqual(result.isError, true);
  const stored = await getSettings("mcp-test-owner");
  assert.equal(stored.guidelines, "More original research; avoid daily market news");
  assert.equal(stored.readingMinutes, 25);
  assert.equal(stored.editionMinutes, 50);
  assert.deepEqual(stored.interests, ["Technology"]);
  assert.equal(stored.onboardingStep, "connect");
  assert.equal(stored.theme, "tactile-correspondence");
  assert.ok(!("theme" in (result.structuredContent as { preferences: object }).preferences));
  assert.equal((result.structuredContent as {settingsUrl: string}).settingsUrl, "https://cerulean.example/settings");
  assert.equal((await getSettings("unrelated-settings-reader")).guidelines, "Private");
  const brief = await client.callTool({ name: "get_editorial_brief", arguments: {} });
  assert.equal((brief.structuredContent as {preferences: {guidelines: string}}).preferences.guidelines, stored.guidelines);
  assert.ok(!JSON.stringify(brief).includes("tactile-correspondence"));
  for (const args of [{ theme: "quiet-book" }, {}, { readingMinutes: 0 }, { timeZone: "not-a-zone" }, { owner: "unrelated-settings-reader", guidelines: "Hijack" }, { onboardingStep: "interests" }]) {
    const invalid = await client.callTool({ name: "update_editorial_preferences", arguments: args });
    assert.equal(invalid.isError, true);
    assert.deepEqual(await getSettings("mcp-test-owner"), stored);
  }
});

test("MCP preference writes and feedback reads enforce scopes", async (context) => {
  const { getSettings } = await import("../lib/db.ts");
  const before = await getSettings("mcp-test-owner");
  const read = await connectedClient(async () => ({ issueId: 1, created: true }), ["editions:read"]);
  const write = await connectedClient(async () => ({ issueId: 1, created: true }), ["editions:write"]);
  context.after(async () => { for (const connection of [read, write]) { await connection.client.close(); await connection.server.close(); } });
  assert.equal((await read.client.callTool({ name: "update_editorial_preferences", arguments: { guidelines: "Forbidden" } })).isError, true);
  assert.deepEqual(await getSettings("mcp-test-owner"), before);
  assert.equal((await write.client.callTool({ name: "get_editorial_feedback", arguments: {} })).isError, true);
});

test("MCP feedback excludes bookmarks and other readers, and never rewrites explicit policy", async (context) => {
  const { createIssue, updateArticleFeedback, getSettings } = await import("../lib/db.ts");
  const feedbackIssue = structuredClone(issue);
  feedbackIssue.date = "2031-05-10";
  feedbackIssue.sections[0].items.push({ ...feedbackIssue.sections[0].items[0], title: "Bookmark only", url: "https://example.com/bookmark" });
  await createIssue("mcp-test-owner", feedbackIssue);
  await createIssue("feedback-other-reader", feedbackIssue);
  await updateArticleFeedback("mcp-test-owner", { url: issue.sections[0].items[0].url, reaction: "more", note: "Loved the depth, not the daily news angle." });
  await updateArticleFeedback("mcp-test-owner", { url: "https://example.com/bookmark", saved: true });
  await updateArticleFeedback("feedback-other-reader", { url: issue.sections[0].items[0].url, note: "Other account private note" });
  const before = await getSettings("mcp-test-owner");
  const { client, server } = await connectedClient(async () => ({ issueId: 1, created: true }));
  context.after(async () => { await client.close(); await server.close(); });
  const result = await client.callTool({ name: "get_editorial_feedback", arguments: {} });
  const data = result.structuredContent as { feedback: Array<{url: string; note: string}> };
  assert.equal(data.feedback.length, 1);
  assert.equal(data.feedback[0].note, "Loved the depth, not the daily news angle.");
  assert.ok(!JSON.stringify(data).includes("Other account private note"));
  assert.ok(!JSON.stringify(data).includes("Bookmark only"));
  assert.deepEqual(await getSettings("mcp-test-owner"), before);
  await updateArticleFeedback("mcp-test-owner", { url: issue.sections[0].items[0].url, reaction: null, note: "" });
  const cleared = await client.callTool({ name: "get_editorial_feedback", arguments: {} });
  assert.deepEqual((cleared.structuredContent as {feedback: unknown[]}).feedback, []);
});

test("friend nominations preserve provenance, isolate readers, and stop resurfacing after publication", async (context) => {
  const social = await import("../lib/social-store.ts");
  const { createIssue } = await import("../lib/db.ts");
  const sender = "nomination-sender", recipient = "mcp-test-owner";
  await social.saveSocialProfile(sender, { username: "nomination_sender", enabled: true });
  await social.saveSocialProfile(recipient, { username: "nomination_reader", enabled: true });
  await social.requestFriend(sender, "nomination_reader");
  const request = (await social.getSocialState(recipient)).incomingRequests[0];
  await social.respondFriendRequest(recipient, request.id, "accept");
  const source = structuredClone(issue);
  source.date = "2031-06-11";
  source.sections[0].items[0].url = "https://example.com/friend-nomination";
  await createIssue(sender, source);
  await social.shareArticle(sender, { username: "nomination_reader", url: source.sections[0].items[0].url, title: "A useful piece", note: "Interesting original evidence", recommend: true });
  const { client, server } = await connectedClient(async (input) => createIssue(recipient, input));
  context.after(async () => { await client.close(); await server.close(); });
  const result = await client.callTool({ name: "get_friend_recommendations", arguments: {} });
  const nominations = (result.structuredContent as { recommendations: Array<{ username: string; note: string; url: string }> }).recommendations;
  assert.equal(nominations.length, 1);
  assert.equal(nominations[0].username, "nomination_sender");
  assert.equal(nominations[0].note, "Interesting original evidence");
  assert.deepEqual(await social.listFriendRecommendations("unrelated-reader"), []);
  const write = await connectedClient(async () => ({ issueId: 1, created: true }), ["editions:write"]);
  context.after(async () => { await write.client.close(); await write.server.close(); });
  assert.equal((await write.client.callTool({ name: "get_friend_recommendations", arguments: {} })).isError, true);
  const published = await client.callTool({ name: "create_daily_edition", arguments: source });
  assert.equal((published.structuredContent as {created:boolean}).created, true);
  const after = await client.callTool({ name: "get_friend_recommendations", arguments: {} });
  assert.deepEqual((after.structuredContent as {recommendations:unknown[]}).recommendations, []);
});
