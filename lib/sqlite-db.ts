import { articleFeedbackUpdateSchema, articleFeedbackListSchema, articleUrlSchema, articleFeedbackFromRow, ArticleNotFoundError, type ArticleFeedbackRow, type ArticleFeedbackUpdate, type ArticleFeedbackListOptions } from "./article-feedback.ts";
import { editorialSettingsSchema, defaultSettings, type EditorialSettings } from "./editorial-settings.ts";
import { requireOwner } from "./ownership.ts";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { Issue, IssueInput, IssueSummary } from "./schema.ts";
import { seedIssue } from "./seed.ts";
import { isIssueDate } from "./date.ts";
import { sqliteSchema } from "./sqlite-schema.ts";

const databasePath = process.env.DATABASE_PATH || path.join(process.cwd(), ".data", "cerulean-crest.db");
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath, { timeout: 5_000 });
db.pragma("busy_timeout = 5000");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(sqliteSchema);

// Rebuild the original globally-unique date table without losing IDs or children.
if (!(db.prepare("PRAGMA table_info(issues)").all() as Array<{name: string}>).some(column => column.name === "owner_subject")) {
  db.pragma("foreign_keys = OFF");
  db.transaction(() => {
    db.exec(`CREATE TABLE issues_owned (
      id INTEGER PRIMARY KEY AUTOINCREMENT, owner_subject TEXT, issue_date TEXT NOT NULL,
      title TEXT NOT NULL, editor_note TEXT NOT NULL, coverage_gap TEXT,
      available_minutes INTEGER NOT NULL, expected_minutes INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(owner_subject, issue_date));
      INSERT INTO issues_owned SELECT id, NULL, issue_date, title, editor_note, coverage_gap, available_minutes, expected_minutes, created_at, updated_at FROM issues;
      DROP TABLE issues;
      ALTER TABLE issues_owned RENAME TO issues;`);
  })();
  db.pragma("foreign_keys = ON");
}
// Unassigned legacy editions stay inaccessible unless an operator specifies their owner.
if (process.env.CERULEAN_OWNER_SUBJECT) db.prepare("UPDATE issues SET owner_subject = ? WHERE owner_subject IS NULL").run(process.env.CERULEAN_OWNER_SUBJECT);

const replaceIssueTransaction = db.transaction((owner: string, input: IssueInput) => {
  const existing = db.prepare("SELECT id FROM issues WHERE owner_subject = ? AND issue_date = ?").get(owner, input.date) as { id: number } | undefined;
  let issueId: number;

  if (existing) {
    issueId = existing.id;
    db.prepare(`UPDATE issues SET title = ?, editor_note = ?, coverage_gap = ?, available_minutes = ?, expected_minutes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(input.title, input.editorNote, input.coverageGap ?? null, input.availableMinutes, input.expectedMinutes, issueId);
    db.prepare("DELETE FROM sections WHERE issue_id = ?").run(issueId);
  } else {
    const result = db.prepare(`INSERT INTO issues (owner_subject, issue_date, title, editor_note, coverage_gap, available_minutes, expected_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(owner, input.date, input.title, input.editorNote, input.coverageGap ?? null, input.availableMinutes, input.expectedMinutes);
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

const createIssueTransaction = db.transaction((owner: string, input: IssueInput) => {
  const existing = db.prepare("SELECT id FROM issues WHERE owner_subject = ? AND issue_date = ?").get(owner, input.date) as { id: number } | undefined;
  if (existing) return { issueId: existing.id, created: false };

  const result = db.prepare(`INSERT INTO issues (owner_subject, issue_date, title, editor_note, coverage_gap, available_minutes, expected_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(owner, input.date, input.title, input.editorNote, input.coverageGap ?? null, input.availableMinutes, input.expectedMinutes);
  const issueId = Number(result.lastInsertRowid);
  const insertSection = db.prepare("INSERT INTO sections (issue_id, title, position) VALUES (?, ?, ?)");
  const insertItem = db.prepare(`INSERT INTO items (section_id, position, title, author, publication, published_at, reading_minutes, content_type, url, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  input.sections.forEach((section, sectionIndex) => {
    const sectionResult = insertSection.run(issueId, section.title, sectionIndex);
    const sectionId = Number(sectionResult.lastInsertRowid);
    section.items.forEach((item, itemIndex) => {
      insertItem.run(sectionId, itemIndex, item.title, item.author, item.publication, item.publishedAt, item.readingMinutes, item.type, item.url, item.summary);
    });
  });

  return { issueId, created: true };
});

export function replaceIssue(owner: string, input: IssueInput): { issueId: number; created: boolean } {
  return replaceIssueTransaction(requireOwner(owner), input);
}

export function createIssue(owner: string, input: IssueInput): { issueId: number; created: boolean } {
  return createIssueTransaction(requireOwner(owner), input);
}

if (process.env.SEED_DEMO === "true" && (db.prepare("SELECT COUNT(*) AS count FROM issues").get() as { count: number }).count === 0) {
  replaceIssue(process.env.CERULEAN_OWNER_SUBJECT || "demo", seedIssue);
}

type IssueRow = {
  id: number; issue_date: string; title: string; editor_note: string; coverage_gap: string | null;
  available_minutes: number; expected_minutes: number; created_at: string; updated_at: string;
};

export function getIssue(owner: string, date: string): Issue | null {
  if (!isIssueDate(date)) return null;
  const row = db.prepare("SELECT * FROM issues WHERE owner_subject = ? AND issue_date = ?").get(requireOwner(owner), date) as IssueRow | undefined;
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

export function listIssues(owner: string): IssueSummary[] {
  return (db.prepare(`
    SELECT i.issue_date, i.title, i.available_minutes, i.expected_minutes, COUNT(it.id) AS item_count
    FROM issues i
    LEFT JOIN sections s ON s.issue_id = i.id
    LEFT JOIN items it ON it.section_id = s.id
    WHERE i.owner_subject = ?
    GROUP BY i.id
    ORDER BY i.issue_date DESC
  `).all(requireOwner(owner)) as Array<Record<string, string | number>>).map((row) => ({
    date: row.issue_date as string,
    title: row.title as string,
    availableMinutes: row.available_minutes as number,
    expectedMinutes: row.expected_minutes as number,
    itemCount: row.item_count as number,
  }));
}

export function latestIssueDate(owner: string): string | null {
  const row = db.prepare("SELECT issue_date FROM issues WHERE owner_subject = ? ORDER BY issue_date DESC LIMIT 1").get(requireOwner(owner)) as { issue_date: string } | undefined;
  return row?.issue_date ?? null;
}

export function neighboringIssues(owner: string, date: string): { previous: string | null; next: string | null } {
  const previous = db.prepare("SELECT issue_date FROM issues WHERE owner_subject = ? AND issue_date < ? ORDER BY issue_date DESC LIMIT 1").get(requireOwner(owner), date) as { issue_date: string } | undefined;
  const next = db.prepare("SELECT issue_date FROM issues WHERE owner_subject = ? AND issue_date > ? ORDER BY issue_date ASC LIMIT 1").get(requireOwner(owner), date) as { issue_date: string } | undefined;
  return { previous: previous?.issue_date ?? null, next: next?.issue_date ?? null };
}

export function getSettings(owner: string): unknown {
  const row = db.prepare("SELECT settings FROM editorial_settings WHERE owner_subject = ?").get(requireOwner(owner)) as {settings: string} | undefined;
  return row ? JSON.parse(row.settings) : null;
}
export function saveSettings(owner: string, settings: unknown): void {
  db.prepare("INSERT INTO editorial_settings(owner_subject, settings) VALUES (?, ?) ON CONFLICT(owner_subject) DO UPDATE SET settings = excluded.settings").run(requireOwner(owner), JSON.stringify(settings));
}

export function getArticleFeedback(owner: string, url: string) {
  const row = db.prepare("SELECT * FROM article_feedback WHERE owner_subject = ? AND url = ?")
    .get(requireOwner(owner), articleUrlSchema.parse(url)) as ArticleFeedbackRow | undefined;
  return row ? articleFeedbackFromRow(row) : null;
}
export function listArticleFeedback(owner: string, options: ArticleFeedbackListOptions = {}) {
  owner = requireOwner(owner);
  options = articleFeedbackListSchema.parse(options);
  if (options.urls?.length === 0) return [];
  const clauses = ["owner_subject = ?"];
  const params: Array<string | number> = [owner];
  if (options.savedOnly) clauses.push("saved = 1");
  if (options.feedbackOnly) clauses.push("(reaction IS NOT NULL OR note <> '')");
  if (options.urls) { clauses.push(`url IN (${options.urls.map(() => "?").join(",")})`); params.push(...options.urls); }
  if (options.limit) params.push(options.limit);
  return (db.prepare(`SELECT * FROM article_feedback WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC, url ${options.limit ? "LIMIT ?" : ""}`)
    .all(...params) as ArticleFeedbackRow[]).map(articleFeedbackFromRow);
}
const updateArticleFeedbackTransaction = db.transaction((owner: string, input: ArticleFeedbackUpdate) => {
  const existing = getArticleFeedback(owner, input.url);
  const article = existing ?? db.prepare(`SELECT it.title, it.publication FROM items it
    JOIN sections s ON s.id = it.section_id JOIN issues i ON i.id = s.issue_id
    WHERE i.owner_subject = ? AND it.url = ? ORDER BY i.issue_date DESC, it.id DESC LIMIT 1`)
    .get(owner, input.url) as { title: string; publication: string } | undefined;
  if (!article) throw new ArticleNotFoundError();
  const updatedAt = new Date().toISOString();
  db.prepare(`INSERT INTO article_feedback(owner_subject, url, title, publication, saved, reaction, note, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(owner_subject, url) DO UPDATE SET
    saved = excluded.saved, reaction = excluded.reaction, note = excluded.note, updated_at = excluded.updated_at`)
    .run(owner, input.url, article.title, article.publication, Number(input.saved ?? existing?.saved ?? false),
      input.reaction !== undefined ? input.reaction : existing?.reaction ?? null, input.note ?? existing?.note ?? "", updatedAt);
  return getArticleFeedback(owner, input.url)!;
});
export function updateArticleFeedback(owner: string, input: ArticleFeedbackUpdate) {
  return updateArticleFeedbackTransaction.immediate(requireOwner(owner), articleFeedbackUpdateSchema.parse(input));
}
const patchSettingsTransaction = db.transaction((owner: string, patch: Partial<EditorialSettings>) => {
  const settings = editorialSettingsSchema.parse({ ...defaultSettings, ...(getSettings(owner) as object | null), ...patch });
  saveSettings(owner, settings);
  return settings;
});
export function patchSettings(owner: string, patch: Partial<EditorialSettings>): EditorialSettings {
  const parsed = editorialSettingsSchema.partial().strict().parse(patch);
  const defined = Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined));
  return patchSettingsTransaction.immediate(requireOwner(owner), defined);
}
