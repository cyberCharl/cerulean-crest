import { requireUser } from "@/lib/browser-auth";
import { listReadingLinks } from "@/lib/reading-store";
import { listArticleFeedback } from "@/lib/db";
import { getSocialProfile } from "@/lib/social-store";
import { ReadingLibrary } from "@/components/reading-library";
import { after } from "next/server";
import { processReadingMetadata } from "@/lib/reading-metadata";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Your links", robots: { index: false, follow: false } };

export default async function LinksPage() {
  const user = await requireUser();
  const [links, feedback, profile] = await Promise.all([
    listReadingLinks(user.subject), listArticleFeedback(user.subject), getSocialProfile(user.subject),
  ]);
  if (links.some(link => ["pending", "fetching"].includes(link.metadataStatus))) after(() => processReadingMetadata(user.subject));
  return <ReadingLibrary key={user.subject} owner={user.subject} initialLinks={links} articleFeedback={feedback} sharingEnabled={profile.enabled} />;
}
