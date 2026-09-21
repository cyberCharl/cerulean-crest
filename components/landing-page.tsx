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
          <p className={styles.eyebrow}>Personal discovery, thoughtfully gathered</p>
          <h1 id="landing-title">A wider world.<br />A <em>finite</em> edition.</h1>
          <p className={styles.lede}>
            Good things to read, gathered around your interests—with room for
            something you didn’t know you were looking for.
          </p>
          <p className={styles.description}>
            Daybook is a personal, AI-curated discovery feed. Give your curator a
            direction and find a considered selection of articles waiting in each edition.
          </p>
          <div className={styles.actions}>
            <a className={styles.primaryLink} href={signupUrl}>Create your account <span aria-hidden="true">↗</span></a>
            <a className={styles.secondaryLink} href={signinUrl}>Sign in</a>
          </div>
          <p className={styles.setupNote}>Connect your ChatGPT curator to create editions. Scheduling stays in ChatGPT.</p>
        </div>
        <aside className={styles.edition} aria-labelledby="sample-title">
          <div className={styles.editionTop}>
            <span className={styles.editionBrand}>Daybook<span>.</span></span>
            <span>Illustrative edition</span>
          </div>
          <p className={styles.editionLabel}>A few things worth your attention</p>
          <h2 id="sample-title">Ideas to spend<br />a little time with.</h2>
          <p className={styles.editionNote}>Familiar interests. An unexpected connection. Somewhere to begin.</p>
          <div className={styles.sampleArticle}>
            <div className={styles.sampleMeta}><span>01</span><span>Design &amp; cities</span></div>
            <div>
              <h3>What makes a city feel like home?</h3>
              <p>The small, everyday places that shape our sense of belonging—and what they reveal about the way we build.</p>
            </div>
          </div>
          <div className={styles.sampleArticle}>
            <div className={styles.sampleMeta}><span>02</span><span>A little further afield</span></div>
            <div>
              <h3>The patient work of noticing</h3>
              <p>A different perspective on attention, observation, and the things we tend to overlook.</p>
            </div>
          </div>
          <p className={styles.editionEnd}>A selection, with an ending.<span aria-hidden="true">◇</span></p>
        </aside>
      </section>

      <section className={styles.process} aria-labelledby="process-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>How it works</p>
          <h2 id="process-title">Your curiosity sets the direction.</h2>
        </div>
        <ol className={styles.steps}>
          <li>
            <span className={styles.stepNumber} aria-hidden="true">01 / The brief</span>
            <h3>Tell it what interests you</h3>
            <p>Set your editorial guidelines and reading volume. Make space for subjects you love and ideas beyond them.</p>
          </li>
          <li>
            <span className={styles.stepNumber} aria-hidden="true">02 / The discovery</span>
            <h3>Connect your curator</h3>
            <p>Your ChatGPT agent uses your brief to assemble editions. You arrange the task and its schedule in ChatGPT.</p>
          </li>
          <li>
            <span className={styles.stepNumber} aria-hidden="true">03 / The edition</span>
            <h3>Follow what catches you</h3>
            <p>Read the context, open the original articles, save a piece for later, and leave feedback to guide future selections.</p>
          </li>
        </ol>
      </section>

      <section className={styles.invitation} aria-labelledby="invitation-title">
        <div>
          <p className={styles.eyebrow}>Room for curiosity</p>
          <h2 id="invitation-title">Something worth finding.<br /><em>Somewhere to stop.</em></h2>
          <p>Read one piece or explore the whole edition. There’s no obligation to finish, and the next discovery can wait.</p>
        </div>
        <a className={styles.primaryLink} href={signupUrl}>Make room for discovery <span aria-hidden="true">↗</span></a>
      </section>
    </main>
  );
}
