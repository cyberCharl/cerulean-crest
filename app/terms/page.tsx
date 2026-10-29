import type { Metadata } from "next";
import { landingAccount } from "@/components/landing/account";
import { Email, PolicyPage } from "@/components/landing/policy-page";
import { marketingUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using Filtered, in plain words.",
};

export default async function TermsPage() {
  const { account } = await landingAccount();
  return (
    <PolicyPage title="Terms" account={account} intro={<>
      <p>These are the terms for using Filtered. They’re kept short and plain. By creating an account you agree to them.</p>
      <p>Filtered is run by Charl Botha, an individual in South Africa (“I” below). Questions: <Email />.</p>
    </>}>
      <h2 id="service">What Filtered is</h2>
      <p>Filtered keeps your brief, gives the AI tool you connect a way to read it and add papers, and shows you those papers. The AI tool does the finding. It’s your own account with another company, under that company’s terms, and I don’t control what it chooses.</p>
      <p>Filtered is a small, independent project. I’ll do my best to keep it running well, but it may sometimes be unavailable, and features may change.</p>

      <h2 id="price">Price</h2>
      <p>Filtered is free for now. If that changes, you’ll see the price before you pay anything, and nothing will be charged without your say-so.</p>

      <h2 id="links">The pieces you read</h2>
      <p>Every piece belongs to its writer and publisher. Filtered only links to them, and you read them on their own sites, under their terms. Some may be behind a paywall.</p>
      <p>Your AI tool’s choices, and the short lines on why it chose them, can be wrong. Check the original when it matters.</p>

      <h2 id="you">Your part</h2>
      <ul>
        <li>You need to be 18 or over.</li>
        <li>Keep your sign-in to yourself, and don’t try to get into anyone else’s account or around Filtered’s security.</li>
        <li>Don’t use Filtered to break the law, or to send friends anything abusive.</li>
        <li>Your brief, notes and links are yours. You allow Filtered to store them, show them to you, and pass them to the AI tool you connect, so it can make your paper.</li>
        <li>Pieces and notes you share with a friend can be seen by that friend.</li>
      </ul>

      <h2 id="ending">Ending</h2>
      <p>You can delete your account at any time from Settings, and everything is removed as described in the <a href={marketingUrl("/privacy#deleting")}>privacy page</a>.</p>
      <p>I may suspend or close an account that breaks these terms. If I ever close Filtered, I’ll give at least 30 days’ notice on the site first.</p>

      <h2 id="liability">If something goes wrong</h2>
      <p>Filtered is provided as it is. As far as the law allows, I’m not responsible for losses from using it, or from it being unavailable. Nothing here takes away any rights you have under consumer law.</p>

      <h2 id="law">Law</h2>
      <p>These terms are governed by the law of South Africa, and South African courts deal with any dispute. Wherever you are, write to me first: most things can be sorted out by email.</p>

      <h2 id="changes">Changes</h2>
      <p>If these terms change, the date at the top will change. For anything that matters, you’ll see a note on the site before it takes effect. If you keep using Filtered after that, you accept the new terms.</p>
    </PolicyPage>
  );
}
