"use client";

import { useEffect, useMemo, useState } from "react";
import type { Issue } from "@/lib/schema";

function storageKey(date: string) {
  return `cerulean-crest:${date}:read`;
}

export function IssueContent({ issue }: { issue: Issue }) {
  const [readItems, setReadItems] = useState<Set<number>>(() => new Set());
  const items = useMemo(() => issue.sections.flatMap((section) => section.items), [issue.sections]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey(issue.date)) || "[]") as number[];
      setReadItems(new Set(stored));
    } catch {
      setReadItems(new Set());
    }
  }, [issue.date]);

  function toggleRead(id: number) {
    setReadItems((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(storageKey(issue.date), JSON.stringify([...next]));
      return next;
    });
  }

  const readMinutes = items.reduce((total, item) => total + (readItems.has(item.id) ? item.readingMinutes : 0), 0);
  const percent = items.length === 0 ? 0 : Math.round((readItems.size / items.length) * 100);

  return (
    <div className="issue-body">
      <aside className="progress-rail" aria-label="Reading progress">
        <div className="progress-sticky">
          <span className="progress-eyebrow">Your edition</span>
          <strong>{readItems.size}<i>/</i>{items.length}</strong>
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
                const isRead = readItems.has(item.id);
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
                          onClick={() => toggleRead(item.id)}
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
