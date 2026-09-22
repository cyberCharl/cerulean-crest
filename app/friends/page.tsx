import Link from "next/link";
import { requireUser } from "@/lib/browser-auth";
import { getSocialState } from "@/lib/social-store";
import { updateSocialProfile, sendFriendRequest, respondToRequest, endFriendship, dismissSharedArticle } from "./actions";
import styles from "./friends.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Friends & sharing", robots: { index: false, follow: false } };

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ message?: string; error?: string }> }) {
  const user = await requireUser();
  const [state, query] = await Promise.all([getSocialState(user.subject), searchParams]);
  return <main className={styles.page}>
    <header className={styles.header}>
      <p className="edition-number">A piece worth passing on</p>
      <h1>Friends &amp; sharing</h1>
      <p>A small, optional space to exchange articles with people you know. Your editions, constitution and private notes stay yours.</p>
    </header>
    {query.message ? <p className={styles.status} role="status">{query.message}</p> : null}
    {query.error ? <p className={styles.status} role="alert">{query.error}</p> : null}
    <div className={styles.columns}>
      <div>
        <section className={styles.section} aria-labelledby="profile-heading">
          <h2 id="profile-heading">Your username</h2>
          <p>Friends can find you by your exact username once you enable sharing. Only accepted friends can send you articles.</p>
          <form action={updateSocialProfile} className={styles.form}>
            <label>Username<input name="username" defaultValue={state.profile.username ?? ""} minLength={3} maxLength={30} pattern="[A-Za-z][A-Za-z0-9_]{2,29}" autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby="username-help" /><small id="username-help">3–30 letters, numbers or underscores, starting with a letter. Usernames are saved in lowercase.</small></label>
            <label className={styles.check}><input type="checkbox" name="enabled" defaultChecked={state.profile.enabled} />Enable friends and article sharing</label>
            <p className={styles.hint}>Turn this off to stop friend requests and sharing. It does not change your editorial preferences.</p>
            <button type="submit">Save sharing preferences</button>
          </form>
        </section>
        {state.profile.enabled ? <>
          <section className={styles.section} aria-labelledby="add-friend-heading">
            <h2 id="add-friend-heading">Find a friend</h2>
            <form action={sendFriendRequest} className={styles.form}>
              <label>Their exact username<input name="username" required minLength={3} maxLength={30} pattern="[A-Za-z][A-Za-z0-9_]{2,29}" autoComplete="off" autoCapitalize="none" spellCheck={false} /></label>
              <button type="submit">Send friend request</button>
            </form>
          </section>
          <section className={styles.section} aria-labelledby="requests-heading">
            <h2 id="requests-heading">Friend requests</h2>
            {!state.incomingRequests.length && !state.outgoingRequests.length ? <p className={styles.empty}>No pending requests.</p> : <ul className={styles.list}>
              {state.incomingRequests.map(request => <li key={request.id}><div className={styles.row}>
                <span>@{request.username}</span><form action={respondToRequest} className={styles.actions}>
                  <input type="hidden" name="id" value={request.id} />
                  <button name="decision" value="accept">Accept</button><button name="decision" value="decline">Decline</button>
                </form>
              </div></li>)}
              {state.outgoingRequests.map(request => <li key={request.id}><div className={styles.row}><span>@{request.username}</span><span className={styles.hint}>Request sent</span></div></li>)}
            </ul>}
          </section>
          <section className={styles.section} aria-labelledby="friends-heading">
            <h2 id="friends-heading">Your friends</h2>
            {!state.friends.length ? <p className={styles.empty}>Add someone whose reading you trust.</p> : <ul className={styles.list}>{state.friends.map(friend => <li key={friend.username}><div className={styles.row}>
              <span>@{friend.username}</span><form action={endFriendship}><input type="hidden" name="username" value={friend.username} /><button>Remove friend</button></form>
            </div></li>)}</ul>}
          </section>
        </> : null}
      </div>
      <div>
        {state.profile.enabled ? <>
          <section className={styles.section} aria-labelledby="inbox-heading">
            <h2 id="inbox-heading">From your friends</h2>
            <p>Recommendations are suggestions for your curator. It decides whether a piece belongs in a future edition, using your constitution.</p>
            {!state.shares.length ? <p className={styles.empty}>No shared articles yet. A good recommendation can wait here until you have time.</p> : <ul className={styles.list}>{state.shares.map(article => <li key={article.id} className={styles.article}>
              <p className={styles.eyebrow}>From @{article.username}</p>
              <h3><a href={article.url} target="_blank" rel="noopener noreferrer">{article.title} <span aria-hidden="true">↗</span></a></h3>
              {article.note ? <p className={styles.note}>{article.note}</p> : null}
              <p className={styles.hint}>{article.includedDate ? <>Included in your <Link href={`/issues/${article.includedDate}`}>{article.includedDate} edition</Link></> : article.recommend ? "Suggested for a future edition · awaiting your curator" : "Shared for you to read"}</p>
              <form action={dismissSharedArticle}><input type="hidden" name="id" value={article.id} /><button>Dismiss article</button></form>
            </li>)}</ul>}
          </section>
          {state.friends.length ? <section className={styles.section} aria-labelledby="share-heading">
            <h2 id="share-heading">Pass something on</h2>
            <p>Open a piece in <Link href="/today">your latest edition</Link> or <Link href="/saved">Saved</Link>, then choose “Share with a friend”. Only its link, title and the note you write are shared.</p>
          </section> : null}
        </> : <section className={styles.section}><h2>A personal edition, with room for friends.</h2><p>Choose a username and enable sharing whenever you want to pass a piece on. Daybook works just as well on your own.</p></section>}
      </div>
    </div>
    <p><Link href="/settings">← Back to Settings</Link></p>
  </main>;
}
