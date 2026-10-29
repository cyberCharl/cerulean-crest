import { BriefCard, Desk, FoundSlip, ReplyCard, type AccountLink } from "./landing/desk";
import desk from "./landing/desk.module.css";
import styles from "./landing-page.module.css";

type LandingPageProps = {
  signupUrl: string;
  account: AccountLink;
  signedIn: boolean;
  whyUrl: string;
};

const steps = [
  {
    title: "Write a brief",
    body: "Choose how much you’d like to read and how often, then say what you’re after in plain words. It’s yours to rewrite whenever you like.",
  },
  {
    title: "Connect your AI",
    body: "Add Filtered to ChatGPT, or any AI tool that connects over MCP, and give it one instruction. It makes your first paper, then a new one on the days you chose.",
  },
  {
    title: "Read, then stop",
    body: "A handful of pieces, each linked to where it was written. Save anything you find along the way: it becomes a candidate, not a backlog.",
  },
];

/** The public homepage: what Filtered is, how it works, a little proof, and a way in. */
export function LandingPage({ signupUrl, account, signedIn, whyUrl }: LandingPageProps) {
  return (
    <Desk account={account}>
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div>
            <h1 id="hero-title">A newspaper <em>of your own.</em></h1>
            <p className={styles.lede}>
              Write down what you’re curious about. Your own AI goes looking,
              and on the days you choose it sets out a few good pieces to read
              on the writers’ own sites. Then it ends.
            </p>
            <a className={desk.primary} href={signupUrl}>Start your paper <span aria-hidden="true">→</span></a>
            <p className={styles.fine}>
              <span>Works with ChatGPT and other MCP tools</span>
              <span>A few minutes to set up</span>
            </p>
          </div>
          <BriefCard className={styles.heroBrief} />
        </section>

        <section className={styles.how} aria-labelledby="how-title">
          <h2 id="how-title" className={styles.sectionLabel}>How it works</h2>
          <ol className={styles.steps}>
            {steps.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <p className={styles.stepNo}>No. {index + 1}</p>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.proof} aria-labelledby="note-title">
          <div className={styles.note}>
            <h2 id="note-title" className={desk.cardLabel}><span>A note from Charl</span><span>who makes Filtered</span></h2>
            <p className={styles.quote}>
              I built Filtered because the feeds were finding plenty, just not
              for me. My own paper has since found me things I’d never have come
              across on my own, like these.
            </p>
            <p className={desk.signature}>Charl</p>
            <a className={styles.why} href={whyUrl}>Read why I made it <span aria-hidden="true">→</span></a>
          </div>
          <FoundSlip className={styles.proofSlip} />
        </section>

        <section className={styles.close} aria-label="Before you start">
          <div className={styles.wont}>
            <h2 className={desk.cardLabel}><span>What it won’t do</span></h2>
            <ul>
              <li>No feed, no streaks, no unread count.</li>
              <li>Nothing summarised or rewritten. You read the writer, not a digest of them.</li>
              <li>Filtered keeps your brief, your links and your choices. Never the articles, and never your chat history.</li>
            </ul>
          </div>
          <ReplyCard signupUrl={signupUrl} account={account} signedIn={signedIn} id="close-title" />
        </section>
      </main>
    </Desk>
  );
}
