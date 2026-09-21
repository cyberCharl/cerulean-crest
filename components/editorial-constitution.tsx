import type { EditorialSettings } from "@/lib/editorial-settings";
import { buildEditorialBrief } from "@/lib/editorial-brief";
import styles from "./editorial-constitution.module.css";

export function EditorialConstitution({ settings }: { settings: EditorialSettings }) {
  const constitution = buildEditorialBrief(settings);
  const { defaults } = constitution;
  return <section className={styles.constitution} aria-labelledby="constitution-heading">
    <header>
      <p className={styles.eyebrow}>The instructions behind your editions</p>
      <h2 id="constitution-heading">Your editorial constitution</h2>
      <p>This is the full brief your curator receives: your current saved preferences together with Daybook’s shared editorial rules. Changes saved below or through your curator appear here. Instructions or memories kept only in ChatGPT are not stored in this document.</p>
    </header>
    <article className={styles.document}>
      <h3>Purpose</h3>
      <p>{constitution.purpose}</p>
      <h3>Your editorial guidelines</h3>
      {constitution.editorialGuidelines ? <p className={styles.guidelines}>{constitution.editorialGuidelines}</p> : <p className={styles.empty}>You haven’t saved any personal guidelines. The shared rules below still apply. Add guidelines in your preferences, or ask your curator to save them.</p>}
      <h3>Your interests</h3>
      {constitution.interests.length ? <ul>{constitution.interests.map(interest => <li key={interest}>{interest}</li>)}</ul> : <p>No interests saved. Your curator is asked to offer a broad mix.</p>}
      <h3>Attention and discovery</h3>
      <dl className={styles.parameters}>
        <div><dt>Expected reading time</dt><dd>{defaults.expectedMinutes} minutes</dd></div>
        <div><dt>Material per edition</dt><dd>{defaults.availableMinutes} minutes</dd></div>
        <div><dt>Acceptable edition range</dt><dd>{defaults.acceptableAvailableMinutes.minimum}–{defaults.acceptableAvailableMinutes.maximum} minutes</dd></div>
        <div><dt>Suggested article count</dt><dd>{defaults.itemCount.minimum}–{defaults.itemCount.maximum}</dd></div>
        <div><dt>Serendipity</dt><dd>{defaults.serendipityFraction.minimum * 100}–{defaults.serendipityFraction.maximum * 100}%</dd></div>
        <div><dt>Maximum share for one topic</dt><dd>{defaults.maximumTopicFraction * 100}%</dd></div>
        <div><dt>Timezone</dt><dd>{constitution.timeZone}</dd></div>
        <div><dt>Today’s local edition date</dt><dd>{constitution.localDate}</dd></div>
      </dl>
      <h3>Selection principles</h3>
      <ol>{constitution.selectionRules.map(rule => <li key={rule}>{rule}</li>)}</ol>
      <h3>Publishing rules</h3>
      <ol>{constitution.publishingRules.map(rule => <li key={rule}>{rule}</li>)}</ol>
    </article>
  </section>;
}
