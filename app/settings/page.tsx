import { requireUser } from "@/lib/browser-auth";
import { getSettings, patchSettings, listArticleFeedback } from "@/lib/db";
import { EditorialConstitution } from "@/components/editorial-constitution";
import { ArticleActions } from "@/components/article-actions";
import { editorialPreferencesFromForm, interestOptions } from "@/lib/editorial-settings";
import { readerTheme, readerThemeSchema } from "@/lib/reader-theme";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "./settings.module.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Settings", robots: { index: false, follow: false } };
async function updateSettings(form: FormData) {
  "use server";
  const user = await requireUser();
  const parsed = editorialPreferencesFromForm(form);
  if (!parsed.success) redirect("/settings?error=invalid");
  await patchSettings(user.subject, parsed.data);
  redirect("/settings?saved=1");
}
async function updateTheme(form: FormData) {
  "use server";
  const user = await requireUser();
  const parsed = readerThemeSchema.safeParse(form.get("theme"));
  if (!parsed.success) redirect("/settings?error=theme");
  await patchSettings(user.subject, { theme: parsed.data });
  revalidatePath("/", "layout");
  redirect("/settings?appearance=saved");
}
export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; appearance?: string }> }) {
  const user = await requireUser();
  const [settings, query, feedback] = await Promise.all([getSettings(user.subject), searchParams, listArticleFeedback(user.subject, { feedbackOnly: true, limit: 50 })]);
  return <main className={styles.page}>
    <p className="edition-number">Make room for what matters</p>
    <h1>Settings</h1>
    <section aria-labelledby="appearance-heading" className={styles.appearance}>
      <h2 id="appearance-heading">Appearance</h2>
      <p>Choose how Daybook looks. Your choice follows you across editions and devices.</p>
      {query.appearance === "saved" ? <p role="status">Your appearance is saved.</p> : null}
      {query.error === "theme" ? <p role="alert">Choose one of the two themes, then try again.</p> : null}
      <form action={updateTheme} className={styles.form}>
        <fieldset className={styles.themeChoices}>
          <legend>Reading theme</legend>
          <label><input type="radio" name="theme" value="quiet-book" defaultChecked={readerTheme(settings) === "quiet-book"} /><span><strong>Quiet book</strong><span>Pale ivory, clear type, and a quiet reading surface.</span></span></label>
          <label><input type="radio" name="theme" value="tactile-correspondence" defaultChecked={readerTheme(settings) === "tactile-correspondence"} /><span><strong>Tactile correspondence</strong><span>Warmer paper, ink details, and a little texture.</span></span></label>
        </fieldset>
        <button type="submit">Save appearance</button>
      </form>
    </section>
    <EditorialConstitution settings={settings} />
    <h2>Edit your preferences</h2>
    <p>Give your curator a sense of your interests and the time you want to spend reading.</p>
    <p>These are your explicit preferences. Changes you request through ChatGPT are saved here too. Article reactions and notes guide future selections separately and never automatically rewrite your constitution.</p>
    {query.saved ? <p role="status">Your preferences are saved. Your curator receives them when it next requests your editorial brief.</p> : null}
    {query.error === "invalid" ? <p role="alert">Please check your reading minutes, edition minutes and timezone, then try again.</p> : null}
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
    <section aria-labelledby="friends-sharing">
      <h2 id="friends-sharing">Friends &amp; sharing</h2>
      <p>Optionally choose a username and exchange articles with people you know. Your editions and editorial constitution stay private.</p>
      <p><Link href="/friends">Manage friends and sharing →</Link></p>
    </section>
    <section aria-labelledby="curator-setup">
      <h2 id="curator-setup">Connect your curator</h2>
      <p><Link href="/onboarding?step=connect">Continue to your first edition</Link> for connection steps and a short instruction to give your curator.</p>
      <p>Your saved preferences are fetched by the curator each run. Arrange recurring scheduling in ChatGPT after trying your first edition.</p>
    </section>
  </main>;
}
