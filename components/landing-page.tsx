import styles from "./landing-page.module.css";

type LandingPageProps = {
  signupUrl: string;
  signinUrl: string;
};

export function LandingPage({ signupUrl, signinUrl }: LandingPageProps) {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="landing-title">
        <div className={styles.intro}>
          <p className={styles.eyebrow}>A personal magazine. An experiment in attention.</p>
          <h1 id="landing-title">A wider world.<br />A <em>finite</em> edition.</h1>
          <p className={styles.lede}>
            Good things to read, gathered around your interests—with room for
            something you didn’t know you were looking for.
          </p>
          <p className={styles.description}>
            Cerulean Crest gives your AI-curated reading a home. Set your editorial
            direction, open your own edition, and follow what catches your curiosity.
          </p>
          <div className={styles.actions}>
            <a className={styles.primaryLink} href={signupUrl}>Create your account <span aria-hidden="true">↗</span></a>
            <a className={styles.secondaryLink} href={signinUrl}>Already a reader? Sign in</a>
          </div>
          <p className={styles.setupNote}>Bring your ChatGPT curator. Scheduling stays in ChatGPT.</p>
        </div>
        <aside className={styles.cover} aria-label="The idea behind an edition">
          <div className={styles.coverTop}><span>Cerulean Crest</span><span aria-hidden="true">✳</span></div>
          <p className={styles.coverLabel}>Notes on a reading life</p>
          <p className={styles.coverTitle}>Follow your<br /><em>curiosity.</em><br />Then close<br />the cover.</p>
          <div className={styles.coverRule} />
          <p className={styles.coverCopy}>A considered selection.<br />Original voices.<br />Permission to leave things unread.</p>
          <p className={styles.coverBottom}>An edition has an ending.</p>
        </aside>
      </section>

      <section className={styles.principles} aria-labelledby="principles-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>The editorial premise</p>
          <h2 id="principles-title">Enough to explore.<br /><em>No obligation to finish.</em></h2>
        </div>
        <div className={styles.principleCopy}>
          <p>An edition is an invitation. You can read one piece, follow an unexpected thread, or leave the rest for good. An unread article isn’t a debt.</p>
          <p>The aim is a small reading ritual: a little context, a fresh perspective, and a natural place to stop.</p>
        </div>
      </section>

      <section className={styles.process} aria-labelledby="process-title">
        <p className={styles.eyebrow}>From your brief to your reading chair</p>
        <h2 id="process-title">Your taste. Your time. <em>Your edition.</em></h2>
        <ol className={styles.steps}>
          <li>
            <span className={styles.stepNumber} aria-hidden="true">01</span>
            <h3>Give it direction</h3>
            <p>Set your editorial guidelines and reading volume in the app. Make space for your interests and the ideas beyond them.</p>
          </li>
          <li>
            <span className={styles.stepNumber} aria-hidden="true">02</span>
            <h3>Connect your curator</h3>
            <p>Your ChatGPT agent uses your editorial brief to assemble editions. You arrange the task and its schedule in ChatGPT.</p>
          </li>
          <li>
            <span className={styles.stepNumber} aria-hidden="true">03</span>
            <h3>Settle in and read</h3>
            <p>Sign in to your own editions. Read the context, visit the original sources, and choose what deserves your attention today.</p>
          </li>
        </ol>
      </section>

      <section className={styles.invitation} aria-labelledby="invitation-title">
        <div>
          <p className={styles.eyebrow}>An open experiment</p>
          <h2 id="invitation-title">Make a little room<br />for <em>good reading.</em></h2>
          <p>We’re exploring what a more deliberate information habit can look like. You’re welcome to try it with us.</p>
        </div>
        <a className={styles.primaryLink} href={signupUrl}>Start your reading ritual <span aria-hidden="true">↗</span></a>
      </section>
    </main>
  );
}
