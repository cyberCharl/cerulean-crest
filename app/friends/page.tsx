import Link from "next/link";
import { requireUser } from "@/lib/browser-auth";
import { getSocialState } from "@/lib/social-store";
import {
  updateSocialProfile,
  sendFriendRequest,
  respondToRequest,
  endFriendship,
} from "./actions";
import styles from "./friends.module.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Friends",
  robots: { index: false, follow: false },
};

function shortDate(value: string | null) {
  if (!value) return "No articles yet";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const user = await requireUser();
  const [state, query] = await Promise.all([
    getSocialState(user.subject),
    searchParams,
  ]);
  const requestCount = state.incomingRequests.length + state.outgoingRequests.length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className="edition-number">Private correspondence</p>
        <h1>Friends</h1>
        <p>
          A quiet place to pass good reading between people you trust. No feed,
          no public activity, no performance.
        </p>
      </header>

      {query.message ? <p className={styles.status} role="status">{query.message}</p> : null}
      {query.error ? <p className={styles.status} role="alert">{query.error}</p> : null}

      {!state.profile.enabled ? (
        <div className={styles.setupGrid}>
          <section className={`${styles.section} ${styles.welcome}`} aria-labelledby="setup-heading">
            <p className={styles.kicker}>An invitation, not a network</p>
            <h2 id="setup-heading">Make a small door for friends.</h2>
            <p>
              Choose a private username, then connect by exact name. Only people
              you accept can exchange articles with you.
            </p>
          </section>
          <section className={styles.section} aria-labelledby="profile-heading">
            <h2 id="profile-heading">Choose your username</h2>
            <ProfileForm username={state.profile.username ?? ""} enabled={false} />
          </section>
        </div>
      ) : (
        <div className={styles.columns}>
          <section className={styles.threads} aria-labelledby="threads-heading">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.kicker}>Article conversations</p>
                <h2 id="threads-heading">Your correspondence</h2>
              </div>
              <span>{state.friends.length} {state.friends.length === 1 ? "friend" : "friends"}</span>
            </div>

            {!state.friends.length ? (
              <div className={styles.emptyThread}>
                <span aria-hidden="true">✦</span>
                <h3>Your first thread will appear here.</h3>
                <p>Add someone whose reading judgment you trust, then send them a piece from an edition or Saved.</p>
              </div>
            ) : (
              <ul className={styles.threadList}>
                {state.friends.map((friend) => (
                  <li key={friend.username}>
                    <Link href={`/friends/${friend.username}`} className={styles.threadLink}>
                      <span className={styles.avatar} aria-hidden="true">{friend.username.slice(0, 1)}</span>
                      <span className={styles.threadCopy}>
                        <strong>@{friend.username}</strong>
                        <span>{friend.unreadCount ? `${friend.unreadCount} unread ${friend.unreadCount === 1 ? "article" : "articles"}` : "All caught up"}</span>
                      </span>
                      <span className={styles.threadMeta}>
                        <time>{shortDate(friend.lastSharedAt)}</time>
                        <i aria-hidden="true">→</i>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {state.friends.length ? (
              <p className={styles.threadHint}>
                Send from any article in <Link href="/latest">Latest</Link> or <Link href="/saved">Saved</Link>. Unread articles from these threads are the friend recommendations your curator sees.
              </p>
            ) : null}
          </section>

          <aside className={styles.sidebar} aria-label="Friend settings">
            <section className={styles.section} aria-labelledby="add-friend-heading">
              <p className={styles.kicker}>Invite by exact name</p>
              <h2 id="add-friend-heading">Add a friend</h2>
              <form action={sendFriendRequest} className={styles.form}>
                <label>
                  Their username
                  <input name="username" required minLength={3} maxLength={30} pattern="[A-Za-z][A-Za-z0-9_]{2,29}" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="reader_name" />
                </label>
                <button type="submit">Send request</button>
              </form>
            </section>

            {requestCount ? (
              <section className={styles.section} aria-labelledby="requests-heading">
                <h2 id="requests-heading">Requests</h2>
                <ul className={styles.list}>
                  {state.incomingRequests.map((request) => (
                    <li key={request.id}>
                      <span>@{request.username}</span>
                      <form action={respondToRequest} className={styles.actions}>
                        <input type="hidden" name="id" value={request.id} />
                        <button name="decision" value="accept">Accept</button>
                        <button name="decision" value="decline" className={styles.quietButton}>Decline</button>
                      </form>
                    </li>
                  ))}
                  {state.outgoingRequests.map((request) => (
                    <li key={request.id}>
                      <span>@{request.username}</span>
                      <span className={styles.hint}>Request sent</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <details className={styles.manage}>
              <summary>Manage friends &amp; username</summary>
              <section className={styles.manageBody}>
                <ProfileForm username={state.profile.username ?? ""} enabled />
                {state.friends.length ? (
                  <div className={styles.removeList}>
                    <p className={styles.hint}>Removing a friend also removes your shared history.</p>
                    {state.friends.map((friend) => (
                      <form action={endFriendship} key={friend.username}>
                        <input type="hidden" name="username" value={friend.username} />
                        <span>@{friend.username}</span>
                        <button className={styles.quietButton}>Remove</button>
                      </form>
                    ))}
                  </div>
                ) : null}
              </section>
            </details>
          </aside>
        </div>
      )}
    </main>
  );
}

function ProfileForm({ username, enabled }: { username: string; enabled: boolean }) {
  return (
    <form action={updateSocialProfile} className={styles.form}>
      <label>
        Username
        <span className={styles.inputPrefix}>
          <span aria-hidden="true">@</span>
          <input name="username" defaultValue={username} minLength={3} maxLength={30} pattern="[A-Za-z][A-Za-z0-9_]{2,29}" autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby="username-help" />
        </span>
        <small id="username-help">3–30 lowercase letters, numbers or underscores.</small>
      </label>
      <label className={styles.check}>
        <input type="checkbox" name="enabled" defaultChecked={enabled} />
        Enable private friend sharing
      </label>
      <button type="submit">Save</button>
    </form>
  );
}
