import { redirect } from "next/navigation";
import { todayDate } from "@/lib/date";
import { getIssue, latestIssueDate } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const today = todayDate();
  const date = await getIssue(today) ? today : await latestIssueDate();
  if (!date) redirect("/archive");
  redirect(`/issues/${date}`);
}
