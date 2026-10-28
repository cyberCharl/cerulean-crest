"use client";

import { useDeferredValue, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { addReadingLink } from "@/app/links/actions";
import { ReadingLinkCard } from "@/components/reading-link-card";
import { useReadingLinks } from "@/components/use-reading-links";
import type { ArticleFeedback } from "@/lib/article-feedback";
import type { ReadingLink } from "@/lib/reading";
import styles from "./reading.module.css";

const shelves = [
  { key: "candidate", label: "Candidates", note: "Available for a future selection. Being saved is enough; nothing is due." },
  { key: "later", label: "Maybe later", note: "Still interested, just not now. These rest for one edition before becoming eligible again." },
  { key: "pinned", label: "Pinned", note: "A deliberate intention to read. These stay eligible until you read or release them." },
  { key: "dormant", label: "Dormant", note: "Quietly set aside, always findable. Bring a link back whenever you like." },
  { key: "read", label: "Read", note: "Links you marked read. No score, no finish line." },
  { key: "all", label: "All links", note: "Every link stays here, even when its edition is gone." },
] as const;
type Shelf = (typeof shelves)[number]["key"];

export function ReadingLibrary({ owner, initialLinks, articleFeedback, sharingEnabled }: {
  owner: string; initialLinks: ReadingLink[]; articleFeedback: ArticleFeedback[]; sharingEnabled: boolean;
}) {
  const { links, updateLink, refreshMetadata, syncError } = useReadingLinks(owner, initialLinks);
  const [shelf, setShelf] = useState<Shelf>("candidate");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const urlInput = useRef<HTMLInputElement>(null);
  const feedbackByUrl = new Map(articleFeedback.map(feedback => [feedback.url, feedback]));
  const visibleLinks = links.filter(link => {
    const onShelf = shelf === "all" || (shelf === "read" ? link.read : shelf === "dormant" ? link.dormant && !link.read : !link.read && !link.dormant && link.commitment === shelf);
    return onShelf && (!deferredSearch || `${link.title} ${link.publication} ${link.url}`.toLocaleLowerCase().includes(deferredSearch));
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  function capture(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    startTransition(async () => {
      try {
        const result = await addReadingLink({ url: url.trim(), ...(title.trim() ? { title: title.trim() } : {}) });
        if (result.error) { setError(result.error); return; }
        if (result.link) {
          updateLink(result.link); refreshMetadata();
          setShelf(result.link.read ? "read" : result.link.dormant ? "dormant" : result.link.commitment);
          setSearch(""); setUrl(""); setTitle("");
          setMessage(result.created === false ? "Already in your collection. Your reading choices are unchanged." : "Link saved. We’ll look up its title and reading time.");
          urlInput.current?.focus();
        }
      } catch { setError("Your link could not be saved. Please try again."); }
    });
  }

  return <main className={styles.page}>
    <header className={styles.masthead}>
      <p className={styles.eyebrow}>Your private collection</p>
      <h1>Links, without the backlog.</h1>
      <p>Keep the possibility of a good read. Nothing here is homework.</p>
    </header>
    <details className={styles.capture} open>
      <summary>Add a link</summary>
      <form onSubmit={capture} aria-busy={pending}>
        <label>Link<input ref={urlInput} type="url" required maxLength={2048} value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…" disabled={pending} autoComplete="url" /></label>
        <label>Title <span>(optional)</span><input type="text" maxLength={300} value={title} onChange={event => setTitle(event.target.value)} placeholder="We’ll find this for you" disabled={pending} /></label>
        <button className={styles.primary} type="submit" disabled={pending}>{pending ? "Saving…" : "Add as a candidate"}</button>
        <p className={styles.captureHint}>Only the link and article details are saved. Read the writing at its source.</p>
        <p className={styles.status} role="status">{message}</p>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </form>
    </details>
    {syncError ? <p className={styles.error} role="alert">{syncError}</p> : null}
    <div className={styles.shelves} role="group" aria-label="Link shelves">{shelves.map(item => <button key={item.key} type="button" aria-pressed={shelf === item.key} onClick={() => setShelf(item.key)}>{item.label}</button>)}</div>
    <p className={styles.shelfNote}>{shelves.find(item => item.key === shelf)?.note}</p>
    <label className={styles.search}>Find a link<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search titles, sources or URLs" /></label>
    {search && shelf !== "all" ? <p className={styles.searchHint}>Searching {shelves.find(item => item.key === shelf)?.label.toLocaleLowerCase()}. <button type="button" className={styles.quietButton} onClick={() => setShelf("all")}>Search all links</button></p> : null}
    <section className={styles.library} aria-label={shelves.find(item => item.key === shelf)?.label}>
      {visibleLinks.map(link => <div key={link.url} className={styles.libraryEntry}><ReadingLinkCard link={link} library onChange={updateLink} onMetadataRetry={refreshMetadata} feedback={feedbackByUrl.get(link.url)} sharingEnabled={sharingEnabled} /></div>)}
      {!visibleLinks.length ? <p className={styles.empty}>{search ? "No matching links here. Try another search or look through all links." : "Nothing here. There’s nothing to catch up on."}</p> : null}
    </section>
    <div className={styles.collectionLink}><Link href="/latest">Open your paper →</Link><Link href="/saved">Previously saved articles</Link></div>
  </main>;
}
