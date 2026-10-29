import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/browser-auth";
import { getSettingsState, latestIssueDate } from "@/lib/db";
import { buildFirstEditionPrompt, configuredChatGptPluginUrl, configuredMcpPublicClientId, curatorTool, mcpConnectionUrl } from "@/lib/onboarding";
import { describeDeliverySchedule } from "@/lib/delivery-schedule";
import { OnboardingForm } from "@/components/onboarding-form";
import { FirstEditionPrompt } from "@/components/first-edition-prompt";
import styles from "./onboarding.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Make it your edition", robots: { index: false, follow: false } };

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ step?: string; tool?: string }> }) {
  const user = await requireUser();
  const [settingsState, latest, query] = await Promise.all([getSettingsState(user.subject), latestIssueDate(user.subject), searchParams]);
  const { settings } = settingsState;
  const requested = ["rhythm", "interests", "connect"].includes(query.step ?? "") ? query.step : undefined;
  const step = requested ?? settings.onboardingStep ?? "rhythm";
  if (step === "interests" && settings.constitutionMarkdown && settings.onboardingStep === "connect") redirect("/settings");
  if (step === "connect" && !settings.onboardingStep && !latest) redirect("/onboarding?step=rhythm");
  const pluginUrl = configuredChatGptPluginUrl();
  const tool = curatorTool(query.tool);
  const chatGpt = tool === "chatgpt";
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
          <p>Your editable editorial constitution is saved with your account.</p>
          <p>{settings.deliverySchedule ? <>Requested delivery: <strong>{describeDeliverySchedule(settings.deliverySchedule, settings.timeZone)}</strong>.</> : chatGpt ? "Choose a delivery rhythm to include a recurring schedule in your ChatGPT instruction." : "Choose a delivery rhythm to include a schedule request in your instruction."}</p>
          <p><Link href="/onboarding?step=rhythm">Adjust your reading and delivery rhythm</Link></p>
          <Link href="/settings">Read or edit your constitution</Link>
        </div>
        <nav className={styles.toolChoice} aria-label="Choose your AI tool">
          <p>Which AI tool will curate your editions?</p>
          <Link href="/onboarding?step=connect" scroll={false} aria-current={chatGpt ? "true" : undefined}>ChatGPT</Link>
          <Link href="/onboarding?step=connect&tool=other" scroll={false} aria-current={chatGpt ? undefined : "true"}>Another AI tool</Link>
        </nav>
        {latest ? <div className={styles.connection}>
          <h2>Your first edition is here.</h2>
          <p>Choose what catches your attention. There’s no obligation to finish every piece.</p>
          <Link className={styles.primary} href={`/issues/${latest}`}>Open your edition →</Link>
        </div> : chatGpt ? <>
          <div className={styles.connection}>
            <h2>Connect Filtered in ChatGPT</h2>
            <p>Use the same Filtered account you used here when ChatGPT asks you to sign in.</p>
            {pluginUrl ? <a className={styles.primary} href={pluginUrl} target="_blank" rel="noopener noreferrer">Open the ChatGPT plugin ↗</a> : <p className={styles.notice}>The public ChatGPT plugin isn’t available yet. Your brief is saved; you can return here when the connection is ready.</p>}
          </div>
        </> : null}
        {chatGpt ? null : <OtherToolConnection />}
        <h2>{latest ? "Make it a recurring read." : settings.deliverySchedule ? "Your first edition, and the next ones." : "Then ask for one edition."}</h2>
        {chatGpt ? <>
          <p>After connecting, paste this into ChatGPT.{settings.deliverySchedule ? " It includes your chosen delivery rhythm. Ask ChatGPT to confirm the recurring task is set up." : " It will fetch your saved preferences and return a link to your private edition."}</p>
          <FirstEditionPrompt prompt={buildFirstEditionPrompt(settings, Boolean(latest))} toolName="ChatGPT" />
        </> : <>
          <p>After connecting, paste this into your AI tool.{settings.deliverySchedule ? " It asks for a schedule only if your tool can run one, and to say so if it can’t." : " It will fetch your saved preferences and return a link to your private edition."}</p>
          <FirstEditionPrompt prompt={buildFirstEditionPrompt(settings, Boolean(latest), "other")} />
        </>}
        {!latest ? <>
          <p className={styles.quiet}>No edition has arrived yet. {chatGpt ? "Opening the plugin" : "Adding the connection"} or copying this instruction doesn’t start generation.</p>
          <Link href="/latest" className={styles.checkLink}>Check for my edition →</Link>
        </> : null}
        <p className={styles.ritual}>{chatGpt
          ? "Your delivery preference is saved here; the recurring task runs in ChatGPT. If you change your rhythm, paste the updated instruction into ChatGPT to update that task."
          : "Your delivery preference is saved here, but Filtered doesn’t run schedules. Some AI tools can run a scheduled task for you; with any other tool, ask it for each edition when you’d like one. If you change your rhythm, paste the updated instruction again."}</p>
      </> : <>
        <p className={styles.lede}>{step === "rhythm" ? "Choose a reading rhythm that fits. We’ll offer enough to explore, with a natural place to stop." : "You don’t need to describe yourself perfectly. A few interests are enough to begin; your editor should still look beyond them."}</p>
        <OnboardingForm key={step} step={step as "rhythm" | "interests"} settings={settings} detectTimeZone={!settingsState.saved} />
      </>}
    </section>
  </main>;
}

/** Connection steps for any MCP client with remote-server and OAuth support. */
function OtherToolConnection() {
  const serverUrl = mcpConnectionUrl();
  const clientId = configuredMcpPublicClientId();
  return <div className={styles.connection}>
    <h2>Connect Filtered in your AI tool</h2>
    <p>Filtered works with AI tools that can add a remote MCP server and sign in with OAuth. It has been tested with ChatGPT. Other tools, such as Claude, are expected to work but haven’t been verified with Filtered yet.</p>
    <p className={styles.serverUrl}><span>MCP server URL</span><code>{serverUrl}</code></p>
    <ol className={styles.connectSteps}>
      <li>Add a remote MCP server, sometimes called a custom connector, with exactly this URL. In Claude, go to Customize → Connectors → Add custom connector.</li>
      {clientId ? <li>If your tool asks for an OAuth client ID, enter <code>{clientId}</code> and leave the client secret blank.</li> : null}
      <li>When your tool asks you to sign in, use the same Filtered account you used here and approve access to your editions.</li>
      <li>Paste the instruction below into a new conversation.</li>
    </ol>
    {clientId ? null : <p className={styles.notice}>Filtered can’t register new AI tools automatically yet, so tools that need their own sign-in client can’t finish connecting. Your brief is saved; you can return here when the connection is ready.</p>}
  </div>;
}
