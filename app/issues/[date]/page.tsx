import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IssueContent } from "@/components/issue-content";
import { longDate, weekday } from "@/lib/date";
import { getIssue, neighboringIssues } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date } = await params;
  const issue = await getIssue(date);
  return issue
    ? { title: longDate(issue.date), description: issue.editorNote }
    : { title: "Issue not found" };
}

export default async function IssuePage({ params }: PageProps) {
  const { date } = await params;
  const issue = await getIssue(date);
  if (!issue) notFound();

  const neighbors = await neighboringIssues(date);
  const itemCount = issue.sections.reduce((sum, section) => sum + section.items.length, 0);

  return (
    <main>
      <article>
        <header className="issue-hero">
          <div className="issue-kicker"><span>Personal daily edition</span><i /></div>
          <div className="issue-title-grid">
            <div>
              <p className="edition-number">Edition / {issue.date.replaceAll("-", ".")}</p>
              <h1>Cerulean<br /><em>Crest</em></h1>
            </div>
            <div className="issue-date-block">
              <span>{weekday(issue.date)}</span>
              <strong>{longDate(issue.date)}</strong>
              <p>{itemCount} pieces <i>·</i> {issue.availableMinutes} minutes</p>
            </div>
          </div>
          <div className="editor-note">
            <div className="note-label"><span>From the desk</span></div>
            <p>{issue.editorNote}</p>
            <dl>
              <div><dt>Available</dt><dd>~{issue.availableMinutes} min</dd></div>
              <div><dt>Expected</dt><dd>~{issue.expectedMinutes} min</dd></div>
              <div><dt>Completion</dt><dd>50% target</dd></div>
            </dl>
          </div>
          {issue.coverageGap ? (
            <details className="coverage-note">
              <summary>Coverage note</summary>
              <p>{issue.coverageGap}</p>
            </details>
          ) : null}
        </header>

        <IssueContent issue={issue} />

        <nav className="issue-navigation" aria-label="Issue navigation">
          {neighbors.previous ? <Link href={`/issues/${neighbors.previous}`}>← {longDate(neighbors.previous)}</Link> : <span />}
          <Link href="/archive">All editions</Link>
          {neighbors.next ? <Link href={`/issues/${neighbors.next}`}>{longDate(neighbors.next)} →</Link> : <span />}
        </nav>
      </article>
    </main>
  );
}
