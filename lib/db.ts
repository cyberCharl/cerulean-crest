import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { Issue, IssueInput, IssueSummary } from "./schema";
import { seedIssue } from "./seed";

const databasePath = process.env.DATABASE_PATH || path.join(process.cwd(), ".data", "cerulean-crest.db");
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath, { timeout: 5_000 });
db.pragma("busy_timeout = 5000");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_date TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    editor_note TEXT NOT NULL,
    coverage_gap TEXT,
    available_minutes INTEGER NOT NULL,
    expected_minutes INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER NOT NULL,
    UNIQUE(issue_id, position)
  );
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    publication TEXT NOT NULL,
    published_at TEXT NOT NULL,
    reading_minutes INTEGER NOT NULL,
    content_type TEXT NOT NULL,
    url TEXT NOT NULL,
    summary TEXT NOT NULL,
    UNIQUE(section_id, position)
  );
  CREATE INDEX IF NOT EXISTS idx_sections_issue ON sections(issue_id, position);
  CREATE INDEX IF NOT EXISTS idx_items_section ON items(section_id, position);
`);

const replaceIssueTransaction = db.transaction((input: IssueInput) => {
  const existing = db.prepare("SELECT id FROM issues WHERE issue_date = ?").get(input.date) as { id: number } | undefined;
  let issueId: number;

  if (existing) {
    issueId = existing.id;
    db.prepare(`UPDATE issues SET title = ?, editor_note = ?, coverage_gap = ?, available_minutes = ?, expected_minutes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(input.title, input.editorNote, input.coverageGap ?? null, input.availableMinutes, input.expectedMinutes, issueId);
    db.prepare("DELETE FROM sections WHERE issue_id = ?").run(issueId);
  } else {
    const result = db.prepare(`INSERT INTO issues (issue_date, title, editor_note, coverage_gap, available_minutes, expected_minutes) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(input.date, input.title, input.editorNote, input.coverageGap ?? null, input.availableMinutes, input.expectedMinutes);
    issueId = Number(result.lastInsertRowid);
  }

  const insertSection = db.prepare("INSERT INTO sections (issue_id, title, position) VALUES (?, ?, ?)");
  const insertItem = db.prepare(`INSERT INTO items (section_id, position, title, author, publication, published_at, reading_minutes, content_type, url, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  input.sections.forEach((section, sectionIndex) => {
    const sectionResult = insertSection.run(issueId, section.title, sectionIndex);
    const sectionId = Number(sectionResult.lastInsertRowid);
    section.items.forEach((item, itemIndex) => {
      insertItem.run(sectionId, itemIndex, item.title, item.author, item.publication, item.publishedAt, item.readingMinutes, item.type, item.url, item.summary);
    });
  });

  return { issueId, created: !existing };
});

export function replaceIssue(input: IssueInput): { issueId: number; created: boolean } {
  return replaceIssueTransaction(input);
}

if ((db.prepare("SELECT COUNT(*) AS count FROM issues").get() as { count: number }).count === 0) {
  replaceIssue(seedIssue);
}

type IssueRow = {
  id: number; issue_date: string; title: string; editor_note: string; coverage_gap: string | null;
  available_minutes: number; expected_minutes: number; created_at: string; updated_at: string;
};

export function getIssue(date: string): Issue | null {
  const row = db.prepare("SELECT * FROM issues WHERE issue_date = ?").get(date) as IssueRow | undefined;
  if (!row) return null;

  const sectionRows = db.prepare("SELECT id, title FROM sections WHERE issue_id = ? ORDER BY position").all(row.id) as Array<{ id: number; title: string }>;
  const itemQuery = db.prepare("SELECT id, title, author, publication, published_at, reading_minutes, content_type, url, summary FROM items WHERE section_id = ? ORDER BY position");
  let number = 0;

  return {
    id: row.id,
    date: row.issue_date,
    title: row.title,
    editorNote: row.editor_note,
    coverageGap: row.coverage_gap,
    availableMinutes: row.available_minutes,
    expectedMinutes: row.expected_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sections: sectionRows.map((section) => ({
      ...section,
      items: (itemQuery.all(section.id) as Array<Record<string, string | number>>).map((item) => ({
        id: item.id as number,
        number: ++number,
        title: item.title as string,
        author: item.author as string,
        publication: item.publication as string,
        publishedAt: item.published_at as string,
        readingMinutes: item.reading_minutes as number,
        type: item.content_type as string,
        url: item.url as string,
        summary: item.summary as string,
      })),
    })),
  };
}

export function listIssues(): IssueSummary[] {
  return (db.prepare(`
    SELECT i.issue_date, i.title, i.available_minutes, i.expected_minutes, COUNT(it.id) AS item_count
    FROM issues i
    LEFT JOIN sections s ON s.issue_id = i.id
    LEFT JOIN items it ON it.section_id = s.id
    GROUP BY i.id
    ORDER BY i.issue_date DESC
  `).all() as Array<Record<string, string | number>>).map((row) => ({
    date: row.issue_date as string,
    title: row.title as string,
    availableMinutes: row.available_minutes as number,
    expectedMinutes: row.expected_minutes as number,
    itemCount: row.item_count as number,
  }));
}

export function latestIssueDate(): string | null {
  const row = db.prepare("SELECT issue_date FROM issues ORDER BY issue_date DESC LIMIT 1").get() as { issue_date: string } | undefined;
  return row?.issue_date ?? null;
}

export function neighboringIssues(date: string): { previous: string | null; next: string | null } {
  const previous = db.prepare("SELECT issue_date FROM issues WHERE issue_date < ? ORDER BY issue_date DESC LIMIT 1").get(date) as { issue_date: string } | undefined;
  const next = db.prepare("SELECT issue_date FROM issues WHERE issue_date > ? ORDER BY issue_date ASC LIMIT 1").get(date) as { issue_date: string } | undefined;
  return { previous: previous?.issue_date ?? null, next: next?.issue_date ?? null };
}
