import type { Metadata } from "next";
import { landingAccount } from "@/components/landing/account";
import { Email, PolicyPage } from "@/components/landing/policy-page";
import { appUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Filtered keeps about you, who else handles it, and how to delete it.",
};

export default async function PrivacyPage() {
  const { account } = await landingAccount();
  return (
    <PolicyPage title="Privacy" account={account} intro={<>
      <p>Filtered keeps as little about you as it can to make your paper. It doesn’t show ads, track you around the web, sell your data, or use it to train AI.</p>
      <p>Filtered is run by Charl Botha, an individual in South Africa, who is responsible for your information under South Africa’s Protection of Personal Information Act (POPIA). Questions or requests: <Email />.</p>
    </>}>
      <h2 id="what-we-keep">What Filtered keeps</h2>
      <ul>
        <li><strong>Your account.</strong> Sign-in is handled by Auth0. Filtered’s database keeps only the account ID Auth0 gives it. Your name and email stay with Auth0 and in the cookie that keeps you signed in.</li>
        <li><strong>Your brief and settings.</strong> What you wrote about what you’d like to read, how much and how often, your timezone, your theme, and how far you got through setup.</li>
        <li><strong>Your papers.</strong> For each paper: its date, the note at the top, and for each piece its title, author, publication, reading time, link and a short line on why it was chosen.</li>
        <li><strong>Your links.</strong> Links you save, and what you did with them: read, kept for later, pinned or passed on.</li>
        <li><strong>What you tell the editor.</strong> “More like this”, “less like this”, and any private notes you add.</li>
        <li><strong>Friends, if you turn them on.</strong> Your username, friend requests, and the pieces and notes you and your friends share, including whether they’ve been read.</li>
      </ul>
      <p>Filtered doesn’t keep the articles themselves, your conversations with your AI tool, or any payment details.</p>

      <h2 id="ai-tools">Your AI tool</h2>
      <p>Filtered doesn’t pick articles itself. You connect your own AI tool (ChatGPT, or another tool that connects over MCP), and only after you approve the connection can it:</p>
      <ul>
        <li>read your brief: your brief, reading settings and timezone, the links in your last seven papers, your 50 most recent reactions and notes, your saved links, and pieces friends have recommended to you;</li>
        <li>change your brief when you ask it to;</li>
        <li>add new papers to your account.</li>
      </ul>
      <p>What that tool does with this is covered by its own privacy policy (for ChatGPT, OpenAI’s). <a href={appUrl("/settings/brief")}>You can see exactly what it receives</a>, and you can disconnect Filtered in that tool at any time.</p>

      <h2 id="others">Who else handles it</h2>
      <p>Filtered uses a few companies to run:</p>
      <ul>
        <li><strong>Vercel</strong> hosts the website, on servers in Frankfurt, Germany.</li>
        <li><strong>Neon</strong> hosts the database, also in Frankfurt.</li>
        <li><strong>Auth0</strong> (part of Okta) handles sign-in, from its European region.</li>
      </ul>
      <p>They handle your information only to provide these services. This means it’s stored outside South Africa, with providers that protect it under their own security and data-protection commitments.</p>
      <p>When you save a link, Filtered’s server visits that page once to read its title and length. The site you saved will see a visit from Filtered, not from you.</p>

      <h2 id="cookies">Cookies</h2>
      <p>Filtered only uses the cookies needed to sign you in and keep you signed in. There are no analytics or advertising cookies. Your browser also keeps a small note so it doesn’t repeat a one-time step.</p>

      <h2 id="deleting">How long it’s kept, and deleting it</h2>
      <p>Filtered keeps your information for as long as you have an account. You can delete your account at any time from <a href={appUrl("/settings#delete-account")}>Settings</a>. This straight away removes your sign-in record at Auth0, along with your brief, settings, papers, links, reactions and notes, and your friends and shares, including shares friends sent you.</p>
      <p>Short-lived copies, such as database backups and hosting logs, expire on their own within 30 days. Disconnect Filtered in your AI tool too, or it may try to make new papers.</p>

      <h2 id="rights">Your rights</h2>
      <p>You can ask to see the information Filtered holds about you, to correct it, or to delete it. You can also object to how it’s used. Email <Email /> from the address you sign in with.</p>
      <p>If you’re unhappy with the answer, you can complain to South Africa’s <a href="https://inforegulator.org.za">Information Regulator</a>.</p>

      <h2 id="children">Children</h2>
      <p>Filtered is for people 18 and over.</p>

      <h2 id="changes">Changes</h2>
      <p>If this page changes, the date at the top will change too. For anything that matters, you’ll see a note on the site before it takes effect.</p>
    </PolicyPage>
  );
}
