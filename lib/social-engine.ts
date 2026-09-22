import { randomUUID } from "node:crypto";
import { SocialError, type SocialState, type SharedArticle } from "./social.ts";
export type SocialConnection = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<Record<string, unknown>[]>;
};
export async function profile(c: SocialConnection, owner: string) {
  const [p] = await c.query(
    "SELECT username, enabled FROM social_profiles WHERE owner_subject=$1",
    [owner],
  );
  return {
    username: (p?.username as string | null) ?? null,
    enabled: p?.enabled === 1,
  };
}
async function enabled(c: SocialConnection, owner: string) {
  if (!(await profile(c, owner)).enabled)
    throw new SocialError("Enable friends in your profile first");
}
async function friend(c: SocialConnection, owner: string, username: string) {
  await enabled(c, owner);
  const [p] = await c.query(
    "SELECT owner_subject FROM social_profiles WHERE username=$1 AND enabled=1",
    [username],
  );
  if (!p || p.owner_subject === owner)
    throw new SocialError("That reader is unavailable");
  return String(p.owner_subject);
}
async function relation(c: SocialConnection, owner: string, other: string) {
  const [a, b] = [owner, other].sort();
  const [r] = await c.query(
    "SELECT * FROM social_friendships WHERE member_a=$1 AND member_b=$2",
    [a, b],
  );
  return r;
}
export async function state(
  c: SocialConnection,
  owner: string,
): Promise<SocialState> {
  const p = await profile(c, owner);
  const result: SocialState = {
    profile: p,
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    shares: [],
  };
  if (!p.enabled) return result;
  const rows = await c.query(
    "SELECT f.id,f.requester,f.status,p.username FROM social_friendships f JOIN social_profiles p ON p.owner_subject=CASE WHEN f.member_a=$1 THEN f.member_b ELSE f.member_a END WHERE (f.member_a=$2 OR f.member_b=$3) AND p.enabled=1 ORDER BY p.username",
    [owner, owner, owner],
  );
  for (const row of rows) {
    const entry = { id: String(row.id), username: String(row.username) };
    if (row.status === "accepted")
      result.friends.push({ username: entry.username });
    else
      (row.requester === owner
        ? result.outgoingRequests
        : result.incomingRequests
      ).push(entry);
  }
  result.shares = await shares(c, owner);
  return result;
}
export async function shares(
  c: SocialConnection,
  owner: string,
  pendingOnly = false,
): Promise<SharedArticle[]> {
  if (!(await profile(c, owner)).enabled) return [];
  const rows = await c.query(
    `SELECT s.*,p.username,(SELECT MIN(i.issue_date) FROM issues i JOIN sections sec ON sec.issue_id=i.id JOIN items item ON item.section_id=sec.id WHERE i.owner_subject=$1 AND item.url=s.url) AS included_date FROM social_shares s JOIN social_profiles p ON p.owner_subject=s.sender JOIN social_friendships f ON f.id=s.friendship_id WHERE s.recipient=$2 AND s.dismissed=0 AND p.enabled=1 AND f.status='accepted' ${pendingOnly ? "AND s.recommend=1 AND NOT EXISTS(SELECT 1 FROM issues i JOIN sections sec ON sec.issue_id=i.id JOIN items item ON item.section_id=sec.id WHERE i.owner_subject=s.recipient AND item.url=s.url)" : ""} ORDER BY s.created_at DESC LIMIT 200`,
    [owner, owner],
  );
  return rows.map((r) => ({
    id: String(r.id),
    username: String(r.username),
    url: String(r.url),
    title: String(r.title),
    note: String(r.note),
    recommend: r.recommend === 1,
    createdAt: String(r.created_at),
    includedDate: r.included_date as string | null,
  }));
}
export async function saveProfile(
  c: SocialConnection,
  owner: string,
  input: { username: string; enabled: boolean },
) {
  const username = input.username || null;
  const [taken] = username
    ? await c.query(
        "SELECT owner_subject FROM social_profiles WHERE username=$1",
        [username],
      )
    : [];
  if (taken && taken.owner_subject !== owner)
    throw new SocialError("That username is already taken");
  await c.query(
    "INSERT INTO social_profiles(owner_subject,username,enabled) VALUES($1,$2,$3) ON CONFLICT(owner_subject) DO UPDATE SET username=excluded.username,enabled=excluded.enabled",
    [owner, username, input.enabled ? 1 : 0],
  );
}
export async function request(
  c: SocialConnection,
  owner: string,
  username: string,
) {
  const other = await friend(c, owner, username);
  if (await relation(c, owner, other))
    throw new SocialError("A friendship or request already exists");
  const [a, b] = [owner, other].sort();
  await c.query(
    "INSERT INTO social_friendships(id,member_a,member_b,requester,status) VALUES($1,$2,$3,$4,'pending')",
    [randomUUID(), a, b, owner],
  );
}
export async function respond(
  c: SocialConnection,
  owner: string,
  id: string,
  action: "accept" | "decline",
) {
  await enabled(c, owner);
  const [r] = await c.query(
    "SELECT * FROM social_friendships WHERE id=$1 AND status='pending' AND (member_a=$2 OR member_b=$3)",
    [id, owner, owner],
  );
  if (!r || r.requester === owner)
    throw new SocialError("Friend request not found");
  if (action === "accept") {
    if (!(await profile(c, String(r.requester))).enabled)
      throw new SocialError("That reader is unavailable");
    await c.query(
      "UPDATE social_friendships SET status='accepted' WHERE id=$1",
      [id],
    );
  } else await c.query("DELETE FROM social_friendships WHERE id=$1", [id]);
}
export async function remove(
  c: SocialConnection,
  owner: string,
  username: string,
) {
  const [p] = await c.query(
    "SELECT owner_subject FROM social_profiles WHERE username=$1",
    [username],
  );
  if (!p) throw new SocialError("Friend not found");
  const r = await relation(c, owner, String(p.owner_subject));
  if (!r) throw new SocialError("Friend not found");
  await c.query("DELETE FROM social_friendships WHERE id=$1", [r.id]);
}
export async function share(
  c: SocialConnection,
  owner: string,
  input: {
    username: string;
    url: string;
    title: string;
    note: string;
    recommend: boolean;
  },
) {
  const other = await friend(c, owner, input.username);
  const r = await relation(c, owner, other);
  if (r?.status !== "accepted")
    throw new SocialError("You can only share with an accepted friend");
  const [article] = await c.query(
    `SELECT item.title FROM items item JOIN sections sec ON sec.id=item.section_id JOIN issues i ON i.id=sec.issue_id WHERE i.owner_subject=$1 AND item.url=$2 UNION ALL SELECT title FROM article_feedback WHERE owner_subject=$3 AND url=$4 LIMIT 1`,
    [owner, input.url, owner, input.url],
  );
  if (!article) throw new SocialError("Article not found in your editions");
  await c.query(
    // A repeated share may nominate an existing share; it never resets dismissal or overwrites its note.
    `INSERT INTO social_shares(id,friendship_id,sender,recipient,url,title,note,recommend,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(sender,recipient,url) DO UPDATE SET recommend=CASE WHEN excluded.recommend=1 THEN 1 ELSE social_shares.recommend END`,
    [
      randomUUID(),
      r.id,
      owner,
      other,
      input.url,
      article.title,
      input.note,
      input.recommend ? 1 : 0,
      new Date().toISOString(),
    ],
  );
}
export async function dismiss(c: SocialConnection, owner: string, id: string) {
  await c.query(
    "UPDATE social_shares SET dismissed=1 WHERE id=$1 AND recipient=$2",
    [id, owner],
  );
}
