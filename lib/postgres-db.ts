import { articleFeedbackUpdateSchema, articleFeedbackListSchema, articleUrlSchema, articleFeedbackFromRow, ArticleNotFoundError, type ArticleFeedbackRow, type ArticleFeedbackUpdate, type ArticleFeedbackListOptions } from "./article-feedback.ts";
import { editorialSettingsSchema, defaultSettings, type EditorialSettings } from "./editorial-settings.ts";
import { requireOwner } from "./ownership.ts";
import { neon } from "@neondatabase/serverless";
import type { Issue, IssueInput, IssueSummary } from "./schema.ts";
import { isIssueDate } from "./date.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for the Postgres backend");

const sql = neon(connectionString);

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

async function replaceIssueInternal(owner: string, input: IssueInput): Promise<{ issueId: number; created: boolean }> {
  const existingRows = await sql`SELECT id FROM issues WHERE owner_subject = ${owner} AND issue_date = ${input.date}` as Array<{ id: number }>;
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
      INSERT INTO issues (owner_subject, issue_date, title, editor_note, coverage_gap, available_minutes, expected_minutes)
      VALUES (${owner}, ${input.date}, ${input.title}, ${input.editorNote}, ${input.coverageGap ?? null}, ${input.availableMinutes}, ${input.expectedMinutes})
      ON CONFLICT (owner_subject, issue_date) DO UPDATE SET
        title = EXCLUDED.title,
        editor_note = EXCLUDED.editor_note,
        coverage_gap = EXCLUDED.coverage_gap,
        available_minutes = EXCLUDED.available_minutes,
        expected_minutes = EXCLUDED.expected_minutes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `,
    sql`DELETE FROM sections WHERE issue_id = (SELECT id FROM issues WHERE owner_subject = ${owner} AND issue_date = ${input.date})`,
    sql.query(
      `
        INSERT INTO sections (issue_id, title, position)
        SELECT i.id, payload.title, payload.position
        FROM issues i
        CROSS JOIN jsonb_to_recordset($2::jsonb) AS payload(title text, position integer)
        WHERE i.owner_subject = $3 AND i.issue_date = $1
      `,
      [input.date, JSON.stringify(sectionPayload), owner],
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
        JOIN issues i ON i.owner_subject = $3 AND i.issue_date = $1
        JOIN sections s ON s.issue_id = i.id AND s.position = payload."sectionPosition"
      `,
      [input.date, JSON.stringify(itemPayload), owner],
    ),
  ]);

  const issueId = (results[0] as Array<{ id: number }>)[0].id;
  return { issueId, created: existingRows.length === 0 };
}

async function createIssueInternal(owner: string, input: IssueInput): Promise<{ issueId: number; created: boolean }> {
  const sectionPayload = input.sections.map((section, position) => ({ title: section.title, position }));
  const itemPayload = input.sections.flatMap((section, sectionPosition) =>
    section.items.map((item, position) => ({ sectionPosition, position, ...item })),
  );

  const rows = await sql.query(
    `
      WITH new_issue AS (
        INSERT INTO issues (owner_subject, issue_date, title, editor_note, coverage_gap, available_minutes, expected_minutes)
        VALUES ($9, $1, $2, $3, $4, $5, $6)
        ON CONFLICT (owner_subject, issue_date) DO NOTHING
        RETURNING id
      ),
      inserted_sections AS (
        INSERT INTO sections (issue_id, title, position)
        SELECT new_issue.id, payload.title, payload.position
        FROM new_issue
        CROSS JOIN jsonb_to_recordset($7::jsonb) AS payload(title text, position integer)
        RETURNING id, position
      ),
      inserted_items AS (
        INSERT INTO items (
          section_id, position, title, author, publication, published_at,
          reading_minutes, content_type, url, summary
        )
        SELECT
          section.id, payload.position, payload.title, payload.author, payload.publication,
          payload."publishedAt", payload."readingMinutes", payload.type, payload.url, payload.summary
        FROM jsonb_to_recordset($8::jsonb) AS payload(
          "sectionPosition" integer, position integer, title text, author text,
          publication text, "publishedAt" text, "readingMinutes" integer,
          type text, url text, summary text
        )
        JOIN inserted_sections section ON section.position = payload."sectionPosition"
        RETURNING id
      )
      SELECT id, true AS created FROM new_issue
      UNION ALL
      SELECT id, false AS created
      FROM issues
      WHERE owner_subject = $9 AND issue_date = $1 AND NOT EXISTS (SELECT 1 FROM new_issue)
      LIMIT 1
    `,
    [
      input.date,
      input.title,
      input.editorNote,
      input.coverageGap ?? null,
      input.availableMinutes,
      input.expectedMinutes,
      JSON.stringify(sectionPayload),
      JSON.stringify(itemPayload),
      owner,
    ],
  ) as Array<{ id: number; created: boolean }>;

  // A concurrent insert can win ON CONFLICT without being visible to the
  // statement's snapshot. A separate query sees the now-committed edition.
  const row = rows[0] ?? (await sql`SELECT id, false AS created FROM issues WHERE owner_subject = ${owner} AND issue_date = ${input.date}` as Array<{ id: number; created: boolean }>)[0];
  if (!row) throw new Error("Could not create or locate issue");
  return { issueId: Number(row.id), created: Boolean(row.created) };
}

export async function replaceIssue(owner: string, input: IssueInput): Promise<{ issueId: number; created: boolean }> {
  return replaceIssueInternal(requireOwner(owner), input);
}

export async function createIssue(owner: string, input: IssueInput): Promise<{ issueId: number; created: boolean }> {
  return createIssueInternal(requireOwner(owner), input);
}

export async function getIssue(owner: string, date: string): Promise<Issue | null> {
  if (!isIssueDate(date)) return null;
  const issueRows = await sql.query(
    `
      SELECT
        id, issue_date::text AS issue_date, title, editor_note, coverage_gap,
        available_minutes, expected_minutes, created_at::text AS created_at,
        updated_at::text AS updated_at
      FROM issues
      WHERE owner_subject = $2 AND issue_date = $1
    `,
    [date, requireOwner(owner)],
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

export async function listIssues(owner: string): Promise<IssueSummary[]> {
  const rows = await sql`
    SELECT
      i.issue_date::text AS issue_date, i.title, i.available_minutes,
      i.expected_minutes, COUNT(it.id)::integer AS item_count
    FROM issues i
    LEFT JOIN sections s ON s.issue_id = i.id
    LEFT JOIN items it ON it.section_id = s.id
    WHERE i.owner_subject = ${requireOwner(owner)}
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

export async function latestIssueDate(owner: string): Promise<string | null> {
  const rows = await sql`SELECT issue_date::text AS issue_date FROM issues WHERE owner_subject = ${requireOwner(owner)} ORDER BY issue_date DESC LIMIT 1` as Array<{ issue_date: string }>;
  return rows[0]?.issue_date ?? null;
}

export async function neighboringIssues(owner: string, date: string): Promise<{ previous: string | null; next: string | null }> {
  const [previousRows, nextRows] = await Promise.all([
    sql`SELECT issue_date::text AS issue_date FROM issues WHERE owner_subject = ${requireOwner(owner)} AND issue_date < ${date} ORDER BY issue_date DESC LIMIT 1`,
    sql`SELECT issue_date::text AS issue_date FROM issues WHERE owner_subject = ${requireOwner(owner)} AND issue_date > ${date} ORDER BY issue_date ASC LIMIT 1`,
  ]) as [Array<{ issue_date: string }>, Array<{ issue_date: string }>];
  return { previous: previousRows[0]?.issue_date ?? null, next: nextRows[0]?.issue_date ?? null };
}

export async function getSettings(owner: string): Promise<unknown> {
  const rows = await sql`SELECT settings FROM editorial_settings WHERE owner_subject = ${requireOwner(owner)}`;
  return rows[0]?.settings ?? null;
}
export async function saveSettings(owner: string, settings: unknown): Promise<void> {
  await sql`INSERT INTO editorial_settings(owner_subject, settings) VALUES (${requireOwner(owner)}, ${JSON.stringify(settings)}::jsonb) ON CONFLICT(owner_subject) DO UPDATE SET settings = excluded.settings`;
}

export async function getArticleFeedback(owner: string, url: string) {
  const rows = await sql`SELECT url, title, publication, saved, reaction, note, updated_at::text AS updated_at
    FROM article_feedback WHERE owner_subject = ${requireOwner(owner)} AND url = ${articleUrlSchema.parse(url)}` as ArticleFeedbackRow[];
  return rows[0] ? articleFeedbackFromRow(rows[0]) : null;
}
export async function listArticleFeedback(owner: string, options: ArticleFeedbackListOptions = {}) {
  owner = requireOwner(owner);
  options = articleFeedbackListSchema.parse(options);
  const rows = await sql`SELECT url, title, publication, saved, reaction, note, updated_at::text AS updated_at
    FROM article_feedback WHERE owner_subject = ${owner}
    AND (${!options.savedOnly} OR saved)
    AND (${!options.feedbackOnly} OR reaction IS NOT NULL OR note <> '')
    AND (${options.urls === undefined} OR url IN (SELECT jsonb_array_elements_text(${JSON.stringify(options.urls ?? [])}::jsonb)))
    ORDER BY updated_at DESC, url LIMIT ${options.limit ?? null}` as ArticleFeedbackRow[];
  return rows.map(articleFeedbackFromRow);
}
export async function updateArticleFeedback(owner: string, input: ArticleFeedbackUpdate) {
  owner = requireOwner(owner);
  input = articleFeedbackUpdateSchema.parse(input);
  // Source metadata is always obtained within this owner's editions/feedback.
  // Field-specific conflict updates merge concurrent saves and editorial notes.
  const rows = await sql`WITH source_article AS (
    SELECT title, publication, 0 AS priority FROM article_feedback WHERE owner_subject = ${owner} AND url = ${input.url}
    UNION ALL
    SELECT it.title, it.publication, 1 AS priority FROM items it
    JOIN sections s ON s.id = it.section_id JOIN issues i ON i.id = s.issue_id
    WHERE i.owner_subject = ${owner} AND it.url = ${input.url}
  ) INSERT INTO article_feedback(owner_subject, url, title, publication, saved, reaction, note)
    SELECT ${owner}, ${input.url}, title, publication, ${input.saved ?? false}, ${input.reaction ?? null}, ${input.note ?? ""}
    FROM source_article ORDER BY priority, title, publication LIMIT 1
    ON CONFLICT(owner_subject, url) DO UPDATE SET
      saved = CASE WHEN ${input.saved !== undefined} THEN excluded.saved ELSE article_feedback.saved END,
      reaction = CASE WHEN ${input.reaction !== undefined} THEN excluded.reaction ELSE article_feedback.reaction END,
      note = CASE WHEN ${input.note !== undefined} THEN excluded.note ELSE article_feedback.note END,
      updated_at = CURRENT_TIMESTAMP
    RETURNING url, title, publication, saved, reaction, note, updated_at::text AS updated_at` as ArticleFeedbackRow[];
  if (!rows[0]) throw new ArticleNotFoundError();
  return articleFeedbackFromRow(rows[0]);
}
export async function patchSettings(owner: string, patch: Partial<EditorialSettings>): Promise<EditorialSettings> {
  owner = requireOwner(owner);
  const parsed = editorialSettingsSchema.partial().strict().parse(patch);
  const initial = editorialSettingsSchema.parse({ ...defaultSettings, ...JSON.parse(JSON.stringify(parsed)) });
  const rows = await sql`INSERT INTO editorial_settings(owner_subject, settings)
    VALUES (${owner}, ${JSON.stringify(initial)}::jsonb)
    ON CONFLICT(owner_subject) DO UPDATE SET settings = ${JSON.stringify(defaultSettings)}::jsonb || editorial_settings.settings || ${JSON.stringify(parsed)}::jsonb
    RETURNING settings`;
  return editorialSettingsSchema.parse(rows[0].settings);
}
