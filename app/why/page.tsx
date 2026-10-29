import type { Metadata } from "next";
import { WhyLetter } from "@/components/landing/why-letter";
import { landingAccount, signupUrl } from "@/components/landing/account";

export const metadata: Metadata = {
  title: "Why I made Filtered",
  description: "A note from Charl on the feeds, the read-later backlog, and the experiment that became Filtered.",
};

export default async function WhyPage() {
  return <WhyLetter signupUrl={signupUrl()} {...await landingAccount()} />;
}
