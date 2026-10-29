import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { LandingPage } from "@/components/landing-page";
import { landingAccount, signupUrl } from "@/components/landing/account";
import { isSeparateAppHost, marketingUrl } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Filtered — a newspaper of your own" },
  description: "A small paper for a better information diet. Write a brief, and your own AI finds a few good pieces to read on the writers’ own sites. Then it ends.",
};

export default async function HomePage() {
  if (isSeparateAppHost((await headers()).get("host"))) redirect("/latest");
  return <LandingPage signupUrl={signupUrl()} whyUrl={marketingUrl("/why")} {...await landingAccount()} />;
}
