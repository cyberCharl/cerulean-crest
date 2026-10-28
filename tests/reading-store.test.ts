import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { IssueInput } from "../lib/schema.ts";

process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "filtered-reading-store-")), "test.db");
delete process.env.DATABASE_URL;
delete process.env.VERCEL;
const db = await import("../lib/db.ts");
const reading = await import("../lib/reading-store.ts");
const { readingTransaction } = await import("../lib/reading-connection.ts");

const urls = Array.from({ length: 6 }, (_, i) => `https://example.com/piece-${i}`);
function issue(date: string): IssueInput {
  return {
    date, title: "A small newspaper", editorNote: "A finite selection.", coverageGap: null,
    availableMinutes: 60, expectedMinutes: 58,
    sections: [{ title: "Reading", items: urls.map((url, i) => ({
      url, title: `Piece ${i}`, author: "Author", publication: "A publication",
      publishedAt: date, readingMinutes: [20, 4, 6, 8, 15, 5][i],
      type: "Essay", summary: "A reason to read this.",
    })) }],
  };
}

async function linksByUrl(owner: string) {
  return new Map((await reading.listReadingLinks(owner)).map(link => [link.url, link]));
}

async function recordStage(owner: string, date: string, stage: "front"|"inside") {
  const edition = await reading.getReadingEdition(owner,date);
  return reading.recordReadingStage(owner,date,stage,edition?.revision ?? "");
}

test("URL-only capture, optional title and duplicate capture preserve existing reader intent", async () => {
  const owner = "capture-reader";
  const first = await reading.captureReadingLink(owner, { url: `  ${urls[0]}  ` });
  assert.equal(first.created, true);
  assert.equal(first.link.url, urls[0]);
  assert.equal(first.link.title, "example.com");
  assert.equal(first.link.readingMinutes, null);
  assert.equal(first.link.metadataStatus, "pending");
  assert.equal(first.link.commitment, "candidate");
  const named = await reading.captureReadingLink(owner, { url: urls[1], title: "  My own title  " });
  assert.equal(named.link.title, "My own title");
  await reading.changeReadingLink(owner, { url: urls[0], commitment: "pinned", read: true });
  const duplicate = await reading.captureReadingLink(owner, { url: urls[0], title: "Overwrite?" });
  assert.equal(duplicate.created, false);
  assert.equal(duplicate.link.title, "example.com");
  assert.equal(duplicate.link.commitment, "pinned");
  assert.equal(duplicate.link.read, true);
  assert.equal((await reading.listReadingLinks(owner)).length, 2);
});

test("links, editions, exposure, mutations, browser imports and metadata claims are owner scoped", async () => {
  const owner = "private-reader";
  const other = "other-private-reader";
  await db.createIssue(owner, issue("2032-01-01"));
  assert.equal((await reading.listReadingLinks(owner)).length, 6);
  assert.deepEqual(await reading.listReadingLinks(other), []);
  assert.equal(await reading.getReadingEdition(other, "2032-01-01"), null);
  await assert.rejects(reading.changeReadingLink(other, { url: urls[0], read: true }), /not found/);
  await assert.rejects(recordStage(other, "2032-01-01", "front"));
  await reading.importReadingMarks(other, [urls[0]]);
  assert.equal((await linksByUrl(owner)).get(urls[0])?.read, false);
  await reading.captureReadingLink(other, { url: urls[0], title: "Another reader's title" });
  await reading.changeReadingLink(other, { url: urls[0], commitment: "pinned" });
  assert.equal((await linksByUrl(owner)).get(urls[0])?.commitment, "candidate");
  const job = await reading.claimReadingMetadata(other);
  assert.ok(job);
  await reading.finishReadingMetadata(owner, job.url, job.token, { title: "Wrong reader", publication: "Wrong", readingMinutes: 3 });
  assert.equal((await linksByUrl(other)).get(urls[0])?.metadataStatus, "fetching");
  assert.equal((await linksByUrl(owner)).get(urls[0])?.title, "Piece 0");
  await assert.rejects(reading.listReadingLinks(""), /authenticated owner/);
});

test("selection alone does not expose articles; front and inside exposure are independent and idempotent", async () => {
  const owner = "exposure-reader";
  const date = "2032-02-01";
  await db.createIssue(owner, issue(date));
  const selected = await reading.getReadingEdition(owner, date);
  assert.ok(selected);
  assert.deepEqual(selected.front.map(link => link.url), urls.slice(0, 4));
  assert.deepEqual(selected.inside.map(link => link.url), urls.slice(4));
  assert.equal(selected.insidePresented, false);
  assert.ok((await reading.listReadingLinks(owner)).every(link => link.lastPresentedAt === null));
  await recordStage(owner, date, "front");
  const afterFront = await linksByUrl(owner);
  for (const url of urls.slice(0, 4)) assert.ok(afterFront.get(url)?.lastPresentedAt);
  for (const url of urls.slice(4)) assert.equal(afterFront.get(url)?.lastPresentedAt, null);
  await recordStage(owner, date, "front");
  assert.equal((await linksByUrl(owner)).get(urls[0])?.lastPresentedAt, afterFront.get(urls[0])?.lastPresentedAt);
  assert.equal((await reading.getReadingEdition(owner, date))?.insidePresented, false);
  await recordStage(owner, date, "inside");
  assert.equal((await reading.getReadingEdition(owner, date))?.insidePresented, true);
  assert.ok((await reading.listReadingLinks(owner)).every(link => link.lastPresentedAt !== null));
});

test("a new issue lazily retires old presentation, keeps unseen inside links eligible and preserves pinned/read intent", async () => {
  const owner = "retirement-reader";
  const firstDate = "2032-03-01";
  await db.createIssue(owner, issue(firstDate));
  await recordStage(owner, firstDate, "front");
  await reading.changeReadingLink(owner, { url: urls[1], commitment: "pinned" });
  await reading.changeReadingLink(owner, { url: urls[2], read: true });
  await reading.changeReadingLink(owner, { url: urls[3], commitment: "later" });
  await db.createIssue(owner, issue("2032-03-02"));
  const links = await linksByUrl(owner);
  assert.equal(links.get(urls[0])?.dormant, true, "exposed ordinary candidates become dormant");
  assert.equal(links.get(urls[1])?.commitment, "pinned");
  assert.equal(links.get(urls[1])?.dormant, false);
  assert.equal(links.get(urls[2])?.read, true);
  assert.equal(links.get(urls[2])?.dormant, false);
  assert.equal(links.get(urls[3])?.commitment, "later");
  assert.equal(links.get(urls[3])?.eligibleAfter, 3);
  for (const url of urls.slice(4)) {
    assert.equal(links.get(url)?.dormant, false, "unseen inside articles were never presented");
    assert.equal(links.get(url)?.lastPresentedAt, null);
  }
  assert.equal(links.size, 6, "retirement keeps every URL");
  const retired = await reading.getReadingEdition(owner, firstDate);
  assert.equal(retired?.retired, true);
  assert.deepEqual(retired?.front, []);
  assert.deepEqual(retired?.inside, []);
  await assert.rejects(recordStage(owner, firstDate, "inside"), /retired/);
  const current = await reading.getReadingEdition(owner, "2032-03-02");
  const selected = [...current!.front, ...current!.inside].map(link => link.url);
  assert.ok(selected.includes(urls[1]), "pinned links may be selected again");
  assert.ok(selected.includes(urls[4]) && selected.includes(urls[5]));
  assert.ok(!selected.includes(urls[0]) && !selected.includes(urls[2]) && !selected.includes(urls[3]));
});

test("an unopened edition retires without making its selections dormant", async () => {
  const owner = "unopened-reader";
  await db.createIssue(owner, issue("2032-04-01"));
  await reading.getReadingEdition(owner, "2032-04-01");
  await db.createIssue(owner, issue("2032-04-02"));
  const links = await reading.listReadingLinks(owner);
  assert.equal(links.length, 6);
  assert.ok(links.every(link => !link.dormant && link.lastPresentedAt === null));
});

test("replacing an edition preserves exposure for removed links without exposing removed inside links", async () => {
  const owner = "replacement-reader";
  const date = "2032-04-10";
  await db.createIssue(owner, issue(date));
  await recordStage(owner, date, "front");
  const replacement = issue(date);
  replacement.sections[0].items = replacement.sections[0].items.filter(item => ![urls[0], urls[4]].includes(item.url));
  await db.replaceIssue(owner, replacement);
  const revised = await reading.getReadingEdition(owner, date);
  assert.ok(![...revised!.front, ...revised!.inside].some(link => [urls[0], urls[4]].includes(link.url)));
  await recordStage(owner, date, "inside");
  assert.equal((await linksByUrl(owner)).get(urls[4])?.lastPresentedAt, null);
  await db.createIssue(owner, issue("2032-04-11"));
  const links = await linksByUrl(owner);
  assert.equal(links.get(urls[0])?.dormant, true);
  assert.equal(links.get(urls[4])?.dormant, false);
});

test("maybe later skips the next edition and returns for the following edition", async () => {
  const owner = "later-reader";
  await db.createIssue(owner, issue("2032-05-01"));
  await recordStage(owner, "2032-05-01", "front");
  const deferred = await reading.changeReadingLink(owner, { url: urls[0], commitment: "later" });
  assert.equal(deferred.eligibleAfter, 3);
  let context = await reading.readingCurationContext(owner);
  assert.ok(context.excludedUrls.includes(urls[0]));
  await db.createIssue(owner, issue("2032-05-02"));
  const next = await reading.getReadingEdition(owner, "2032-05-02");
  assert.ok(![...next!.front, ...next!.inside].some(link => link.url === urls[0]));
  context = await reading.readingCurationContext(owner);
  assert.ok(context.candidates.some(link => link.url === urls[0]), "curation prepares the following edition");
  await db.createIssue(owner, issue("2032-05-03"));
  const following = await reading.getReadingEdition(owner, "2032-05-03");
  assert.ok([...following!.front, ...following!.inside].some(link => link.url === urls[0]));
});

test("dormant links remain searchable and can return to candidates or pinned", async () => {
  const owner = "recovery-reader";
  await reading.captureReadingLink(owner, { url: urls[0], title: "Worth finding again" });
  await reading.changeReadingLink(owner, { url: urls[0], dormant: true });
  assert.equal((await reading.listReadingLinks(owner))[0].title, "Worth finding again");
  assert.ok((await reading.readingCurationContext(owner)).excludedUrls.includes(urls[0]));
  const recovered = await reading.changeReadingLink(owner, { url: urls[0], dormant: false });
  assert.equal(recovered.dormant, false);
  assert.equal(recovered.commitment, "candidate");
  assert.ok((await reading.readingCurationContext(owner)).candidates.some(link => link.url === urls[0]));
  await reading.changeReadingLink(owner, { url: urls[0], dormant: true });
  const pinned = await reading.changeReadingLink(owner, { url: urls[0], commitment: "pinned" });
  assert.equal(pinned.dormant, false);
  assert.equal(pinned.commitment, "pinned");
});

test("browser legacy marks never overwrite an explicit unread choice and do not create foreign links", async () => {
  const owner = "browser-import-reader";
  await db.createIssue(owner, issue("2032-06-01"));
  await reading.changeReadingLink(owner, { url: urls[0], read: false });
  await reading.importReadingMarks(owner, [urls[0], urls[1], urls[1], "https://example.com/not-mine", "javascript:alert(1)"]);
  let links = await linksByUrl(owner);
  assert.equal(links.get(urls[0])?.read, false);
  assert.equal(links.get(urls[1])?.read, true);
  assert.equal(links.size, 6);
  await reading.changeReadingLink(owner, { url: urls[1], read: false });
  await reading.importReadingMarks(owner, [urls[0], urls[1]]);
  links = await linksByUrl(owner);
  assert.equal(links.get(urls[0])?.read, false);
  assert.equal(links.get(urls[1])?.read, false);
});

test("legacy saved bookmarks import as pinned once without undoing later choices", async () => {
  const owner = "bookmark-import-reader";
  await db.createIssue(owner, issue("2032-07-01"));
  await db.updateArticleFeedback(owner, { url: urls[0], saved: true });
  assert.equal((await linksByUrl(owner)).get(urls[0])?.commitment, "pinned");
  await reading.changeReadingLink(owner, { url: urls[0], dormant: true });
  const saved = (await linksByUrl(owner)).get(urls[0]);
  assert.equal(saved?.commitment, "candidate");
  assert.equal(saved?.dormant, true);
});

test("concurrent metadata claims are distinct and finishing preserves reader title and intent", async () => {
  const owner = "metadata-reader";
  await reading.captureReadingLink(owner, { url: urls[0], title: "My deliberately chosen title" });
  await reading.captureReadingLink(owner, { url: urls[1] });
  const jobs = await Promise.all([reading.claimReadingMetadata(owner), reading.claimReadingMetadata(owner), reading.claimReadingMetadata(owner)]);
  const claimed = jobs.filter(job => job !== null);
  assert.equal(claimed.length, 2);
  assert.equal(new Set(claimed.map(job => job.url)).size, 2);
  const overrideJob = claimed.find(job => job.url === urls[0])!;
  const autoJob = claimed.find(job => job.url === urls[1])!;
  await reading.changeReadingLink(owner, { url: urls[0], commitment: "pinned", read: true });
  await reading.changeReadingLink(owner, { url: urls[1], dormant: true });
  await reading.finishReadingMetadata(owner, overrideJob.url, "wrong-token", { title: "Wrong", publication: "Wrong", readingMinutes: 99 });
  assert.equal((await linksByUrl(owner)).get(urls[0])?.metadataStatus, "fetching");
  await reading.finishReadingMetadata(owner, overrideJob.url, overrideJob.token, { title: "Publisher title", publication: "Publisher", readingMinutes: 7 });
  await reading.finishReadingMetadata(owner, autoJob.url, autoJob.token, { title: "Discovered title", publication: "Publisher", readingMinutes: null });
  const links = await linksByUrl(owner);
  const override = links.get(urls[0])!;
  assert.equal(override.title, "My deliberately chosen title");
  assert.equal(override.commitment, "pinned");
  assert.equal(override.read, true);
  assert.equal(override.readingMinutes, 7);
  assert.equal(override.metadataStatus, "ready");
  const automatic = links.get(urls[1])!;
  assert.equal(automatic.title, "Discovered title");
  assert.equal(automatic.readingMinutes, null);
  assert.equal(automatic.dormant, true);
  await reading.finishReadingMetadata(owner, overrideJob.url, overrideJob.token, { title: "Late result", publication: "Wrong", readingMinutes: 99 });
  assert.equal((await linksByUrl(owner)).get(urls[0])?.readingMinutes, 7);
});

test("a stale metadata claim can be reclaimed but its old token cannot finish the new job", async () => {
  const owner = "metadata-reclaim-reader";
  await reading.captureReadingLink(owner, { url: urls[0] });
  const first = await reading.claimReadingMetadata(owner);
  assert.ok(first);
  await readingTransaction(owner, async (c, o) => {
    await c.query("UPDATE reading_links SET metadata_claimed_at=$1 WHERE owner_subject=$2 AND url=$3", ["2000-01-01T00:00:00.000Z", o, urls[0]]);
  });
  const second = await reading.claimReadingMetadata(owner);
  assert.ok(second);
  assert.notEqual(second.token, first.token);
  await reading.finishReadingMetadata(owner, urls[0], first.token, { title: "Stale result", publication: "Stale", readingMinutes: 90 });
  assert.equal((await linksByUrl(owner)).get(urls[0])?.metadataStatus, "fetching");
  await reading.finishReadingMetadata(owner, urls[0], second.token, { title: "Current result", publication: "Current", readingMinutes: 4 });
  assert.equal((await linksByUrl(owner)).get(urls[0])?.title, "Current result");
});

test("metadata failure is immediately unavailable and manual retry respects cooldown while preserving intent", async () => {
  const owner = "metadata-failure-reader";
  await reading.captureReadingLink(owner, { url: urls[0] });
  await reading.changeReadingLink(owner, { url: urls[0], commitment: "later" });
  const job = await reading.claimReadingMetadata(owner);
  assert.ok(job);
  assert.equal(await reading.retryReadingMetadata(owner, urls[0]), false, "do not replace an active job");
  await reading.finishReadingMetadata(owner, job.url, job.token, null);
  assert.equal(await reading.claimReadingMetadata(owner), null);
  const link = (await linksByUrl(owner)).get(urls[0])!;
  assert.equal(link.metadataStatus, "unavailable");
  assert.equal(link.url, urls[0]);
  assert.equal(link.commitment, "later");
  assert.equal(link.readingMinutes, null);
  assert.equal(await reading.retryReadingMetadata(owner, urls[0]), false, "manual retries wait for the cooldown");
  assert.equal((await linksByUrl(owner)).get(urls[0])?.metadataStatus, "unavailable");
  await readingTransaction(owner, async (c, o) => {
    await c.query("UPDATE reading_links SET metadata_retry_at=$1 WHERE owner_subject=$2 AND url=$3", ["2000-01-01T00:00:00.000Z", o, urls[0]]);
  });
  assert.equal(await reading.claimReadingMetadata(owner), null, "elapsed cooldown alone does not start a retry");
  assert.equal(await reading.retryReadingMetadata(owner, urls[0]), true);
  const retried = await reading.claimReadingMetadata(owner);
  assert.ok(retried);
  await reading.finishReadingMetadata(owner, retried.url, retried.token, { title: "Recovered title", publication: "Publisher", readingMinutes: 6 });
  const recovered = (await linksByUrl(owner)).get(urls[0])!;
  assert.equal(recovered.metadataStatus, "ready");
  assert.equal(recovered.commitment, "later");
  assert.equal(recovered.readingMinutes, 6);
});

test("the third abandoned metadata lease becomes unavailable and its old token cannot finish", async () => {
  const owner = "metadata-exhausted-reader";
  await reading.captureReadingLink(owner, { url: urls[0], title: "Keep my title" });
  await reading.changeReadingLink(owner, { url: urls[0], commitment: "pinned" });
  let lastJob: { url: string; token: string } | null = null;
  for (let claim = 0; claim < 3; claim++) {
    const job = await reading.claimReadingMetadata(owner);
    assert.ok(job);
    assert.notEqual(job.token, lastJob?.token);
    lastJob = job;
    await readingTransaction(owner, async (c, o) => {
      await c.query("UPDATE reading_links SET metadata_claimed_at=$1 WHERE owner_subject=$2 AND url=$3", ["2000-01-01T00:00:00.000Z", o, urls[0]]);
    });
  }
  assert.equal(await reading.claimReadingMetadata(owner), null);
  let link = (await linksByUrl(owner)).get(urls[0])!;
  assert.equal(link.metadataStatus, "unavailable");
  assert.equal(link.commitment, "pinned");
  await reading.finishReadingMetadata(owner, lastJob!.url, lastJob!.token, { title: "Expired result", publication: "Wrong", readingMinutes: 99 });
  link = (await linksByUrl(owner)).get(urls[0])!;
  assert.equal(link.metadataStatus, "unavailable");
  assert.equal(link.title, "Keep my title");
  assert.equal(link.readingMinutes, null);
});


test("a stale browser cannot expose replacement content it has never rendered", async () => {
  const owner="stale-paper-reader", date="2033-01-01";
  await db.createIssue(owner,issue(date));
  const old=await reading.getReadingEdition(owner,date);
  const replacement=issue(date);
  replacement.sections[0].items[4].url="https://example.com/replacement-inside";
  await db.replaceIssue(owner,replacement);
  await assert.rejects(reading.recordReadingStage(owner,date,"inside",old!.revision),/changed/);
  const current=await reading.getReadingEdition(owner,date);
  assert.notEqual(current?.revision,old?.revision);
  assert.ok((await reading.listReadingLinks(owner)).every(link=>link.lastPresentedAt===null));
  await reading.recordReadingStage(owner,date,"inside",current!.revision);
  assert.ok((await linksByUrl(owner)).get("https://example.com/replacement-inside")?.lastPresentedAt);
});

test("next-edition curation excludes exposed ordinary links before retiring the active paper", async () => {
  const owner="prospective-reader",date="2033-02-01";
  await db.createIssue(owner,issue(date));
  await recordStage(owner,date,"front");
  await reading.changeReadingLink(owner,{url:urls[1],commitment:"pinned"});
  const context=await reading.readingCurationContext(owner);
  assert.ok(context.excludedUrls.includes(urls[0]));
  assert.ok(context.candidates.some(link=>link.url===urls[1]));
  assert.ok(context.candidates.some(link=>link.url===urls[4]));
  assert.equal((await linksByUrl(owner)).get(urls[0])?.dormant,false,"prospective context does not retire the current paper");
});
