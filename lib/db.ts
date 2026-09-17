import { requireOwner } from "./ownership.ts";
import { editorialSettingsSchema, defaultSettings, type EditorialSettings } from "./editorial-settings.ts";
import type { Issue, IssueInput, IssueSummary } from "./schema.ts";
import { isIssueDate } from "./date.ts";

type DatabaseBackend = {
  getSettings(owner: string): unknown | Promise<unknown>;
  saveSettings(owner: string, settings: unknown): void | Promise<void>;
  createIssue(owner: string, input: IssueInput): { issueId: number; created: boolean } | Promise<{ issueId: number; created: boolean }>;
  getIssue(owner: string, date: string): Issue | null | Promise<Issue | null>;
  listIssues(owner: string): IssueSummary[] | Promise<IssueSummary[]>;
  latestIssueDate(owner: string): string | null | Promise<string | null>;
  neighboringIssues(owner: string, date: string): { previous: string | null; next: string | null } | Promise<{ previous: string | null; next: string | null }>;
  replaceIssue(owner: string, input: IssueInput): { issueId: number; created: boolean } | Promise<{ issueId: number; created: boolean }>;
};

let backendPromise: Promise<DatabaseBackend> | undefined;

function backend(): Promise<DatabaseBackend> {
  if (process.env.VERCEL && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required on Vercel; refusing to use non-durable SQLite storage");
  }
  backendPromise ??= process.env.DATABASE_URL
    ? import("./postgres-db.ts")
    : import("./sqlite-db.ts");
  return backendPromise;
}

export async function getIssue(owner: string, date: string): Promise<Issue | null> {
  if (!isIssueDate(date)) return null;
  return (await backend()).getIssue(requireOwner(owner), date);
}

export async function createIssue(owner: string, input: IssueInput): Promise<{ issueId: number; created: boolean }> {
  return (await backend()).createIssue(requireOwner(owner), input);
}

export async function listIssues(owner: string): Promise<IssueSummary[]> {
  return (await backend()).listIssues(requireOwner(owner));
}

export async function latestIssueDate(owner: string): Promise<string | null> {
  return (await backend()).latestIssueDate(requireOwner(owner));
}

export async function neighboringIssues(owner: string, date: string): Promise<{ previous: string | null; next: string | null }> {
  if (!isIssueDate(date)) return { previous: null, next: null };
  return (await backend()).neighboringIssues(requireOwner(owner), date);
}

export async function replaceIssue(owner: string, input: IssueInput): Promise<{ issueId: number; created: boolean }> {
  return (await backend()).replaceIssue(requireOwner(owner), input);
}

export async function getSettings(owner: string): Promise<EditorialSettings> {
  return (await getSettingsState(owner)).settings;
}
export async function getSettingsState(owner: string) {
  const stored = await (await backend()).getSettings(requireOwner(owner));
  return { saved: Boolean(stored), settings: stored ? editorialSettingsSchema.parse(stored) : { ...defaultSettings } };
}
export async function saveSettings(owner: string, settings: EditorialSettings): Promise<void> {
  await (await backend()).saveSettings(requireOwner(owner), editorialSettingsSchema.parse(settings));
}
