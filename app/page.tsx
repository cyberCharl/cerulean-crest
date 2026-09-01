import { redirect } from "next/navigation";
import { todayDate } from "@/lib/date";
import { getIssue, latestIssueDate } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const today = todayDate();
  const date = getIssue(today) ? today : latestIssueDate();
  if (!date) redirect("/archive");
  redirect(`/issues/${date}`);
}
