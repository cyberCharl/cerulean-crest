import { neon } from "@neondatabase/serverless";
import type { Issue, IssueInput, IssueSummary } from "./schema";
import { seedIssue } from "./seed";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for the Postgres backend");

const sql = neon(connectionString);
const migrationSql = neon(process.env.DATABASE_URL_UNPOOLED ?? connectionString);
let initialization: Promise<void> | undefined;

type IssueRow = {
  id: number;
  issue_date: string;
  title: string;
  editor_note: string;
  coverage_gap: string | null;
  available_minutes: number;
  expected_minutes: number;
  created_at: string;
  updated_at: string;
};

async function replaceIssueInternal(input: IssueInput): Promise<{ issueId: number; created: boolean }> {
  const existingRows = await sql`SELECT id FROM issues WHERE issue_date = ${input.date}` as Array<{ id: number }>;
  const sectionPayload = input.sections.map((section, position) => ({ title: section.title, position }));
  const itemPayload = input.sections.flatMap((section, sectionPosition) =>
    section.items.map((item, position) => ({
      sectionPosition,
      position,
      ...item,
    })),
  );

  const results = await sql.transaction([
    sql`
      INSERT INTO issues (issue_date, title, editor_note, coverage_gap, available_minutes, expected_minutes)
      VALUES (${input.date}, ${input.title}, ${input.editorNote}, ${input.coverageGap ?? null}, ${input.availableMinutes}, ${input.expectedMinutes})
      ON CONFLICT (issue_date) DO UPDATE SET
        title = EXCLUDED.title,
        editor_note = EXCLUDED.editor_note,
        coverage_gap = EXCLUDED.coverage_gap,
        available_minutes = EXCLUDED.available_minutes,
        expected_minutes = EXCLUDED.expected_minutes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `,
    sql`DELETE FROM sections WHERE issue_id = (SELECT id FROM issues WHERE issue_date = ${input.date})`,
    sql.query(
      `
        INSERT INTO sections (issue_id, title, position)
        SELECT i.id, payload.title, payload.position
        FROM issues i
        CROSS JOIN jsonb_to_recordset($2::jsonb) AS payload(title text, position integer)
        WHERE i.issue_date = $1
      `,
      [input.date, JSON.stringify(sectionPayload)],
    ),
    sql.query(
      `
        INSERT INTO items (
          section_id, position, title, author, publication, published_at,
          reading_minutes, content_type, url, summary
        )
        SELECT
          s.id, payload.position, payload.title, payload.author, payload.publication,
          payload."publishedAt", payload."readingMinutes", payload.type, payload.url, payload.summary
        FROM jsonb_to_recordset($2::jsonb) AS payload(
          "sectionPosition" integer, position integer, title text, author text,
          publication text, "publishedAt" text, "readingMinutes" integer,
          type text, url text, summary text
        )
        JOIN issues i ON i.issue_date = $1
        JOIN sections s ON s.issue_id = i.id AND s.position = payload."sectionPosition"
      `,
      [input.date, JSON.stringify(itemPayload)],
    ),
  ]);

  const issueId = (results[0] as Array<{ id: number }>)[0].id;
  return { issueId, created: existingRows.length === 0 };
}

async function initialize(): Promise<void> {
  await migrationSql.transaction([
    migrationSql`
      CREATE TABLE IF NOT EXISTS issues (
        id SERIAL PRIMARY KEY,
        issue_date DATE NOT NULL UNIQUE,
        title TEXT NOT NULL,
        editor_note TEXT NOT NULL,
        coverage_gap TEXT,
        available_minutes INTEGER NOT NULL,
        expected_minutes INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,
    migrationSql`
      CREATE TABLE IF NOT EXISTS sections (
        id SERIAL PRIMARY KEY,
        issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        position INTEGER NOT NULL,
        UNIQUE(issue_id, position)
      )
    `,
    migrationSql`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
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
      )
    `,
    migrationSql`CREATE INDEX IF NOT EXISTS idx_sections_issue ON sections(issue_id, position)`,
    migrationSql`CREATE INDEX IF NOT EXISTS idx_items_section ON items(section_id, position)`,
  ]);

  const rows = await sql`SELECT COUNT(*)::integer AS count FROM issues` as Array<{ count: number }>;
  if (rows[0].count === 0) await replaceIssueInternal(seedIssue);
}

async function ready(): Promise<void> {
  initialization ??= initialize();
  return initialization;
}

export async function replaceIssue(input: IssueInput): Promise<{ issueId: number; created: boolean }> {
  await ready();
  return replaceIssueInternal(input);
}

export async function getIssue(date: string): Promise<Issue | null> {
  await ready();
  const issueRows = await sql.query(
    `
      SELECT
        id, issue_date::text AS issue_date, title, editor_note, coverage_gap,
        available_minutes, expected_minutes, created_at::text AS created_at,
        updated_at::text AS updated_at
      FROM issues
      WHERE issue_date = $1
    `,
    [date],
  ) as IssueRow[];
  const row = issueRows[0];
  if (!row) return null;

  const rows = await sql.query(
    `
      SELECT
        s.id AS section_id, s.title AS section_title, s.position AS section_position,
        it.id, it.position, it.title, it.author, it.publication, it.published_at,
        it.reading_minutes, it.content_type, it.url, it.summary
      FROM sections s
      LEFT JOIN items it ON it.section_id = s.id
      WHERE s.issue_id = $1
      ORDER BY s.position, it.position
    `,
    [row.id],
  ) as Array<Record<string, string | number | null>>;

  const sections = new Map<number, Issue["sections"][number]>();
  let number = 0;
  for (const item of rows) {
    const sectionId = Number(item.section_id);
    let section = sections.get(sectionId);
    if (!section) {
      section = { id: sectionId, title: String(item.section_title), items: [] };
      sections.set(sectionId, section);
    }
    if (item.id !== null) {
      section.items.push({
        id: Number(item.id),
        number: ++number,
        title: String(item.title),
        author: String(item.author),
        publication: String(item.publication),
        publishedAt: String(item.published_at),
        readingMinutes: Number(item.reading_minutes),
        type: String(item.content_type),
        url: String(item.url),
        summary: String(item.summary),
      });
    }
  }

  return {
    id: row.id,
    date: String(row.issue_date),
    title: row.title,
    editorNote: row.editor_note,
    coverageGap: row.coverage_gap,
    availableMinutes: row.available_minutes,
    expectedMinutes: row.expected_minutes,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    sections: [...sections.values()],
  };
}

export async function listIssues(): Promise<IssueSummary[]> {
  await ready();
  const rows = await sql`
    SELECT
      i.issue_date::text AS issue_date, i.title, i.available_minutes,
      i.expected_minutes, COUNT(it.id)::integer AS item_count
    FROM issues i
    LEFT JOIN sections s ON s.issue_id = i.id
    LEFT JOIN items it ON it.section_id = s.id
    GROUP BY i.id
    ORDER BY i.issue_date DESC
  ` as Array<Record<string, string | number>>;

  return rows.map((row) => ({
    date: String(row.issue_date),
    title: String(row.title),
    availableMinutes: Number(row.available_minutes),
    expectedMinutes: Number(row.expected_minutes),
    itemCount: Number(row.item_count),
  }));
}

export async function latestIssueDate(): Promise<string | null> {
  await ready();
  const rows = await sql`SELECT issue_date::text AS issue_date FROM issues ORDER BY issue_date DESC LIMIT 1` as Array<{ issue_date: string }>;
  return rows[0]?.issue_date ?? null;
}

export async function neighboringIssues(date: string): Promise<{ previous: string | null; next: string | null }> {
  await ready();
  const [previousRows, nextRows] = await Promise.all([
    sql`SELECT issue_date::text AS issue_date FROM issues WHERE issue_date < ${date} ORDER BY issue_date DESC LIMIT 1`,
    sql`SELECT issue_date::text AS issue_date FROM issues WHERE issue_date > ${date} ORDER BY issue_date ASC LIMIT 1`,
  ]) as [Array<{ issue_date: string }>, Array<{ issue_date: string }>];
  return { previous: previousRows[0]?.issue_date ?? null, next: nextRows[0]?.issue_date ?? null };
}
