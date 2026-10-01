import Markdown from "react-markdown";
import styles from "./editorial-constitution.module.css";

export function EditorialConstitution({ markdown }: { markdown: string }) {
  return <section className={styles.constitution} aria-labelledby="constitution-heading">
    <header>
      <p className={styles.eyebrow}>The editorial policy behind your editions</p>
      <h2 id="constitution-heading">Your editorial constitution</h2>
      <p>This is your saved Markdown document. Your curator reads it with current reading settings, recent editions, article feedback and friend recommendations. Those changing signals do not rewrite this document.</p>
    </header>
    <article className={styles.document}><Markdown>{markdown}</Markdown></article>
  </section>;
}
