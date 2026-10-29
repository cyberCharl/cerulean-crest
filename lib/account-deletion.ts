import { readingTransaction } from "./reading-connection.ts";
import type { ReadingConnection } from "./reading.ts";
import { deleteAuth0User, type Auth0Deletion } from "./auth0-management.ts";

// Every table that holds a reader's data, in an order that respects foreign keys.
// A new owner-keyed table must be added here, and the privacy page kept in step.
const statements = [
  "DELETE FROM reading_selections WHERE owner_subject=$1",
  "DELETE FROM reading_editions WHERE owner_subject=$1",
  "DELETE FROM reading_links WHERE owner_subject=$1",
  "DELETE FROM reading_legacy_bookmarks WHERE owner_subject=$1",
  "DELETE FROM article_feedback WHERE owner_subject=$1",
  "DELETE FROM editorial_settings WHERE owner_subject=$1",
  // Sections and items cascade from their issue.
  "DELETE FROM issues WHERE owner_subject=$1",
  // Shares a friend sent this reader go too, along with friendships on both sides.
  "DELETE FROM social_shares WHERE sender=$1 OR recipient=$1",
  "DELETE FROM social_friendships WHERE member_a=$1 OR member_b=$1",
  "DELETE FROM social_profiles WHERE owner_subject=$1",
];

export async function deleteAccountRecords(c: ReadingConnection, owner: string): Promise<void> {
  for (const sql of statements) await c.query(sql, [owner]);
}

/**
 * Removes everything Filtered stores for a reader in one transaction, then their
 * Auth0 sign-in record. Records go first: if Auth0 fails, the reader's data is
 * already gone and only the login needs removing by hand.
 */
export async function deleteAccount(owner: string): Promise<{ auth0: Auth0Deletion }> {
  await readingTransaction(owner, deleteAccountRecords);
  try {
    return { auth0: await deleteAuth0User(owner) };
  } catch (error) {
    console.error("account deletion: records removed, Auth0 user still needs removing", { subject: owner, error: String(error) });
    return { auth0: "failed" };
  }
}
