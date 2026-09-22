import test from "node:test";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { migrate } from "../../lib/migrations.ts";
import { seedIssue } from "../../lib/seed.ts";
const connection = process.env.TEST_DATABASE_URL;
test(
  "Postgres social concurrency, opt-out and friend nominations",
  { skip: !connection, timeout: 90000 },
  async () => {
    assert.equal(process.env.TEST_DATABASE_ALLOW_WRITES, "true");
    process.env.DATABASE_URL = connection;
    await migrate(process.env.TEST_DATABASE_URL_UNPOOLED || connection!);
    const sql = neon(connection!);
    const social = await import("../../lib/social-store.ts");
    const db = await import("../../lib/postgres-db.ts");
    const token = crypto.randomUUID().replaceAll("-", "").slice(0, 18);
    const a = `social-${token}-a`,
      b = `social-${token}-b`;
    const an = `a${token}`,
      bn = `b${token}`;
    try {
      await db.createIssue(a, seedIssue);
      const article = seedIssue.sections[0].items[0];
      await social.saveSocialProfile(a, { username: an, enabled: true });
      await social.saveSocialProfile(b, { username: bn, enabled: true });
      const results = await Promise.allSettled([
        social.requestFriend(a, bn),
        social.requestFriend(b, an),
      ]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      const incoming = (await social.getSocialState(a)).incomingRequests;
      const receiver = incoming.length ? a : b;
      const req = (await social.getSocialState(receiver)).incomingRequests[0];
      await social.respondFriendRequest(receiver, req.id, "accept");
      await assert.rejects(
        social.shareArticle(a, {
          username: bn,
          url: "https://example.com/absent",
          title: "Absent",
        }),
        /not found/,
      );
      await Promise.all(
        Array.from({ length: 3 }, () =>
          social.shareArticle(a, {
            username: bn,
            url: article.url,
            title: "Untrusted",
            recommend: true,
          }),
        ),
      );
      assert.equal((await social.getSocialState(b)).shares.length, 1);
      assert.equal(
        (await social.listFriendRecommendations(b))[0].title,
        article.title,
      );
      await social.saveSocialProfile(a, { username: an, enabled: false });
      assert.deepEqual(await social.listFriendRecommendations(b), []);
      await social.saveSocialProfile(a, { username: an, enabled: true });
      await db.createIssue(b, seedIssue);
      assert.deepEqual(await social.listFriendRecommendations(b), []);
      await social.removeFriend(b, an);
      assert.equal((await social.getSocialState(b)).shares.length, 0);
    } finally {
      await sql`DELETE FROM social_friendships WHERE member_a IN (${a},${b}) OR member_b IN (${a},${b})`;
      await sql`DELETE FROM social_profiles WHERE owner_subject IN (${a},${b})`;
      await sql`DELETE FROM issues WHERE owner_subject IN (${a},${b})`;
    }
  },
);
