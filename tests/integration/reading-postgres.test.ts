import test from "node:test";
import assert from "node:assert/strict";
import {Client} from "pg";
import {migrate} from "../../lib/migrations.ts";
import {seedIssue} from "../../lib/seed.ts";
const connection=process.env.TEST_DATABASE_URL;

test("Postgres reading adoption, exposure, concurrent changes and metadata claims",{skip:!connection,timeout:90000},async()=>{
  assert.equal(process.env.TEST_DATABASE_ALLOW_WRITES,"true");
  process.env.DATABASE_URL=connection;
  await migrate(process.env.TEST_DATABASE_URL_UNPOOLED||connection!);
  const db=await import("../../lib/postgres-db.ts");
  const store=await import("../../lib/reading-store.ts");
  const owner=`reading-pg-${crypto.randomUUID()}`,other=`${owner}-other`;
  const url=new URL(connection!);if(url.hostname.endsWith(".neon.tech"))url.searchParams.set("sslmode","verify-full");
  const client=new Client({connectionString:url.toString()});await client.connect();
  try{
    await db.createIssue(owner,{...seedIssue,date:"2035-01-01"});
    const saved=seedIssue.sections[0].items[0].url;
    await db.updateArticleFeedback(owner,{url:saved,saved:true});
    const edition=await store.getReadingEdition(owner,"2035-01-01");assert.ok(edition);
    assert.equal((await store.listReadingLinks(owner)).find(link=>link.url===saved)?.commitment,"pinned");
    assert.deepEqual(await store.listReadingLinks(other),[]);
    await store.recordReadingStage(owner,"2035-01-01","front",edition.revision);
    await assert.rejects(store.recordReadingStage(owner,"2035-01-01","inside","stale-revision"),/changed/);
    const prospective=await store.readingCurationContext(owner);
    const ordinary=edition.front.find(link=>link.url!==saved)!;
    assert.ok(prospective.excludedUrls.includes(ordinary.url));
    assert.ok(prospective.candidates.some(link=>link.url===saved));
    assert.ok(prospective.candidates.some(link=>link.url===edition.inside[0].url));
    const target=edition.front[0].url;
    await Promise.all([store.changeReadingLink(owner,{url:target,commitment:"later",dormant:false}),store.changeReadingLink(owner,{url:target,read:true})]);
    const merged=(await store.listReadingLinks(owner)).find(link=>link.url===target)!;
    assert.equal(merged.commitment,"later");assert.equal(merged.read,true);assert.equal(merged.eligibleAfter,3);
    await db.createIssue(owner,{...seedIssue,date:"2035-01-02"});
    assert.equal((await store.getReadingEdition(owner,"2035-01-01"))?.retired,true);
    const links=await store.listReadingLinks(owner);
    const unseen=edition.inside[0].url;assert.equal(links.find(link=>link.url===unseen)?.dormant,false);
    for(const suffix of ["one","two"])await store.captureReadingLink(owner,{url:`https://example.invalid/${suffix}`,title:`My ${suffix}`});
    const [first,second]=await Promise.all([store.claimReadingMetadata(owner),store.claimReadingMetadata(owner)]);
    assert.ok(first&&second);assert.notEqual(first.url,second.url);
    await store.changeReadingLink(owner,{url:first.url,commitment:"pinned"});
    await store.finishReadingMetadata(owner,first.url,first.token,{title:"Source title",publication:"Source",readingMinutes:8});
    const completed=(await store.listReadingLinks(owner)).find(link=>link.url===first.url)!;
    assert.match(completed.title,/My /);assert.equal(completed.readingMinutes,8);assert.equal(completed.commitment,"pinned");
    await assert.rejects(store.changeReadingLink(other,{url:first.url,read:true}));
  }finally{
    for(const table of ["reading_selections","reading_editions","reading_legacy_bookmarks","reading_links","article_feedback","issues"])
      await client.query(`DELETE FROM ${table} WHERE owner_subject IN ($1,$2)`,[owner,other]);
    await client.end();
  }
});
