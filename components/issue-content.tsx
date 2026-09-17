"use client";

import { useEffect, useMemo, useState } from "react";
import type { Issue } from "@/lib/schema";
import { parseReadingProgress, serializeReadingProgress } from "@/lib/reading-progress";

function storageKey(owner: string, date: string) {
  return `cerulean-crest:${encodeURIComponent(owner)}:${date}:read`;
}

export function IssueContent({ issue, owner, canImportLegacyProgress = false }: { issue: Issue; owner: string; canImportLegacyProgress?: boolean }) {
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

  const readCount = items.filter((item) => readItems.has(item.url)).length;
  const readMinutes = items.reduce((total, item) => total + (readItems.has(item.url) ? item.readingMinutes : 0), 0);
  const percent = items.length === 0 ? 0 : Math.round((readCount / items.length) * 100);

  return (
    <div className="issue-body">
      <aside className="progress-rail" aria-label="Reading progress">
        <div className="progress-sticky">
          <span className="progress-eyebrow">Your edition</span>
          <strong>{readCount}<i>/</i>{items.length}</strong>
          <span className="progress-label">pieces read</span>
          <div className="progress-track" aria-hidden="true"><span style={{ "--progress": `${percent}%` } as React.CSSProperties} /></div>
          <span className="progress-time">{readMinutes} min complete</span>
        </div>
      </aside>

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
                    <div className="item-number" aria-hidden="true">{String(item.number).padStart(2, "0")}</div>
                    <div className="item-copy">
                      <div className="item-meta">
                        <span>{item.type}</span>
                        <span>{item.readingMinutes} min</span>
                      </div>
                      <h3><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a></h3>
                      <p className="byline">{item.author} <i>—</i> {item.publication} <i>—</i> {item.publishedAt}</p>
                      <p className="summary">{item.summary}</p>
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
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
