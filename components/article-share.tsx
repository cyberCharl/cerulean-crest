"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { availableFriends, sendArticleToFriend } from "@/app/friends/actions";
import styles from "./article-share.module.css";

export function ArticleShare({ url, title }: { url: string; title: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<{ username: string }[] | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [pending, startTransition] = useTransition();

  function toggle() {
    setOpen(!open);
    if (open || friends) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await availableFriends();
        if (result.error) setError(result.error);
        else setFriends(result.friends ?? []);
      } catch { setError("Your friends could not be loaded. Close this panel and try again."); }
    });
  }
  return <div className={styles.share} aria-busy={pending}>
    <button type="button" aria-expanded={open} aria-controls={`${id}-share`} onClick={toggle}>Send to a friend</button>
    {open ? <div id={`${id}-share`}>
      {friends?.length ? <form className={styles.form} onSubmit={event => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        setError(""); setMessage(""); setSentTo("");
        startTransition(async () => {
          try {
            const result = await sendArticleToFriend({ url, title, username: String(data.get("username") ?? ""), note: String(data.get("note") ?? "") });
            if (result.error) setError(result.error);
            else { form.reset(); setSentTo(result.username ?? ""); setMessage("Article sent."); }
          } catch { setError("The article could not be sent. Please try again."); }
        });
      }}>
        <label>To<select name="username" required disabled={pending} defaultValue=""><option value="" disabled>Choose a friend</option>{friends.map(friend => <option key={friend.username} value={friend.username}>@{friend.username}</option>)}</select></label>
        <label>A note (optional)<textarea name="note" rows={3} maxLength={2000} disabled={pending} /></label>
        <p className={styles.hint}>Only this link, its title and your note are shared. It stays in your private thread; while unread, it is also available to their curator as a friend recommendation.</p>
        <button type="submit" disabled={pending}>Send article</button>
      </form> : friends ? <p><Link href="/friends">Add a friend</Link> to share this piece.</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <p role="status">{pending ? "One moment…" : message}{sentTo ? <> <Link href={`/friends/${sentTo}`}>View conversation →</Link></> : null}</p>
    </div> : null}
  </div>;
}
