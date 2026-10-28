import { redirect } from "next/navigation";
import { requireUser } from "@/lib/browser-auth";
import { latestIssueDate } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Latest edition", robots: { index: false, follow: false } };

export default async function LatestPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  // Throwaway, fixture-only exploration. Production always takes the authenticated path.
  if (process.env.NODE_ENV === "development" && query.prototype === "reading") {
    const { ReadingPrototype } = await import("./reading-prototype");
    return <ReadingPrototype />;
  }
  const user = await requireUser();
  const date = await latestIssueDate(user.subject);
  redirect(date ? `/issues/${date}` : "/onboarding");
}
