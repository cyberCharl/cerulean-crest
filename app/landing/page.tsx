import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";
import { landingAccount, signupUrl } from "@/components/landing/account";
import { marketingUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "A newspaper of your own",
  description: "A small paper for a better information diet. Write a brief, and your own AI finds a few good pieces to read on the writers’ own sites. Then it ends.",
};

export default async function Landing() {
  return <LandingPage signupUrl={signupUrl()} whyUrl={marketingUrl("/why")} {...await landingAccount()} />;
}
