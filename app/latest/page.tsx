import { redirect } from "next/navigation";
import { requireUser } from "@/lib/browser-auth";
import { latestIssueDate } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Latest edition", robots: { index: false, follow: false } };

export default async function LatestPage() {
  const user = await requireUser();
  const date = await latestIssueDate(user.subject);
  redirect(date ? `/issues/${date}` : "/onboarding");
}
