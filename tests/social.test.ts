import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "daybook-social-"));
process.env.DATABASE_PATH = path.join(directory, "test.sqlite");
delete process.env.DATABASE_URL;
delete process.env.VERCEL;
const db = await import("../lib/db.ts");
const social = await import("../lib/social-store.ts");
const { seedIssue } = await import("../lib/seed.ts");
test("friends are explicit, private, deduplicated, opt-out aware and edition nominations are reconciled", async () => {
  try {
    await db.createIssue("a", seedIssue);
    const article = seedIssue.sections[0].items[0];
    await social.saveSocialProfile("a", { username: "alice", enabled: true });
    await social.saveSocialProfile("b", { username: "bravo", enabled: true });
    await social.saveSocialProfile("c", { username: "charlie", enabled: true });
    await assert.rejects(
      social.saveSocialProfile("c", { username: "ALICE", enabled: true }),
      /taken/,
    );
    await assert.rejects(social.requestFriend("a", "alice"), /unavailable/);
    await assert.rejects(
      social.shareArticle("a", {
        username: "bravo",
        url: article.url,
        title: "Fake",
      }),
      /accepted/,
    );
    await social.requestFriend("a", "bravo");
    await assert.rejects(social.requestFriend("b", "alice"), /already/);
    const request = (await social.getSocialState("b")).incomingRequests[0];
    await assert.rejects(
      social.respondFriendRequest("c", request.id, "accept"),
      /not found/,
    );
    await assert.rejects(
      social.respondFriendRequest("a", request.id, "accept"),
      /not found/,
    );
    await social.respondFriendRequest("b", request.id, "accept");
    await assert.rejects(
      social.shareArticle("a", {
        username: "bravo",
        url: "https://example.com/unknown",
        title: "Fake",
      }),
      /not found/,
    );
    await social.shareArticle("a", {
      username: "bravo",
      url: article.url,
      title: "Fake",
      recommend: false,
      note: "Read this",
    });
    await social.shareArticle("a", {
      username: "bravo",
      url: article.url,
      title: "Fake",
      recommend: true,
    });
    let shares = (await social.getSocialState("b")).shares;
    assert.equal(shares.length, 1);
    assert.equal(shares[0].title, article.title);
    assert.equal(shares[0].recommend, true);
    assert.equal(shares[0].note, "Read this");
    assert.equal((await social.getSocialState("c")).shares.length, 0);
    await social.dismissShare("c", shares[0].id);
    assert.equal((await social.listFriendRecommendations("b")).length, 1);
    await social.saveSocialProfile("a", { username: "alice", enabled: false });
    assert.equal((await social.getSocialState("b")).shares.length, 0);
    await assert.rejects(
      social.shareArticle("a", {
        username: "bravo",
        url: article.url,
        title: article.title,
      }),
      /Enable/,
    );
    await social.saveSocialProfile("a", { username: "alice", enabled: true });
    await social.saveSocialProfile("b", { username: "bravo", enabled: false });
    await assert.rejects(
      social.shareArticle("a", {
        username: "bravo",
        url: article.url,
        title: article.title,
      }),
      /unavailable/,
    );
    assert.deepEqual(await social.listFriendRecommendations("b"), []);
    await social.saveSocialProfile("b", { username: "bravo", enabled: true });
    await db.createIssue("b", seedIssue);
    assert.equal((await social.listFriendRecommendations("b")).length, 0);
    shares = (await social.getSocialState("b")).shares;
    assert.equal(shares[0].includedDate, seedIssue.date);
    await social.dismissShare("b", shares[0].id);
    assert.equal((await social.getSocialState("b")).shares.length, 0);
    await social.shareArticle("a", {
      username: "bravo",
      url: article.url,
      title: article.title,
      recommend: true,
    });
    assert.equal(
      (await social.getSocialState("b")).shares.length,
      0,
      "Repeated shares never resurrect dismissal",
    );
    await social.removeFriend("a", "bravo");
    assert.equal((await social.getSocialState("b")).friends.length, 0);
    await assert.rejects(
      social.shareArticle("a", {
        username: "bravo",
        url: article.url,
        title: article.title,
      }),
      /accepted/,
    );
    await social.requestFriend("a", "bravo");
    const retry = (await social.getSocialState("b")).incomingRequests[0];
    await social.respondFriendRequest("b", retry.id, "decline");
    await social.requestFriend("b", "alice");
    assert.equal((await social.getSocialState("a")).incomingRequests.length, 1);
    const duplicates = await Promise.allSettled([
      social.saveSocialProfile("d", {
        username: "unique_reader",
        enabled: true,
      }),
      social.saveSocialProfile("e", {
        username: "unique_reader",
        enabled: true,
      }),
    ]);
    assert.equal(duplicates.filter((r) => r.status === "fulfilled").length, 1);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
