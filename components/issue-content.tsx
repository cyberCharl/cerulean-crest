"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { recordReadingStage } from "@/app/links/actions";
import { ReadingLinkCard } from "@/components/reading-link-card";
import { useReadingLinks } from "@/components/use-reading-links";
import type { ArticleFeedback } from "@/lib/article-feedback";
import type { ReadingEdition } from "@/lib/reading";
import { longDate, weekday } from "@/lib/date";
import styles from "./reading.module.css";

export function IssueContent({ edition, owner, articleFeedback = [], sharingEnabled = false }: {
  edition: ReadingEdition; owner: string; articleFeedback?: ArticleFeedback[]; sharingEnabled?: boolean;
}) {
  const { links, updateLink, refreshMetadata, syncError } = useReadingLinks(owner, [...edition.front, ...edition.inside]);
  const [inside, setInside] = useState(false);
  const [pending, startTransition] = useTransition();
  const [stageError, setStageError] = useState("");
  const [frontRecorded, setFrontRecorded] = useState(false);
  const frontStarted = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousInside = useRef(false);
  const linksByUrl = new Map(links.map(link => [link.url, link]));
  const feedbackByUrl = new Map(articleFeedback.map(feedback => [feedback.url, feedback]));
  const front = edition.front.map(link => linksByUrl.get(link.url) ?? link);
  const insideLinks = edition.inside.map(link => linksByUrl.get(link.url) ?? link);
  const [lead, ...shorts] = front;

  const recordFront = useCallback(async () => {
    setStageError("");
    try {
      const result = await recordReadingStage({ date: edition.date, stage: "front", revision: edition.revision });
      if (result.error) setStageError(result.error);
      else setFrontRecorded(true);
    } catch { setStageError("We couldn’t save which page you opened. Please try again."); }
  }, [edition.date, edition.revision]);

  useEffect(() => {
    // Rendering or prefetching a route never counts as opening the paper.
    // A background tab waits until the reader actually brings it into view.
    function presented() {
      if (document.visibilityState !== "visible" || frontStarted.current) return;
      frontStarted.current = true;
      void recordFront();
    }
    presented();
    document.addEventListener("visibilitychange", presented);
    return () => document.removeEventListener("visibilitychange", presented);
  }, [recordFront]);

  function openInside() {
    setStageError("");
    startTransition(async () => {
      try {
        const result = await recordReadingStage({ date: edition.date, stage: "inside", revision: edition.revision });
        if (result.error) { setStageError(result.error); return; }
        setInside(true);
      } catch { setStageError("The inside pages couldn’t be opened. Please try again."); }
    });
  }
  useEffect(() => {
    if (previousInside.current !== inside) {
      heading.current?.focus(); heading.current?.scrollIntoView({ block: "start" });
      previousInside.current = inside;
    }
  }, [inside]);
  const card = (link: (typeof links)[number], isLead = false) => <ReadingLinkCard key={link.url} link={link} lead={isLead} onChange={updateLink} onMetadataRetry={refreshMetadata} feedback={feedbackByUrl.get(link.url)} sharingEnabled={sharingEnabled} />;

  return <main className={styles.page}>
    <header className={styles.masthead}>
      <p className={styles.eyebrow}>{weekday(edition.date)} · {longDate(edition.date)}</p>
      <h1 ref={heading} tabIndex={-1}>{inside ? "A little more to read." : "A little room for reading."}</h1>
      <p>{inside ? "Follow whichever curiosity takes you." : "A few good pieces. Take what interests you."}</p>
    </header>
    {syncError ? <p className={styles.error} role="alert">{syncError}</p> : null}
    {stageError ? <div className={styles.error} role="alert"><p>{stageError}</p>{!frontRecorded ? <button className={styles.quietButton} type="button" onClick={() => void recordFront()}>Retry saving this visit</button> : null}</div> : null}
    {inside ? <section className={styles.inside} aria-label="Inside pages">
      <button type="button" className={styles.back} onClick={() => setInside(false)}>← Back to the front page</button>
      {insideLinks.map(link => card(link))}
      <p className={styles.end}>That’s the paper. Enjoy the rest of your day.</p>
    </section> : <>
      <section className={styles.pocket} aria-label="Front page">
        {lead ? <div className={styles.pocketLead}><p className={styles.eyebrow}>One to settle into</p>{card(lead, true)}</div> : <p className={styles.empty}>There’s nothing in this edition yet.</p>}
        {shorts.length ? <div className={styles.pocketShorts}><p className={styles.eyebrow}>A few shorter reads</p>{shorts.map(link => card(link))}</div> : null}
      </section>
      <section className={styles.fold} aria-label="End of the front page">
        <span aria-hidden="true">❧</span>
        <h2>This can be enough.</h2>
        {insideLinks.length ? <><p>There’s more inside, if you feel like it.</p><button type="button" disabled={pending} onClick={openInside}>{pending ? "Opening…" : "Open the rest of the paper"}<span aria-hidden="true">→</span></button><p className={styles.foldNote}>Unopened pages won’t change your candidates.</p></> : <p>Enjoy the rest of your day.</p>}
      </section>
    </>}
    <p className={styles.collectionLink}><Link href="/links">Your links, whenever you want them →</Link></p>
  </main>;
}
