import { requireUser } from "@/lib/browser-auth";
import { getSettings, patchSettings, listArticleFeedback } from "@/lib/db";
import { ArticleActions } from "@/components/article-actions";
import { editorialSettingsSchema, interestOptions } from "@/lib/editorial-settings";
import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "./settings.module.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your editorial brief", robots: { index: false, follow: false } };
async function updateSettings(form: FormData) {
  "use server";
  const user = await requireUser();
  const current = await getSettings(user.subject);
  const parsed = editorialSettingsSchema.safeParse({ ...current, readingMinutes: Number(form.get("readingMinutes")), editionMinutes: Number(form.get("editionMinutes")), guidelines: form.get("guidelines"), timeZone: form.get("timeZone"), interests: form.getAll("interests") });
  if (!parsed.success) redirect("/settings?error=invalid");
  const { onboardingStep: _onboardingStep, ...preferences } = parsed.data;
  await patchSettings(user.subject, preferences);
  redirect("/settings?saved=1");
}
export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const [settings, query, feedback] = await Promise.all([getSettings(user.subject), searchParams, listArticleFeedback(user.subject, { feedbackOnly: true, limit: 50 })]);
  return <main className={styles.page}>
    <p className="edition-number">Make room for what matters</p>
    <h1>Your editorial brief</h1>
    <p>Give your curator a sense of your interests and the time you want to spend reading.</p>
    <p>These are your explicit preferences. Changes you request through ChatGPT are saved here too. Article reactions and notes guide future selections separately and never automatically rewrite this brief.</p>
    {query.saved ? <p role="status">Your preferences are saved. Your curator receives them when it next requests your editorial brief.</p> : null}
    {query.error ? <p role="alert">Please check your reading minutes, edition minutes and timezone, then try again.</p> : null}
    <form action={updateSettings} className={styles.form}>
      <label>Reading time, in minutes<input name="readingMinutes" type="number" min="5" max="240" required defaultValue={settings.readingMinutes} /><span>The time you would like to spend. It is fine to stop there.</span></label>
      <label>Material in each edition, in minutes<input name="editionMinutes" type="number" min="5" max="480" required defaultValue={settings.editionMinutes} /><span>Extra material gives you choice. You never need to finish every piece.</span></label>
      <label>Your timezone<input name="timeZone" required maxLength={100} defaultValue={settings.timeZone} placeholder="Africa/Johannesburg" /><span>Used to date your editions; delivery scheduling stays in ChatGPT.</span></label>
      <fieldset className={styles.interests}><legend>Interests</legend>
        <p>Starting points for your editor, with room to look beyond them.</p>
        {interestOptions.map(topic => <label key={topic}><input type="checkbox" name="interests" value={topic} defaultChecked={settings.interests?.includes(topic) ?? false} />{topic}</label>)}
      </fieldset>
      <label>Editorial guidelines<textarea name="guidelines" rows={8} maxLength={8000} defaultValue={settings.guidelines} placeholder="Interests, goals, trusted sources, topics to avoid, and what you would like to discover…" /></label>
      <button type="submit">Save preferences</button>
    </form>
    <section aria-labelledby="editorial-feedback">
      <h2 id="editorial-feedback">What you’ve told the editor</h2>
      <p>Your latest article reactions and private notes help your curator make small adjustments. Your explicit preferences above take priority. You can change or clear feedback below; saving a piece does not count as liking it.</p>
      {feedback.length === 0 ? <p>No article feedback yet. Use “Tell the editor” on any piece.</p> : <ul className={styles.feedbackList}>
        {feedback.map(item => <li key={item.url}>
          <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
          {item.reaction ? <p>{item.reaction === "more" ? "More like this" : "Less like this"}</p> : null}
          {item.note ? <p className={styles.feedbackNote}>{item.note}</p> : null}
          <ArticleActions url={item.url} initialFeedback={item} />
        </li>)}
      </ul>}
      {feedback.length === 50 ? <p>Showing your 50 most recently updated pieces with feedback. Older feedback remains available on its article.</p> : null}
    </section>
    <section aria-labelledby="curator-setup">
      <h2 id="curator-setup">Connect your curator</h2>
      <p><Link href="/onboarding?step=connect">Continue to your first edition</Link> for connection steps and a short instruction to give your curator.</p>
      <p>Your saved preferences are fetched by the curator each run. Arrange recurring scheduling in ChatGPT after trying your first edition.</p>
    </section>
  </main>;
}
