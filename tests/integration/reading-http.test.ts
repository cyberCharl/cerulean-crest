import assert from "node:assert/strict";
import test from "node:test";
import {spawn} from "node:child_process";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {createServer} from "node:net";
import {once} from "node:events";
import {hkdfSync} from "node:crypto";
import {EncryptJWT} from "jose";
import {setTimeout as delay} from "node:timers/promises";
import {seedIssue} from "../../lib/seed.ts";
import Database from "better-sqlite3";

test("signed-in reading flow preserves intent, enforces exposure and enriches URL-only captures",{timeout:90000},async context=>{
  const directory=await mkdtemp(`${tmpdir()}/filtered-reading-http-`);
  const socket=createServer().listen(0,"127.0.0.1");await once(socket,"listening");
  const port=(socket.address() as {port:number}).port;await new Promise<void>(resolve=>socket.close(()=>resolve()));
  const base=`http://127.0.0.1:${port}`;
  const server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-p",String(port)],{
    env:{...process.env,VERCEL:"",DATABASE_URL:"",DATABASE_URL_UNPOOLED:"",DATABASE_PATH:`${directory}/test.db`,SEED_DEMO:"false",
      AUTH0_DOMAIN:"test.example.com",AUTH0_CLIENT_ID:"reading-http",AUTH0_CLIENT_SECRET:"test-only",AUTH0_SECRET:"a".repeat(64),
      CERULEAN_APP_URL:base,CERULEAN_MARKETING_URL:base,APP_BASE_URL:base,CERULEAN_OWNER_SUBJECT:"reading-http-owner",
      CERULEAN_API_USER:"test",CERULEAN_API_PASSWORD:"test-only"},stdio:"ignore",
  });
  context.after(async()=>{if(server.exitCode===null){const exit=once(server,"exit");server.kill();await exit;}await rm(directory,{recursive:true,force:true});});
  for(let attempt=0;attempt<100;attempt++){try{if((await fetch(base)).ok)break;}catch{}await delay(100);}
  async function session(subject:string){
    const now=Math.floor(Date.now()/1000);
    const key=new Uint8Array(hkdfSync("sha256","a".repeat(64),"","JWE CEK",32));
    const token=await new EncryptJWT({user:{sub:subject},internal:{sid:subject,createdAt:now},tokenSet:{expiresAt:now+3600}})
      .setProtectedHeader({alg:"dir",enc:"A256GCM"}).setExpirationTime(now+3600).encrypt(key);
    return {Cookie:`__session=${token}`};
  }
  const owner=await session("reading-http-owner"),other=await session("reading-http-other");
  const manifest=JSON.parse(await readFile(".next/server/server-reference-manifest.json","utf8"));
  async function action(name:string,cookie:Record<string,string>,input:unknown){
    const id=Object.entries(manifest.node).find(([,entry])=>(entry as {exportedName?:string}).exportedName===name)?.[0];
    assert.ok(id,`${name} exists in production build`);
    return (await fetch(`${base}/links`,{method:"POST",headers:{...cookie,"Next-Action":id,Origin:base,"Content-Type":"text/plain;charset=UTF-8"},body:JSON.stringify([input])})).text();
  }
  async function links(cookie=owner){return (await (await fetch(`${base}/api/reading-links`,{headers:cookie})).json()).links as Array<{url:string;title:string;read:boolean;dormant:boolean;commitment:string;lastPresentedAt:string|null;metadataStatus:string;readingMinutes:number|null}>;}
  function editionRevision(date:string){
    const database=new Database(`${directory}/test.db`,{readonly:true});
    try {
      const row=database.prepare("SELECT source_revision FROM reading_editions WHERE owner_subject=? AND issue_date=?").get("reading-http-owner",date) as {source_revision:string}|undefined;
      assert.ok(row,"edition has been adopted before reading its revision");
      return row.source_revision;
    } finally {database.close();}
  }
  const basic={Authorization:`Basic ${Buffer.from("test:test-only").toString("base64")}`,"Content-Type":"application/json"};
  const issue={...seedIssue,date:"2034-01-01"};
  assert.equal((await fetch(`${base}/api/issues/${issue.date}`,{method:"PUT",headers:basic,body:JSON.stringify(issue)})).status,201);
  for(const path of ["/links","/latest?prototype=reading&variant=C",`/issues/${issue.date}`])assert.equal((await fetch(`${base}${path}`,{redirect:"manual"})).status,307);
  assert.equal((await fetch(`${base}/api/reading-links`)).status,401);
  assert.match(await action("addReadingLink",{}, {url:"https://example.invalid/private"}),/session has ended/);
  const page=await (await fetch(`${base}/issues/${issue.date}`,{headers:owner})).text();
  assert.match(page,/One to settle into/);assert.doesNotMatch(page,/edition-progress-track/);
  assert.ok((await links()).every(link=>link.lastPresentedAt===null),"SSR/prefetch must not record exposure");
  assert.deepEqual(await links(other),[]);
  const staleRevision=editionRevision(issue.date);
  const replacement={...issue,sections:issue.sections.map((section,index)=>index ? section : {...section,items:section.items.map((item,index)=>index ? item : {...item,title:`${item.title} (updated)`})})};
  assert.equal((await fetch(`${base}/api/issues/${issue.date}`,{method:"PUT",headers:basic,body:JSON.stringify(replacement)})).status,200);
  await links();
  const revision=editionRevision(issue.date);
  assert.notEqual(revision,staleRevision);
  for(const stage of ["front","inside"]){
    assert.match(await action("recordReadingStage",owner,{date:issue.date,stage,revision:staleRevision}),/could not be opened/);
  }
  assert.ok((await links()).every(link=>link.lastPresentedAt===null),"A stale browser cannot expose a replacement edition");
  assert.match(await action("recordReadingStage",owner,{date:issue.date,stage:"front"}),/could not be opened/);
  assert.match(await action("recordReadingStage",other,{date:issue.date,stage:"front",revision}),/could not be opened/);
  await action("recordReadingStage",owner,{date:issue.date,stage:"front",revision});
  const presented=(await links()).filter(link=>link.lastPresentedAt!==null);
  assert.equal(presented.length,4);assert.ok(presented.every(link=>!link.read));
  await action("changeReadingLink",owner,{url:presented[0].url,commitment:"later",dormant:false});
  await action("changeReadingLink",owner,{url:presented[1].url,commitment:"pinned",dormant:false});
  await action("changeReadingLink",owner,{url:presented[2].url,read:true});
  assert.match(await action("changeReadingLink",other,{url:presented[1].url,read:true}),/could not be saved/);
  const captured="http://127.0.0.1/private-reading-test";
  const result=await action("addReadingLink",owner,{url:captured});
  assert.match(result,/"created":true/);
  assert.equal((await links()).find(link=>link.url===captured)?.title,"127.0.0.1");
  assert.equal((await links()).find(link=>link.url===captured)?.readingMinutes,null);
  for(let attempt=0;attempt<20;attempt++){if((await links()).find(link=>link.url===captured)?.metadataStatus==="unavailable")break;await delay(100);}
  assert.equal((await links()).find(link=>link.url===captured)?.metadataStatus,"unavailable","Unsafe metadata fetch fails without losing URL");
  const custom="http://127.0.0.1/my-title";
  await action("addReadingLink",owner,{url:custom,title:"My optional title"});
  assert.equal((await links()).find(link=>link.url===custom)?.title,"My optional title");
  assert.match(await action("addReadingLink",owner,{url:custom,title:"Do not replace"}),/"created":false/);
  assert.equal((await links()).find(link=>link.url===custom)?.title,"My optional title");
  const privateLinks=await fetch(`${base}/links`,{headers:owner});
  assert.match(privateLinks.headers.get("cache-control")??"",/private/);
  const libraryHtml=await privateLinks.text();assert.match(libraryHtml,/optional/);assert.doesNotMatch(libraryHtml,/type="number"/);
  const next={...issue,date:"2034-01-02"};
  assert.equal((await fetch(`${base}/api/issues/${next.date}`,{method:"PUT",headers:basic,body:JSON.stringify(next)})).status,201);
  const retained=await links();
  assert.equal(retained.length,seedIssue.sections.flatMap(section=>section.items).length+2);
  assert.equal(retained.find(link=>link.url===presented[0].url)?.commitment,"later");
  assert.equal(retained.find(link=>link.url===presented[1].url)?.commitment,"pinned");
  assert.equal(retained.find(link=>link.url===presented[2].url)?.read,true);
  assert.equal(retained.find(link=>link.url===presented[3].url)?.dormant,true);
  assert.ok(retained.filter(link=>link.lastPresentedAt===null).every(link=>!link.dormant));
  assert.match(await (await fetch(`${base}/issues/${issue.date}`,{headers:owner})).text(),/This edition has retired/);
  assert.match(await action("recordReadingStage",owner,{date:issue.date,stage:"inside",revision}),/could not be opened/);
  assert.deepEqual(await links(other),[]);
});
