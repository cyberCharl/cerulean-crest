import type { Metadata } from "next";
import { landingAccount } from "@/components/landing/account";
import { Email, PolicyPage } from "@/components/landing/policy-page";
import { appUrl, marketingUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Help",
  description: "Answers to common questions about Filtered, and how to get in touch.",
};

export default async function SupportPage() {
  const { account } = await landingAccount();
  return (
    <PolicyPage title="Help" account={account} intro={<>
      <p>Write to <Email /> about anything: a problem, a question, or something you’d like to see. I read every message myself.</p>
      <p>Please never send your password, or any codes or keys from a sign-in or connection screen.</p>
    </>}>
      <h2 id="connecting">Connecting your AI tool</h2>
      <p><a href={appUrl("/onboarding?step=connect")}>Setup</a> walks you through it. Sign in to your AI tool and to Filtered with the same account you use here. If the connection stops working, remove Filtered in your AI tool, then add it again.</p>

      <h2 id="no-paper">My paper didn’t arrive</h2>
      <p>Your AI tool makes each paper, either on a schedule you set up in that tool or when you ask it. If you use a schedule, check that the task still exists and that Filtered is still connected. Then look in <a href={appUrl("/archive")}>the archive</a>, signed in with the same account.</p>

      <h2 id="changing">Changing what you get</h2>
      <p>Edit your brief and reading time in <a href={appUrl("/settings")}>Settings</a>, or ask your AI tool to change your brief for you. “More like this” and “less like this” on a piece help it adjust without changing your brief.</p>

      <h2 id="links">Saved links</h2>
      <p>A link you save becomes a candidate for a future paper, not something on a to-do list. Pin it if you really want to read it. Pass on it, and it quietly steps aside.</p>

      <h2 id="friends">Friends</h2>
      <p>Friends are off unless you turn them on. Once you’re friends with someone, you can share a piece with them, along with a note. They see what you share, never your papers or your brief.</p>

      <h2 id="delete">Deleting your account</h2>
      <p>Go to <a href={appUrl("/settings#delete-account")}>Settings</a> and choose “Delete my account”. Everything is removed straight away. Then disconnect Filtered in your AI tool. The <a href={marketingUrl("/privacy#deleting")}>privacy page</a> explains what’s deleted.</p>
    </PolicyPage>
  );
}
