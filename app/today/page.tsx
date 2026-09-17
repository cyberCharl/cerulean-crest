import { redirect } from "next/navigation";
import { requireUser } from "@/lib/browser-auth";
import { todayDate } from "@/lib/date";
import { getIssue, latestIssueDate, getSettings } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your edition", robots: { index: false, follow: false } };

export default async function TodayPage() {
  const user = await requireUser();
  const settings = await getSettings(user.subject);
  const today = todayDate(settings.timeZone);
  const date = await getIssue(user.subject, today) ? today : await latestIssueDate(user.subject);
  redirect(date ? `/issues/${date}` : "/onboarding");
}
