import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { LandingPage } from "@/components/landing-page";
import { appUrl, isSeparateAppHost } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (isSeparateAppHost((await headers()).get("host"))) redirect("/today");
  return <LandingPage signupUrl={appUrl("/auth/login?screen_hint=signup")} signinUrl={appUrl("/auth/login")} />;
}
