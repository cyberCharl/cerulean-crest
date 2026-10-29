import type { ReactNode } from "react";
import { marketingUrl } from "@/lib/site-config";
import styles from "./desk.module.css";

// Real finds from Charl's own paper, named in his essay "A Newspaper of My Own".
export const finds = [
  {
    title: "Samurai city",
    author: "Samuel Hughes",
    source: "Works in Progress",
    url: "https://worksinprogress.co/issue/samurai-city/",
  },
  {
    title: "The simple pleasure and rituals of chopping firewood",
    author: "Bella Bathurst",
    source: "Aeon",
    url: "https://aeon.co/essays/the-simple-pleasure-and-rituals-of-chopping-firewood",
  },
  {
    title: "The real hidden gems of the West Coast",
    author: "Miles Masterson",
    source: "Patagonia Stories",
    url: "https://www.patagonia.com/stories/sports/surfing/the-real-hidden-gems-of-the-west-coast/story-116084.html",
  },
];

export type AccountLink = { href: string; label: string };

function PaperClip() {
  return (
    <svg className={styles.clip} viewBox="0 0 24 64" aria-hidden="true">
      <path d="M8 18v30a6 6 0 0 0 12 0V12a9 9 0 0 0-18 0v38a10 10 0 0 0 20 0V22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** The desk: page background, bar and footer. It replaces the site header and footer on these pages. */
export function Desk({ account, children }: { account: AccountLink; children: ReactNode }) {
  return (
    <div className={styles.root}>
      <header className={styles.bar}>
        <a className={styles.brand} href={marketingUrl()}>
          <img src="/brand/filtered/filtered-mark.svg" width={30} height={30} alt="" aria-hidden="true" />
          <span>Filtered<span className={styles.dot}>.</span></span>
        </a>
        <a className={styles.barLink} href={account.href}>{account.label}</a>
      </header>
      {children}
      <footer className={styles.footer}>
        <span>Filtered<span className={styles.dot}>.</span> A small paper for a better information diet.</span>
      </footer>
    </div>
  );
}

export function BriefCard({ className }: { className?: string }) {
  return (
    <figure className={[styles.brief, className].filter(Boolean).join(" ")}>
      <PaperClip />
      <figcaption className={styles.cardLabel}>
        <span>A brief</span>
        <span>in your own words</span>
      </figcaption>
      <div className={styles.briefLines}>
        <p className={styles.heading}><b>##</b> Bring me</p>
        <p>Things made by hand, and why they last</p>
        <p>How cities were built, and for whom</p>
        <p>The sea, surf and the coastline</p>
        <p className={styles.heading}><b>##</b> Leave out</p>
        <p><s>Reaction pieces</s> · <s>AI summaries</s> · <s>outrage</s></p>
        <p className={styles.heading}><b>##</b> Every so often</p>
        <p>Something far outside all of this</p>
        <p className={styles.heading}><b>##</b> How much</p>
        <p>Half an hour, weekday mornings</p>
      </div>
      <p className={styles.pencil} aria-hidden="true">rewrite it whenever you like</p>
    </figure>
  );
}

export function FoundSlip({ className }: { className?: string }) {
  return (
    <figure className={[styles.slip, className].filter(Boolean).join(" ")}>
      <figcaption className={styles.cardLabel}>
        <span>Found for me</span>
        <span>from my own paper</span>
      </figcaption>
      <ol>
        {finds.map(piece => (
          <li key={piece.url}>
            <a href={piece.url} target="_blank" rel="noopener noreferrer">{piece.title}</a>
            <span>{piece.author} · {piece.source}</span>
          </li>
        ))}
      </ol>
      <p className={styles.slipEnd}>each one read where it was written</p>
    </figure>
  );
}

type ReplyProps = { signupUrl: string; account: AccountLink; signedIn: boolean; className?: string; id?: string };

export function ReplyCard({ signupUrl, account, signedIn, className, id = "reply-title" }: ReplyProps) {
  return (
    <section className={[styles.reply, className].filter(Boolean).join(" ")} aria-labelledby={id}>
      <p className={styles.cardLabel}><span>Reply</span><span>no postage needed</span></p>
      <h2 id={id}>Yes, I’d like a paper of my own.</h2>
      <a className={styles.primary} href={signupUrl}>Start your paper <span aria-hidden="true">→</span></a>
      <p className={styles.replyNote}>
        {signedIn ? <a href={account.href}>Go to your paper</a> : <>Already reading? <a href={account.href}>Sign in</a></>}
      </p>
    </section>
  );
}
