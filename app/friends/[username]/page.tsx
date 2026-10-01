import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/browser-auth";
import { getFriendConversation, getSocialState } from "@/lib/social-store";
import { usernameSchema } from "@/lib/social";
import { changeSharedArticleRead } from "../actions";
import styles from "../friends.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Friend conversation", robots: { index: false, follow: false } };

function messageDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function FriendConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const user = await requireUser();
  const rawUsername = (await params).username;
  const parsed = usernameSchema.safeParse(rawUsername);
  if (!parsed.success) notFound();
  const username = parsed.data;
  const state = await getSocialState(user.subject);
  if (!state.profile.enabled || !state.friends.some((friend) => friend.username === username)) notFound();
  const [messages, query] = await Promise.all([
    getFriendConversation(user.subject, username),
    searchParams,
  ]);

  return (
    <main className={`${styles.page} ${styles.conversationPage}`}>
      <Link href="/friends" className={styles.backLink}>← All friends</Link>
      <header className={styles.conversationHeader}>
        <span className={styles.avatar} aria-hidden="true">{username.slice(0, 1)}</span>
        <div>
          <p className={styles.kicker}>Private article thread</p>
          <h1>@{username}</h1>
          <p>Only the articles and notes you exchange appear here.</p>
        </div>
      </header>

      {query.message ? <p className={styles.status} role="status">{query.message}</p> : null}
      {query.error ? <p className={styles.status} role="alert">{query.error}</p> : null}

      <div className={styles.conversationLayout}>
        <section className={styles.messages} aria-label={`Articles shared with ${username}`}>
          {!messages.length ? (
            <div className={styles.emptyThread}>
              <span aria-hidden="true">✦</span>
              <h2>Nothing passed between you yet.</h2>
              <p>Find a piece in <Link href="/latest">Latest</Link> or <Link href="/saved">Saved</Link> and choose “Send to a friend”.</p>
            </div>
          ) : messages.map((article) => (
            <article key={article.id} className={`${styles.message} ${article.direction === "sent" ? styles.sent : styles.received}`}>
              <p className={styles.messageLabel}>
                {article.direction === "sent" ? "You sent" : `@${username} sent`}
                <time dateTime={article.createdAt}>{messageDate(article.createdAt)}</time>
              </p>
              <h2><a href={article.url} target="_blank" rel="noopener noreferrer">{article.title} <span aria-hidden="true">↗</span></a></h2>
              {article.note ? <p className={styles.note}>{article.note}</p> : null}
              <footer className={styles.messageFooter}>
                <span className={article.readAt ? styles.readState : styles.unreadState}>
                  {article.direction === "sent"
                    ? article.readAt ? `Read by @${username}` : "Sent"
                    : article.readAt ? "Marked as read" : "Unread · visible to your curator"}
                </span>
                {article.direction === "received" ? (
                  <form action={changeSharedArticleRead}>
                    <input type="hidden" name="id" value={article.id} />
                    <input type="hidden" name="username" value={username} />
                    <input type="hidden" name="read" value={article.readAt ? "false" : "true"} />
                    <button>{article.readAt ? "Mark unread" : "Mark as read"}</button>
                  </form>
                ) : null}
              </footer>
              {article.includedDate ? (
                <p className={styles.included}>Filed in your <Link href={`/issues/${article.includedDate}`}>{article.includedDate} edition</Link>.</p>
              ) : null}
            </article>
          ))}
        </section>

        <aside className={styles.threadAside}>
          <p className={styles.kicker}>How recommendations work</p>
          <p>Every unread article sent to you here is available to your curator as a friend recommendation.</p>
          <p>Mark it read and it leaves that list. @{username} can see the read state only by returning to this thread.</p>
          <Link href="/latest">Find something to send →</Link>
        </aside>
      </div>
    </main>
  );
}
