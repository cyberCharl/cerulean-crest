import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "filtered-account-deletion-"));
process.env.DATABASE_PATH = path.join(directory, "test.sqlite");
delete process.env.DATABASE_URL;
delete process.env.VERCEL;
delete process.env.AUTH0_MANAGEMENT_DOMAIN;

const db = await import("../lib/db.ts");
const social = await import("../lib/social-store.ts");
const reading = await import("../lib/reading-store.ts");
const { readingTransaction } = await import("../lib/reading-connection.ts");
const { deleteAccount } = await import("../lib/account-deletion.ts");
const { deleteAuth0User } = await import("../lib/auth0-management.ts");
const { seedIssue } = await import("../lib/seed.ts");

const ownerTables = ["issues", "editorial_settings", "article_feedback", "reading_links", "reading_editions", "reading_selections", "reading_legacy_bookmarks", "social_profiles"];

async function rowsFor(owner: string) {
  return readingTransaction(owner, async (c, o) => {
    const counts: Record<string, number> = {};
    for (const table of ownerTables) counts[table] = Number((await c.query(`SELECT COUNT(*) AS n FROM ${table} WHERE owner_subject=$1`, [o]))[0].n);
    counts.social_friendships = Number((await c.query("SELECT COUNT(*) AS n FROM social_friendships WHERE member_a=$1 OR member_b=$1", [o]))[0].n);
    counts.social_shares = Number((await c.query("SELECT COUNT(*) AS n FROM social_shares WHERE sender=$1 OR recipient=$1", [o]))[0].n);
    counts.items = Number((await c.query("SELECT COUNT(*) AS n FROM items it JOIN sections s ON s.id=it.section_id JOIN issues i ON i.id=s.issue_id WHERE i.owner_subject=$1", [o]))[0].n);
    return counts;
  });
}

async function fillAccount(owner: string, username: string) {
  await db.createIssue(owner, seedIssue);
  await db.patchSettings(owner, { readingMinutes: 20 });
  const article = seedIssue.sections[0].items[0];
  await db.updateArticleFeedback(owner, { url: article.url, saved: true, reaction: "more", note: `${owner}'s private note` });
  await reading.syncReadingState(owner);
  await reading.captureReadingLink(owner, { url: `https://example.com/${owner}-saved` });
  await social.saveSocialProfile(owner, { username, enabled: true });
}

test("deleting an account removes all of that reader's records and leaves other readers intact", async () => {
  await fillAccount("reader-a", "alice");
  await fillAccount("reader-b", "bravo");
  await social.requestFriend("reader-a", "bravo");
  const request = (await social.getSocialState("reader-b")).incomingRequests[0];
  await social.respondFriendRequest("reader-b", request.id, "accept");
  const article = seedIssue.sections[0].items[1];
  await social.shareArticle("reader-a", { username: "bravo", url: article.url, title: article.title, note: "for you" });
  await social.shareArticle("reader-b", { username: "alice", url: article.url, title: article.title, note: "and you" });

  const before = await rowsFor("reader-a");
  for (const [table, count] of Object.entries(before)) {
    if (table !== "reading_selections") assert.ok(count > 0, `test data should include ${table}`);
  }
  const otherBefore = await rowsFor("reader-b");

  assert.deepEqual(await deleteAccount("reader-a"), { auth0: "not-configured" });

  const after = await rowsFor("reader-a");
  for (const [table, count] of Object.entries(after)) assert.equal(count, 0, `${table} should be empty for the deleted reader`);
  const other = await rowsFor("reader-b");
  assert.equal(other.issues, otherBefore.issues);
  assert.equal(other.items, otherBefore.items);
  assert.equal(other.article_feedback, otherBefore.article_feedback);
  assert.equal(other.reading_links, otherBefore.reading_links);
  assert.equal(other.social_profiles, 1);
  assert.equal(other.social_friendships, 0);
  assert.equal(other.social_shares, 0);
  assert.equal((await db.getSettings("reader-a")).readingMinutes, 30, "a deleted reader starts again from the defaults");
  assert.equal((await db.getSettings("reader-b")).readingMinutes, 20);
});

test("Auth0 deletion uses a client-credentials token and accepts an already-deleted user", async () => {
  const env = { AUTH0_MANAGEMENT_DOMAIN: "https://tenant.eu.auth0.com/", AUTH0_CLIENT_ID: "id", AUTH0_CLIENT_SECRET: "secret" };
  const calls: Array<{ url: string; method?: string; body?: string; auth?: string }> = [];
  const respond = (deleteStatus: number) => (async (url: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({ url: String(url), method: init?.method, body: init?.body as string | undefined, auth: headers.get("authorization") ?? undefined });
    if (String(url).endsWith("/oauth/token")) return Response.json({ access_token: "management-token" });
    return new Response(null, { status: deleteStatus });
  }) as typeof fetch;

  assert.equal(await deleteAuth0User("auth0|abc 123", env, respond(204)), "deleted");
  assert.equal(calls[0].url, "https://tenant.eu.auth0.com/oauth/token");
  assert.deepEqual(JSON.parse(calls[0].body!), { grant_type: "client_credentials", client_id: "id", client_secret: "secret", audience: "https://tenant.eu.auth0.com/api/v2/" });
  assert.equal(calls[1].url, "https://tenant.eu.auth0.com/api/v2/users/auth0%7Cabc%20123");
  assert.equal(calls[1].method, "DELETE");
  assert.equal(calls[1].auth, "Bearer management-token");

  assert.equal(await deleteAuth0User("auth0|gone", env, respond(404)), "deleted");
  await assert.rejects(deleteAuth0User("auth0|x", env, respond(403)), /403/);
  assert.equal(await deleteAuth0User("auth0|x", { AUTH0_CLIENT_ID: "id", AUTH0_CLIENT_SECRET: "secret" }, respond(204)), "not-configured");
});
