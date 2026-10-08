import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Privacy notice", robots: { index: false, follow: false } };
export default function Page() { return <PolicyPage kind="privacy" />; }
