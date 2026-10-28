import { createHash, randomUUID } from "node:crypto";
import { isIssueDate } from "./date.ts";
import { readingTransaction as run } from "./reading-connection.ts";
import { captureLinkSchema, readingLinkUpdateSchema, readingUrlSchema, readingLinkFromRow, type ReadingConnection, type ReadingEdition } from "./reading.ts";

const now = () => new Date().toISOString();
const one = async (c: ReadingConnection, owner: string, url: string) => (await c.query("SELECT * FROM reading_links WHERE owner_subject=$1 AND url=$2", [owner,url]))[0];

/** Adopt links before retiring their presentation. Existing URLs never lose reader intent. */
async function synchronize(c: ReadingConnection, owner: string) {
  const issues = await c.query("SELECT CAST(issue_date AS TEXT) AS issue_date FROM issues WHERE owner_subject=$1 ORDER BY issue_date", [owner]);
  const allItems = await c.query(`SELECT CAST(i.issue_date AS TEXT) AS issue_date, it.url, it.title, it.publication, it.reading_minutes FROM issues i
    JOIN sections s ON s.issue_id=i.id JOIN items it ON it.section_id=s.id
    WHERE i.owner_subject=$1 ORDER BY i.issue_date,s.position,it.position`, [owner]);
  const known = await c.query("SELECT * FROM reading_editions WHERE owner_subject=$1 ORDER BY sequence", [owner]);
  let sequence = Math.max(0,...known.map(row => Number(row.sequence)));
  const latest = issues.at(-1)?.issue_date;
  const changed = new Set<string>();
  const stamp = now();
  const revisions: unknown[] = [];
  const editionValues: string[] = [];
  for (const issue of issues) {
    const date = String(issue.issue_date);
    const items = allItems.filter(item => item.issue_date === date);
    const revision = createHash("sha256").update(JSON.stringify(items)).digest("hex");
    const existing = known.find(row => row.issue_date === date);
    if (existing?.source_revision === revision) continue;
    changed.add(date);
    const offset = revisions.length;
    revisions.push(owner,date,existing?.sequence ?? ++sequence,revision);
    editionValues.push(`($${offset+1},$${offset+2},$${offset+3},$${offset+4})`);
  }
  if (editionValues.length) {
    // Adopt historical editions in a batch so a reader's first visit does not
    // perform a database round trip for every article or previous edition.
    await c.query(`INSERT INTO reading_links(owner_subject,url,title,publication,reading_minutes,metadata_status,created_at,updated_at)
      SELECT i.owner_subject,it.url,it.title,it.publication,it.reading_minutes,'ready',$1,$2
      FROM issues i JOIN sections s ON s.issue_id=i.id JOIN items it ON it.section_id=s.id
      WHERE i.owner_subject=$3 ON CONFLICT(owner_subject,url) DO NOTHING`,[stamp,stamp,owner]);
    await c.query(`INSERT INTO reading_editions(owner_subject,issue_date,sequence,source_revision) VALUES ${editionValues.join(",")}
      ON CONFLICT(owner_subject,issue_date) DO UPDATE SET source_revision=excluded.source_revision`,revisions);
  }
  // Legacy bookmarks are deliberate intent: import once as pinned; never override later changes.
  const saved = await c.query(`SELECT f.url FROM article_feedback f WHERE f.owner_subject=$1 AND f.saved=true
    AND NOT EXISTS(SELECT 1 FROM reading_legacy_bookmarks b WHERE b.owner_subject=f.owner_subject AND b.url=f.url)`, [owner]);
  if (saved.length) {
    await c.query(`INSERT INTO reading_links(owner_subject,url,title,publication,commitment,metadata_status,created_at,updated_at)
      SELECT f.owner_subject,f.url,f.title,f.publication,'pinned','unavailable',$1,$2 FROM article_feedback f
      WHERE f.owner_subject=$3 AND f.saved=true AND NOT EXISTS(SELECT 1 FROM reading_legacy_bookmarks b WHERE b.owner_subject=f.owner_subject AND b.url=f.url)
      ON CONFLICT(owner_subject,url) DO UPDATE SET commitment='pinned',dormant=0`,[stamp,stamp,owner]);
    await c.query(`INSERT INTO reading_legacy_bookmarks(owner_subject,url) SELECT owner_subject,url FROM article_feedback
      WHERE owner_subject=$1 AND saved=true ON CONFLICT(owner_subject,url) DO NOTHING`,[owner]);
  }
  const older = await c.query("SELECT issue_date FROM reading_editions WHERE owner_subject=$1 AND retired=0 AND issue_date<>$2", [owner,latest ?? ""]);
  if (older.length) {
    const exposed = `SELECT s.url FROM reading_selections s JOIN reading_editions e
      ON e.owner_subject=s.owner_subject AND e.issue_date=s.issue_date
      WHERE e.owner_subject=$2 AND e.retired=0 AND e.issue_date<>$3 AND s.presented_at IS NOT NULL`;
    await c.query(`UPDATE reading_links SET dormant=1,updated_at=$1 WHERE owner_subject=$2 AND commitment='candidate' AND is_read=0 AND url IN (${exposed})`,[stamp,owner,latest ?? ""]);
    await c.query(`UPDATE reading_links SET eligible_after=(SELECT MAX(e.sequence)+2 FROM reading_selections s JOIN reading_editions e
      ON e.owner_subject=s.owner_subject AND e.issue_date=s.issue_date WHERE e.owner_subject=$2 AND e.retired=0
      AND e.issue_date<>$3 AND s.presented_at IS NOT NULL AND s.url=reading_links.url),updated_at=$1
      WHERE owner_subject=$2 AND commitment='later' AND is_read=0 AND url IN (${exposed})`,[stamp,owner,latest ?? ""]);
    await c.query("UPDATE reading_editions SET retired=1 WHERE owner_subject=$1 AND issue_date<>$2 AND retired=0",[owner,latest ?? ""]);
  }
  if (latest && changed.has(String(latest))) {
    const current = (await c.query("SELECT sequence FROM reading_editions WHERE owner_subject=$1 AND issue_date=$2", [owner,latest]))[0];
    const links = (await c.query("SELECT * FROM reading_links WHERE owner_subject=$1", [owner])).map(readingLinkFromRow);
    const items = allItems.filter(item => item.issue_date === latest);
    const urls = [...new Set(items.map(item => String(item.url)))];
    const candidates = urls.flatMap(url => links.find(link => link.url === url) ?? [])
      .filter(link => !link.dormant && !link.read && link.eligibleAfter <= Number(current.sequence));
    const lead = candidates.find(link => (link.readingMinutes ?? 0) >= 12) ?? candidates[0];
    const shorts = candidates.filter(link => link.url !== lead?.url && link.readingMinutes !== null && link.readingMinutes < 12).slice(0,3);
    const front = [...(lead ? [lead.url] : []),...shorts.map(link => link.url)];
    // Keep exposure history for URLs removed by an edition replacement. Negative
    // positions are no longer selected, but still participate in retirement.
    await c.query("UPDATE reading_selections SET position=-1 WHERE owner_subject=$1 AND issue_date=$2", [owner,latest]);
    for (const [position,link] of candidates.entries()) {
      await c.query(`INSERT INTO reading_selections(owner_subject,issue_date,url,stage,position) VALUES($1,$2,$3,$4,$5)
        ON CONFLICT(owner_subject,issue_date,url) DO UPDATE SET stage=excluded.stage,position=excluded.position`,
        [owner,latest,link.url,front.includes(link.url) ? "front" : "inside",front.includes(link.url) ? front.indexOf(link.url) : position]);
    }
  }
  return sequence;
}

export const syncReadingState = (owner: string) => run(owner, synchronize);

export const listReadingLinks = (owner: string) => run(owner, async (c,o) => {
  await synchronize(c,o);
  return (await c.query("SELECT * FROM reading_links WHERE owner_subject=$1 ORDER BY updated_at DESC,url", [o])).map(readingLinkFromRow);
});

export const getReadingEdition = (owner: string, date: string): Promise<ReadingEdition|null> => {
  if (!isIssueDate(date)) return Promise.resolve(null);
  return run(owner, async (c,o) => {
    await synchronize(c,o);
    const edition = (await c.query("SELECT * FROM reading_editions WHERE owner_subject=$1 AND issue_date=$2", [o,date]))[0];
    if (!edition) return null;
    if (edition.retired) return { date,revision:String(edition.source_revision),front:[],inside:[],retired:true,insidePresented:false };
    const rows = await c.query(`SELECT l.*,s.stage,s.position,s.presented_at FROM reading_selections s JOIN reading_links l
      ON l.owner_subject=s.owner_subject AND l.url=s.url WHERE s.owner_subject=$1 AND s.issue_date=$2 AND s.position>=0 ORDER BY s.position`, [o,date]);
    return { date,revision:String(edition.source_revision),retired:false, front:rows.filter(row => row.stage === "front").map(readingLinkFromRow),
      inside:rows.filter(row => row.stage === "inside").map(readingLinkFromRow), insidePresented:rows.some(row => row.stage === "inside" && row.presented_at != null) };
  });
};

export const recordReadingStage = (owner: string, date: string, stage: "front"|"inside", revision: string) => {
  if (!isIssueDate(date) || !["front","inside"].includes(stage)) throw new Error("Invalid edition stage");
  return run(owner, async (c,o) => {
    await synchronize(c,o);
    const edition = (await c.query("SELECT retired,source_revision FROM reading_editions WHERE owner_subject=$1 AND issue_date=$2", [o,date]))[0];
    if (!edition || edition.retired) throw new Error("This edition has been retired. Open your latest paper.");
    if (edition.source_revision !== revision) throw new Error("This edition changed. Reload your paper before opening it.");
    const stamp = now();
    const rows = await c.query("SELECT url FROM reading_selections WHERE owner_subject=$1 AND issue_date=$2 AND stage=$3 AND position>=0 AND presented_at IS NULL", [o,date,stage]);
    await c.query("UPDATE reading_selections SET presented_at=$1 WHERE owner_subject=$2 AND issue_date=$3 AND stage=$4 AND position>=0 AND presented_at IS NULL", [stamp,o,date,stage]);
    for (const row of rows) await c.query("UPDATE reading_links SET last_presented_at=$1 WHERE owner_subject=$2 AND url=$3", [stamp,o,row.url]);
  });
};

export const captureReadingLink = (owner: string, input: unknown) => {
  const value = captureLinkSchema.parse(input);
  return run(owner, async (c,o) => {
    await synchronize(c,o);
    const existing = await one(c,o,value.url);
    if (existing) return { link:readingLinkFromRow(existing),created:false };
    const stamp = now();
    const hostname = new URL(value.url).hostname;
    await c.query(`INSERT INTO reading_links(owner_subject,url,title,publication,title_override,created_at,updated_at)
      VALUES($1,$2,$3,$4,$5,$6,$7)`, [o,value.url,value.title || hostname,hostname,Number(Boolean(value.title)),stamp,stamp]);
    return { link:readingLinkFromRow(await one(c,o,value.url)),created:true };
  });
};

export const changeReadingLink = (owner: string, input: unknown) => {
  const value = readingLinkUpdateSchema.parse(input);
  return run(owner, async (c,o) => {
    const sequence = await synchronize(c,o);
    if (!await one(c,o,value.url)) throw new Error("Link not found");
    const fields: Record<string,unknown> = { updated_at:now() };
    if (value.commitment !== undefined) { fields.commitment=value.commitment; fields.dormant=0; fields.eligible_after=value.commitment === "later" ? sequence+2 : 0; }
    if (value.dormant !== undefined) { fields.dormant=Number(value.dormant); if (value.dormant) fields.commitment="candidate"; else if (value.commitment === undefined) fields.eligible_after=0; }
    if (value.read !== undefined) { fields.is_read=Number(value.read); fields.read_updated_at=fields.updated_at; }
    const params = Object.values(fields);
    await c.query(`UPDATE reading_links SET ${Object.keys(fields).map((key,i)=>`${key}=$${i+1}`).join(",")} WHERE owner_subject=$${params.length+1} AND url=$${params.length+2}`, [...params,o,value.url]);
    return readingLinkFromRow(await one(c,o,value.url));
  });
};

export const importReadingMarks = (owner: string, urls: string[]) => run(owner, async (c,o) => {
  await synchronize(c,o);
  const stamp=now();
  for (const url of new Set(urls.slice(0,1000))) {
    if (!readingUrlSchema.safeParse(url).success) continue;
    await c.query("UPDATE reading_links SET is_read=1,read_updated_at=$1,updated_at=$2 WHERE owner_subject=$3 AND url=$4 AND read_updated_at IS NULL", [stamp,stamp,o,url]);
  }
});

export const readingCurationContext = (owner: string) => run(owner, async(c,o) => {
  const sequence=await synchronize(c,o);
  const links=(await c.query("SELECT * FROM reading_links WHERE owner_subject=$1 ORDER BY updated_at DESC,url",[o])).map(readingLinkFromRow);
  const presented = new Set((await c.query(`SELECT s.url FROM reading_selections s JOIN reading_editions e
    ON e.owner_subject=s.owner_subject AND e.issue_date=s.issue_date
    WHERE s.owner_subject=$1 AND e.retired=0 AND s.presented_at IS NOT NULL`,[o])).map(row=>String(row.url)));
  // The brief prepares the next edition, so project the current edition's
  // retirement before suggesting links an agent will immediately lose.
  const excluded = (link: typeof links[number]) => link.read || link.dormant || link.eligibleAfter>sequence+1 || (link.commitment === "candidate" && presented.has(link.url));
  const rank={pinned:0,later:1,candidate:2};
  const eligible=links.filter(link=>!excluded(link)).sort((a,b)=>rank[a.commitment]-rank[b.commitment]);
  return { candidates:eligible.slice(0,100), excludedUrls:links.filter(excluded).map(link=>link.url).slice(0,1000) };
});

export const claimReadingMetadata = (owner:string) => run(owner,async(c,o)=>{
  const stamp=now();
  const stale=new Date(Date.now()-60000).toISOString();
  await c.query("UPDATE reading_links SET metadata_status='unavailable',metadata_token=NULL,updated_at=$1 WHERE owner_subject=$2 AND metadata_status='fetching' AND metadata_claimed_at<$3 AND metadata_attempts>=3",[stamp,o,stale]);
  const row=(await c.query(`SELECT * FROM reading_links WHERE owner_subject=$1 AND metadata_attempts<3
    AND ((metadata_status='pending' AND (metadata_retry_at IS NULL OR metadata_retry_at<=$2))
      OR (metadata_status='fetching' AND metadata_claimed_at<$3)) ORDER BY created_at LIMIT 1`,[o,stamp,stale]))[0];
  if(!row)return null;
  const token=randomUUID();
  await c.query("UPDATE reading_links SET metadata_status='fetching',metadata_attempts=metadata_attempts+1,metadata_claimed_at=$1,metadata_token=$2 WHERE owner_subject=$3 AND url=$4",[stamp,token,o,row.url]);
  return {url:String(row.url),token};
});

export const finishReadingMetadata = (owner:string,url:string,token:string,metadata:{title:string|null;publication:string;readingMinutes:number|null}|null) => run(owner,async(c,o)=>{
  const row=await one(c,o,url);
  if(!row || row.metadata_token!==token)return;
  const stamp=now();
  if(metadata){
    await c.query(`UPDATE reading_links SET title=$1,publication=$2,reading_minutes=$3,metadata_status='ready',metadata_token=NULL,metadata_claimed_at=NULL,updated_at=$4
      WHERE owner_subject=$5 AND url=$6`,[row.title_override ? row.title : metadata.title?.slice(0,300) || row.title,metadata.publication.slice(0,160),metadata.readingMinutes,stamp,o,url]);
  }else{
    await c.query(`UPDATE reading_links SET metadata_status=$1,metadata_retry_at=$2,metadata_token=NULL,metadata_claimed_at=NULL,updated_at=$3 WHERE owner_subject=$4 AND url=$5`,
      ["unavailable",new Date(Date.now()+60000).toISOString(),stamp,o,url]);
  }
});

export const retryReadingMetadata = (owner:string,url:string) => run(owner,async(c,o)=>{
  readingUrlSchema.parse(url);
  const row=await one(c,o,url);
  if(!row)throw new Error("Link not found");
  // Limit repeated user retries as well as worker retries; never touch reader intent.
  if(row.metadata_status === "fetching" || (row.metadata_retry_at && String(row.metadata_retry_at)>now()))return false;
  await c.query("UPDATE reading_links SET metadata_status='pending',metadata_attempts=0,metadata_retry_at=NULL,updated_at=$1 WHERE owner_subject=$2 AND url=$3",[now(),o,url]);
  return true;
});
