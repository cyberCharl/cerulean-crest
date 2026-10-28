"use client";

import { useState, useTransition } from "react";
import { changeReadingLink, retryReadingMetadata } from "@/app/links/actions";
import { ArticleActions } from "@/components/article-actions";
import { ArticleShare } from "@/components/article-share";
import type { ArticleFeedback } from "@/lib/article-feedback";
import type { Commitment, ReadingLink } from "@/lib/reading";
import styles from "./reading.module.css";

export function ReadingLinkCard({ link, lead = false, library = false, onChange, onMetadataRetry, feedback, sharingEnabled = false }: {
  link: ReadingLink; lead?: boolean; library?: boolean; onChange: (link: ReadingLink) => void;
  onMetadataRetry: () => void; feedback?: ArticleFeedback; sharingEnabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  function change(patch: { commitment?: Commitment; dormant?: boolean; read?: boolean }, success: string) {
    setError(""); setMessage("");
    startTransition(async () => {
      try {
        const result = await changeReadingLink({ url: link.url, ...patch });
        if (result.error) { setError(result.error); return; }
        if (result.link) { onChange(result.link); setMessage(success); }
      } catch { setError("This change could not be saved. Please try again."); }
    });
  }
  function retryMetadata() {
    setError("");
    startTransition(async () => {
      try {
        const result = await retryReadingMetadata({ url: link.url });
        if (result.error) { setError(result.error); return; }
        onChange({ ...link, metadataStatus: "pending" });
        onMetadataRetry();
        setMessage("Looking up the article details again.");
      } catch { setError("Could not retry the lookup. Please try again."); }
    });
  }
  const waiting = link.metadataStatus === "pending" || link.metadataStatus === "fetching";
  return <article className={`${styles.article} ${lead ? styles.lead : ""}`} aria-busy={pending}>
    <p className={styles.byline}>{link.publication} <span>·</span> {link.readingMinutes ? `${link.readingMinutes} min read` : waiting ? "Finding article details…" : "Reading time unavailable"}{link.read ? " · Read" : ""}</p>
    <h2><a href={link.url} target="_blank" rel="noreferrer">{link.title}</a></h2>
    <a className={styles.source} href={link.url} target="_blank" rel="noreferrer">Read at source <span aria-hidden="true">↗</span></a>
    <div className={styles.actions} role="group" aria-label={`Choices for ${link.title}`}>
      <button type="button" disabled={pending} aria-pressed={link.commitment === "later" && !link.dormant} onClick={() => change({ commitment: link.commitment === "later" && !link.dormant ? "candidate" : "later", dormant: false }, link.commitment === "later" && !link.dormant ? "Returned to candidates." : "Kept for another edition.")}>Maybe later</button>
      <button type="button" disabled={pending} aria-pressed={link.commitment === "pinned" && !link.dormant} onClick={() => change({ commitment: link.commitment === "pinned" && !link.dormant ? "candidate" : "pinned", dormant: false }, link.commitment === "pinned" && !link.dormant ? "Returned to candidates." : "Pinned for later.")}>{link.commitment === "pinned" && !link.dormant ? "Pinned for later" : "Pin for later"}</button>
      <button type="button" disabled={pending} aria-pressed={link.read} onClick={() => change({ read: !link.read }, link.read ? "Marked unread." : "Marked read. The link stays in your collection.")}>{link.read ? "Mark unread" : "Mark read"}</button>
    </div>
    {library ? <div className={styles.libraryMeta}>
      <span>{link.read ? "Read" : link.dormant ? "Dormant" : link.commitment === "pinned" ? "Pinned" : link.commitment === "later" ? "Maybe later" : "Candidate"}</span>
      {link.dormant ? <button type="button" disabled={pending} onClick={() => change({ commitment: "candidate", dormant: false }, "Returned to candidates.")}>Return to candidates</button> : !link.read ? <button type="button" disabled={pending} onClick={() => change({ dormant: true }, "Set aside. This link stays searchable.")}>Let this go dormant</button> : null}
    </div> : null}
    {link.metadataStatus === "unavailable" ? <button className={styles.quietButton} disabled={pending} type="button" onClick={retryMetadata}>Retry article details</button> : null}
    <details className={styles.articleExtras}>
      <summary>Editorial feedback{sharingEnabled ? " & sharing" : ""}</summary>
      <ArticleActions url={link.url} initialFeedback={feedback} />
      {sharingEnabled ? <ArticleShare url={link.url} title={link.title} /> : null}
    </details>
    <p className={styles.status} role="status">{pending ? "Saving…" : message}</p>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
  </article>;
}
