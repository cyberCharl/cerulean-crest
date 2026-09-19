import { requireUser } from "@/lib/browser-auth";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IssueContent } from "@/components/issue-content";
import { longDate, weekday, todayDate } from "@/lib/date";
import { getIssue, neighboringIssues, latestIssueDate, getSettings, listArticleFeedback } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const user = await requireUser();
  const { date } = await params;
  const issue = await getIssue(user.subject, date);
  return issue
    ? { title: longDate(issue.date), robots: { index: false, follow: false } }
    : { title: "Issue not found" };
}

export default async function IssuePage({ params }: PageProps) {
  const user = await requireUser();
  const { date } = await params;
  const issue = await getIssue(user.subject, date);
  if (!issue) notFound();

  const [neighbors, latest, settings, articleFeedback] = await Promise.all([
    neighboringIssues(user.subject, date), latestIssueDate(user.subject), getSettings(user.subject),
    listArticleFeedback(user.subject, { urls: issue.sections.flatMap((section) => section.items.map((item) => item.url)) }),
  ]);
  const isLatestAvailable = date === latest && date < todayDate(settings.timeZone);
  const itemCount = issue.sections.reduce((sum, section) => sum + section.items.length, 0);
  const [dayOfMonth, month, year] = longDate(issue.date).split(" ");

  return (
    <main>
      <article>
        <header className="issue-hero">
          {isLatestAvailable ? <p className="edition-notice" role="status">Today’s edition has not arrived yet. This is the latest available edition.</p> : null}
          <div className="issue-cover">
            <p className="issue-day">{weekday(issue.date)}</p>
            <h1 className="issue-date" aria-label={longDate(issue.date)}>
              <span className="issue-date-main">
                <b>{dayOfMonth}</b><em>{month}</em>
              </span>
              <span className="issue-date-year">{year}</span>
            </h1>
            <p className="issue-metrics">
              <span>{itemCount} pieces</span>
              <span>{issue.availableMinutes} minutes</span>
            </p>
          </div>
          <div className="editor-note">
            <p>{issue.editorNote}</p>
          </div>
          {issue.coverageGap ? (
            <details className="coverage-note">
              <summary>Coverage note</summary>
              <p>{issue.coverageGap}</p>
            </details>
          ) : null}
        </header>

        <IssueContent key={`${user.subject}:${issue.date}`} issue={issue} articleFeedback={articleFeedback} owner={user.subject} canImportLegacyProgress={user.subject === process.env.CERULEAN_OWNER_SUBJECT} />

        <nav className="issue-navigation" aria-label="Issue navigation">
          {neighbors.previous ? <Link href={`/issues/${neighbors.previous}`}>← {longDate(neighbors.previous)}</Link> : <span />}
          <Link href="/archive">All editions</Link>
          {neighbors.next ? <Link href={`/issues/${neighbors.next}`}>{longDate(neighbors.next)} →</Link> : <span />}
        </nav>
      </article>
    </main>
  );
}
