import { requireUser } from "@/lib/browser-auth";
import Link from "next/link";
import { longDate } from "@/lib/date";
import { listIssues } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Archive", robots: { index: false, follow: false } };

export default async function ArchivePage() {
  const user = await requireUser();
  const issues = await listIssues(user.subject);
  return (
    <main className="archive-page">
      <header className="archive-header">
        <p className="edition-number">The reading room</p>
        <h1>Edition<br /><em>Archive</em></h1>
        <p>Past editions, kept as a record of what earned your attention.</p>
      </header>
      <div className="archive-list">
        {issues.length === 0 ? <div>
          <p>Your first edition has not been published yet.</p>
          <p><Link href="/onboarding">Set up your first edition</Link>: choose your reading rhythm and interests, then connect your ChatGPT curator.</p>
        </div> : null}
        {issues.map((issue, index) => (
          <Link className="archive-entry" href={`/issues/${issue.date}`} key={issue.date}>
            <span className="archive-index">{String(issues.length - index).padStart(3, "0")}</span>
            <strong>{longDate(issue.date)}</strong>
            <span>{issue.itemCount} pieces</span>
            <span>{issue.expectedMinutes} min expected</span>
            <i aria-hidden="true">↗</i>
          </Link>
        ))}
      </div>
    </main>
  );
}
