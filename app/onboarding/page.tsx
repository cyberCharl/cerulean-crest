import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/browser-auth";
import { getSettingsState, latestIssueDate } from "@/lib/db";
import { configuredChatGptPluginUrl } from "@/lib/onboarding";
import { OnboardingForm } from "@/components/onboarding-form";
import { FirstEditionPrompt } from "@/components/first-edition-prompt";
import styles from "./onboarding.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Make it your edition", robots: { index: false, follow: false } };

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const user = await requireUser();
  const [settingsState, latest, query] = await Promise.all([getSettingsState(user.subject), latestIssueDate(user.subject), searchParams]);
  const { settings } = settingsState;
  const requested = ["rhythm", "interests", "connect"].includes(query.step ?? "") ? query.step : undefined;
  const step = requested ?? settings.onboardingStep ?? "rhythm";
  if (step === "connect" && !settings.onboardingStep && !latest) redirect("/onboarding?step=rhythm");
  const pluginUrl = configuredChatGptPluginUrl();
  const titles = { rhythm: "Make room for reading.", interests: "Follow your curiosity.", connect: "Your brief is ready." };
  return <main className={styles.page}>
    <aside className={styles.margin}>
      <p className="edition-number">Your reading life</p>
      <ol className={styles.steps} aria-label="Set up your magazine">
        {([['rhythm', 'Reading rhythm'], ['interests', 'Your interests'], ['connect', 'First edition']] as const).map(([key, label], index) => <li key={key} aria-current={step === key ? "step" : undefined}>
          <span>0{index + 1}</span>{label}
        </li>)}
      </ol>
      <p className={styles.marginNote}>A few starting points.<br />An edition that feels like yours.<br />Room to be surprised.</p>
    </aside>
    <section className={styles.content} aria-labelledby="setup-title">
      <p className="edition-number">{step === "rhythm" ? "01 / A little space in your day" : step === "interests" ? "02 / A starting point for your editor" : "03 / From brief to first edition"}</p>
      <h1 id="setup-title">{titles[step as keyof typeof titles]}</h1>
      {step === "connect" ? <>
        <p className={styles.lede}>Your editor has a place to start. The first edition is where you’ll find out what fits.</p>
        <div className={styles.summary}>
          <p><strong>{settings.readingMinutes} minutes</strong> to read, with <strong>{settings.editionMinutes} minutes</strong> of material to choose from.</p>
          <p>{settings.interests?.length ? settings.interests.join(" · ") : "A broad mix, with room for discovery."}</p>
          <Link href="/onboarding?step=interests">Adjust your brief</Link>
        </div>
        {latest ? <div className={styles.connection}>
          <h2>Your first edition is here.</h2>
          <p>Choose what catches your attention. There’s no obligation to finish every piece.</p>
          <Link className={styles.primary} href={`/issues/${latest}`}>Open your edition →</Link>
        </div> : <>
          <div className={styles.connection}>
            <h2>Connect Cerulean Crest in ChatGPT</h2>
            <p>Use the same Cerulean Crest account you used here when ChatGPT asks you to sign in.</p>
            {pluginUrl ? <a className={styles.primary} href={pluginUrl} target="_blank" rel="noopener noreferrer">Open the ChatGPT plugin ↗</a> : <p className={styles.notice}>The public ChatGPT plugin isn’t available yet. Your brief is saved; you can return here when the connection is ready.</p>}
          </div>
          <h2>Then ask for one edition.</h2>
          <p>After connecting, paste this into ChatGPT. It will fetch your saved preferences and return a link to your private edition.</p>
          <FirstEditionPrompt />
          <p className={styles.quiet}>No edition has arrived yet. Opening the plugin or copying this instruction doesn’t start generation.</p>
          <Link href="/today" className={styles.checkLink}>Check for my edition →</Link>
        </>}
        <p className={styles.ritual}>Once you’ve tried an edition, ask ChatGPT to make it a recurring task at a time that suits you. Your reading preferences stay here; the schedule stays there.</p>
      </> : <>
        <p className={styles.lede}>{step === "rhythm" ? "Choose a reading rhythm that fits. We’ll offer enough to explore, with a natural place to stop." : "You don’t need to describe yourself perfectly. A few interests are enough to begin; your editor should still look beyond them."}</p>
        <OnboardingForm key={step} step={step as "rhythm" | "interests"} settings={settings} detectTimeZone={!settingsState.saved} />
      </>}
    </section>
  </main>;
}
