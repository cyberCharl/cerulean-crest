"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArticleShare } from "@/components/article-share";
import { ArticleActions } from "@/components/article-actions";
import type { ArticleFeedback } from "@/lib/article-feedback";
import type { Issue } from "@/lib/schema";
import { parseReadingProgress, serializeReadingProgress } from "@/lib/reading-progress";

function storageKey(owner: string, date: string) {
  return `cerulean-crest:${encodeURIComponent(owner)}:${date}:read`;
}

export function IssueContent({ header, issue, owner, canImportLegacyProgress = false, articleFeedback = [], sharingEnabled = false }: { header?: ReactNode; sharingEnabled?: boolean; issue: Issue; owner: string; canImportLegacyProgress?: boolean; articleFeedback?: ArticleFeedback[] }) {
  const [readItems, setReadItems] = useState<Set<string>>(() => new Set());
  const items = useMemo(() => issue.sections.flatMap((section) => section.items), [issue.sections]);

  useEffect(() => {
    try {
      const current = localStorage.getItem(storageKey(owner, issue.date));
      // Only the explicitly assigned legacy owner may inherit pre-account progress.
      const value = current ?? (canImportLegacyProgress ? localStorage.getItem(`cerulean-crest:${issue.date}:read`) : null);
      const stored = parseReadingProgress(value, items);
      setReadItems(stored);
      try {
        localStorage.setItem(storageKey(owner, issue.date), serializeReadingProgress(stored));
      } catch { /* Keep loaded progress even when writes are unavailable. */ }
    } catch {
      setReadItems(new Set());
    }
  }, [owner, issue.date, items, canImportLegacyProgress]);

  function toggleRead(url: string) {
    const next = new Set(readItems);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    setReadItems(next);
    try {
      localStorage.setItem(storageKey(owner, issue.date), serializeReadingProgress(next));
    } catch { /* Reading remains usable when browser storage is disabled/full. */ }
  }

  const feedbackByUrl = new Map(articleFeedback.map((feedback) => [feedback.url, feedback]));
  const readCount = items.filter((item) => readItems.has(item.url)).length;
  const readMinutes = items.reduce((total, item) => total + (readItems.has(item.url) ? item.readingMinutes : 0), 0);
  const percent = items.length === 0 ? 0 : Math.round((readCount / items.length) * 100);

  return (
    <div className="issue-body">
      <aside className="edition-sidebar" aria-label="Edition details and reading progress">
        <div className="edition-sidebar-content">
          <p className="margin-label">In this edition</p>
          <p className="issue-metrics"><span>{items.length} pieces</span><span>{issue.availableMinutes} minutes of reading</span></p>
          {issue.coverageGap ? <details className="coverage-note"><summary>Coverage note</summary><p>{issue.coverageGap}</p></details> : null}
          <div className="edition-progress" aria-label="Reading progress">
            <p><strong>{readCount} / {items.length}</strong> pieces read</p>
            <div className="edition-progress-track" aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>
            <p>{readMinutes} min complete</p>
          </div>
          <Link className="edition-saved-link" href="/saved">Your saved articles →</Link>
        </div>
      </aside>

      <div className="edition-reading-column">
        {header}
      <div className="sections">
        {issue.sections.map((section, sectionIndex) => (
          <section className="issue-section" key={section.id} aria-labelledby={`section-${section.id}`}>
            <header className="section-heading">
              <span>0{sectionIndex + 1}</span>
              <h2 id={`section-${section.id}`}>{section.title}</h2>
              <i />
            </header>
            <div className="item-list">
              {section.items.map((item) => {
                const isRead = readItems.has(item.url);
                return (
                  <article className={`issue-item${isRead ? " is-read" : ""}`} id={`item-${item.number}`} key={item.id}>
                    <div className="item-copy">
                      <h3><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a></h3>
                      <p className="article-byline">
                        <span>{item.author}</span><span>{item.publication}</span><span>{item.publishedAt}</span><span>{item.type}</span><span>{item.readingMinutes} min read</span>
                      </p>
                      <p className="summary">{item.summary}</p>
                    </div>
                    <footer className="article-controls" aria-label="Article actions">
                      <div className="item-actions">
                        <a className="source-link" href={item.url} target="_blank" rel="noreferrer">
                          Read at source <span aria-hidden="true">↗</span>
                        </a>
                        <button
                          className="read-toggle"
                          type="button"
                          aria-pressed={isRead}
                          onClick={() => toggleRead(item.url)}
                        >
                          <span aria-hidden="true">{isRead ? "✓" : "+"}</span>
                          {isRead ? "Read" : "Mark as read"}
                        </button>
                      </div>
                      <ArticleActions url={item.url} initialFeedback={feedbackByUrl.get(item.url)} />
                      {sharingEnabled ? <ArticleShare url={item.url} title={item.title} /> : null}
                    </footer>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      </div>
    </div>
  );
}
