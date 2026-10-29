import { requireUser } from "@/lib/browser-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your links", robots: { index: false, follow: false } };

export default async function ArchivePage() {
  await requireUser();
  redirect("/links");
}
