import { redirect } from "next/navigation";
import { requireUser } from "@/lib/browser-auth";
import { isIssueDate } from "@/lib/date";
import { notFound } from "next/navigation";

export default async function LegacyAppearance({ params }: { params: Promise<{ date: string }> }) {
  await requireUser();
  const { date } = await params;
  if (!isIssueDate(date)) notFound();
  redirect(`/issues/${date}`);
}
