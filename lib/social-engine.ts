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
    `SELECT f.id,f.requester,f.status,p.username,
      (SELECT COUNT(*) FROM social_shares s WHERE s.friendship_id=f.id AND s.recipient=$2 AND s.read_at IS NULL AND s.dismissed=0) AS unread_count,
      (SELECT MAX(s.created_at) FROM social_shares s WHERE s.friendship_id=f.id) AS last_shared_at
      FROM social_friendships f
      JOIN social_profiles p ON p.owner_subject=CASE WHEN f.member_a=$1 THEN f.member_b ELSE f.member_a END
      WHERE (f.member_a=$3 OR f.member_b=$4) AND p.enabled=1 ORDER BY p.username`,
    [owner, owner, owner, owner],
  );
  for (const row of rows) {
    const entry = { id: String(row.id), username: String(row.username) };
    if (row.status === "accepted")
      result.friends.push({
        username: entry.username,
        unreadCount: Number(row.unread_count ?? 0),
        lastSharedAt: row.last_shared_at ? String(row.last_shared_at) : null,
      });
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
    `SELECT s.*,p.username,CAST((SELECT MIN(i.issue_date) FROM issues i JOIN sections sec ON sec.issue_id=i.id JOIN items item ON item.section_id=sec.id WHERE i.owner_subject=s.recipient AND item.url=s.url) AS TEXT) AS included_date
      FROM social_shares s
      JOIN social_profiles p ON p.owner_subject=s.sender
      JOIN social_friendships f ON f.id=s.friendship_id
      WHERE s.recipient=$1 AND p.enabled=1 AND f.status='accepted'
      ${pendingOnly ? "AND s.read_at IS NULL AND s.dismissed=0 AND NOT EXISTS(SELECT 1 FROM issues i JOIN sections sec ON sec.issue_id=i.id JOIN items item ON item.section_id=sec.id WHERE i.owner_subject=s.recipient AND item.url=s.url)" : ""}
      ORDER BY s.created_at DESC LIMIT 200`,
    [owner],
  );
  return rows.map((r) => ({
    id: String(r.id),
    username: String(r.username),
    direction: "received" as const,
    url: String(r.url),
    title: String(r.title),
    note: String(r.note),
    createdAt: String(r.created_at),
    readAt: r.read_at ? String(r.read_at) : null,
    includedDate: r.included_date as string | null,
  }));
}

export async function conversation(
  c: SocialConnection,
  owner: string,
  username: string,
): Promise<SharedArticle[]> {
  const other = await friend(c, owner, username);
  const r = await relation(c, owner, other);
  if (r?.status !== "accepted")
    throw new SocialError("That friend conversation is unavailable");
  const rows = await c.query(
    `SELECT s.*,sender_profile.username AS sender_username,recipient_profile.username AS recipient_username,
      CASE WHEN s.recipient=$1 THEN CAST((SELECT MIN(i.issue_date) FROM issues i JOIN sections sec ON sec.issue_id=i.id JOIN items item ON item.section_id=sec.id WHERE i.owner_subject=s.recipient AND item.url=s.url) AS TEXT) ELSE NULL END AS included_date
      FROM social_shares s
      JOIN social_profiles sender_profile ON sender_profile.owner_subject=s.sender
      JOIN social_profiles recipient_profile ON recipient_profile.owner_subject=s.recipient
      WHERE s.friendship_id=$2 AND (s.sender=$3 OR s.recipient=$4)
      ORDER BY s.created_at DESC, s.id DESC LIMIT 500`,
    [owner, r.id, owner, owner],
  );
  return rows.reverse().map((row) => {
    const direction = row.sender === owner ? "sent" as const : "received" as const;
    return {
      id: String(row.id),
      username: String(direction === "sent" ? row.recipient_username : row.sender_username),
      direction,
      url: String(row.url),
      title: String(row.title),
      note: String(row.note),
      createdAt: String(row.created_at),
      readAt: row.read_at ? String(row.read_at) : null,
      includedDate: row.included_date ? String(row.included_date) : null,
    };
  });
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
    // Repeated sends are idempotent: they do not reset read state or overwrite the original note.
    `INSERT INTO social_shares(id,friendship_id,sender,recipient,url,title,note,recommend,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,1,$8) ON CONFLICT(sender,recipient,url) DO NOTHING`,
    [
      randomUUID(),
      r.id,
      owner,
      other,
      input.url,
      article.title,
      input.note,
      new Date().toISOString(),
    ],
  );
}

export async function setRead(
  c: SocialConnection,
  owner: string,
  id: string,
  read: boolean,
) {
  const [share] = await c.query(
    `SELECT s.id FROM social_shares s JOIN social_friendships f ON f.id=s.friendship_id
      WHERE s.id=$1 AND s.recipient=$2 AND f.status='accepted'`,
    [id, owner],
  );
  if (!share) throw new SocialError("Shared article not found");
  await c.query(
    "UPDATE social_shares SET read_at=$1,dismissed=0 WHERE id=$2 AND recipient=$3",
    [read ? new Date().toISOString() : null, id, owner],
  );
}

export async function setReadByUrl(
  c: SocialConnection,
  owner: string,
  url: string,
  read: boolean,
) {
  await c.query(
    `UPDATE social_shares SET read_at=$1,dismissed=0 WHERE recipient=$2 AND url=$3
      AND EXISTS(SELECT 1 FROM social_friendships f WHERE f.id=social_shares.friendship_id AND f.status='accepted')`,
    [read ? new Date().toISOString() : null, owner, url],
  );
}

export async function markUrlsRead(
  c: SocialConnection,
  owner: string,
  urls: string[],
) {
  const readAt = new Date().toISOString();
  for (const url of urls) {
    await c.query(
      `UPDATE social_shares SET read_at=$1,dismissed=0 WHERE recipient=$2 AND url=$3 AND read_at IS NULL
        AND EXISTS(SELECT 1 FROM social_friendships f WHERE f.id=social_shares.friendship_id AND f.status='accepted')`,
      [readAt, owner, url],
    );
  }
}
