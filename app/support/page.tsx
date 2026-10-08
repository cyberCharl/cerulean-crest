import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Help and support", robots: { index: false, follow: false } };
export default function Page() { return <PolicyPage kind="support" />; }
