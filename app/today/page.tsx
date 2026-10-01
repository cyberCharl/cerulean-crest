import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your edition", robots: { index: false, follow: false } };

export default async function TodayPage() {
  redirect("/latest");
}
