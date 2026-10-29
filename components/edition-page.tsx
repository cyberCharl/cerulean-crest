import { getSocialProfile } from "@/lib/social-store";
import { requireUser } from "@/lib/browser-auth";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IssueContent } from "@/components/issue-content";
import { longDate } from "@/lib/date";
import { listArticleFeedback } from "@/lib/db";
import { getReadingEdition } from "@/lib/reading-store";
import styles from "@/components/reading.module.css";

type PageProps = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await requireUser();
  const { date } = await params;
  return { title: `Your paper · ${date}`, robots: { index: false, follow: false } };
}

export async function EditionPage({ params }: PageProps) {
  const user = await requireUser();
  const { date } = await params;
  const edition = await getReadingEdition(user.subject, date);
  if (!edition) notFound();

  if (edition.retired) return <main className={styles.page}>
    <header className={styles.masthead}>
      <p className={styles.eyebrow}>{longDate(date)}</p>
      <h1>This edition has retired.</h1>
      <p>The paper moves on. Its links stay in your collection.</p>
    </header>
    <div className={styles.retiredLinks}><Link className={styles.primary} href="/latest">Open your paper →</Link><Link href="/links">Find a link in your collection</Link></div>
  </main>;

  const [articleFeedback, socialProfile] = await Promise.all([
    listArticleFeedback(user.subject, { urls: [...edition.front, ...edition.inside].map(link => link.url) }),
    getSocialProfile(user.subject),
  ]);
  return <IssueContent key={`${user.subject}:${date}:${edition.revision}`} edition={edition} owner={user.subject} articleFeedback={articleFeedback} sharingEnabled={socialProfile.enabled} />;
}
