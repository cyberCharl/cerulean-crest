import type { Issue, IssueInput, IssueSummary } from "./schema.ts";
import { isIssueDate } from "./date.ts";

type DatabaseBackend = {
  createIssue(input: IssueInput): { issueId: number; created: boolean } | Promise<{ issueId: number; created: boolean }>;
  getIssue(date: string): Issue | null | Promise<Issue | null>;
  listIssues(): IssueSummary[] | Promise<IssueSummary[]>;
  latestIssueDate(): string | null | Promise<string | null>;
  neighboringIssues(date: string): { previous: string | null; next: string | null } | Promise<{ previous: string | null; next: string | null }>;
  replaceIssue(input: IssueInput): { issueId: number; created: boolean } | Promise<{ issueId: number; created: boolean }>;
};

let backendPromise: Promise<DatabaseBackend> | undefined;

function backend(): Promise<DatabaseBackend> {
  if (process.env.VERCEL && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required on Vercel; refusing to use non-durable SQLite storage");
  }
  backendPromise ??= process.env.DATABASE_URL
    ? import("./postgres-db")
    : import("./sqlite-db");
  return backendPromise;
}

export async function getIssue(date: string): Promise<Issue | null> {
  if (!isIssueDate(date)) return null;
  return (await backend()).getIssue(date);
}

export async function createIssue(input: IssueInput): Promise<{ issueId: number; created: boolean }> {
  return (await backend()).createIssue(input);
}

export async function listIssues(): Promise<IssueSummary[]> {
  return (await backend()).listIssues();
}

export async function latestIssueDate(): Promise<string | null> {
  return (await backend()).latestIssueDate();
}

export async function neighboringIssues(date: string): Promise<{ previous: string | null; next: string | null }> {
  if (!isIssueDate(date)) return { previous: null, next: null };
  return (await backend()).neighboringIssues(date);
}

export async function replaceIssue(input: IssueInput): Promise<{ issueId: number; created: boolean }> {
  return (await backend()).replaceIssue(input);
}
