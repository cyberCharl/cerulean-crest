import Link from "next/link";
import { longDate } from "@/lib/date";
import { listIssues } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Archive" };

export default function ArchivePage() {
  const issues = listIssues();
  return (
    <main className="archive-page">
      <header className="archive-header">
        <p className="edition-number">The reading room</p>
        <h1>Edition<br /><em>Archive</em></h1>
        <p>Past editions, kept as a record of what earned your attention.</p>
      </header>
      <div className="archive-list">
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
