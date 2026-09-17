import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";
import { appUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "A wider world. A finite edition.",
  description: "A personal home for AI-curated reading. Shape your editorial brief, explore original sources, and leave things unread without guilt.",
};

export default function Landing() {
  return <LandingPage signupUrl={appUrl("/auth/login?screen_hint=signup")} signinUrl={appUrl("/auth/login")} />;
}
