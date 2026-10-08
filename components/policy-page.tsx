import Link from "next/link";
import { policyReviewEnabled, policyTitles, type PolicyKind } from "@/lib/policy-review";
import { policyContent } from "@/lib/policy-content";
import styles from "./policy-page.module.css";

export function PolicyPage({ kind }: { kind: PolicyKind }) {
  const review = policyReviewEnabled();
  const document = policyContent[kind];
  return <main className={styles.page}>
    <header>
      <p className={styles.eyebrow}>{review ? "Policy review" : "Curiofold"}</p>
      <h1>{policyTitles[kind]}</h1>
      <aside className={styles.notice} aria-label="Publication status">
        <strong>{review ? "Draft for review — not in effect" : "Not yet available"}</strong>
        <p>{review ? "This is not an adopted policy or contract. No effective date has been set. Unresolved decisions below must be completed before publication or ChatGPT submission." : "This page has not been finalized. Curiofold’s public policies and support contact are still being prepared."}</p>
      </aside>
    </header>
    {review ? <>
      <p className={styles.introduction}>{document.introduction}</p>
      <nav className={styles.contents} aria-label="On this page">
        {document.sections.map((section, index) => <a key={section.title} href={`#section-${index}`}>{section.title}</a>)}
        <a href="#decisions">Decisions before publication</a>
      </nav>
      {document.sections.map((section, index) => <section key={section.title} id={`section-${index}`}>
        <h2>{section.title}</h2>
        {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      </section>)}
      <section id="decisions" className={styles.decisions}>
        <h2>Decisions before publication</h2>
        <ul>{document.decisions.map(decision => <li key={decision}>{decision}</li>)}</ul>
      </section>
    </> : null}
    <nav className={styles.links} aria-label="Policies and help">
      {Object.entries(policyTitles).map(([path, title]) => <Link key={path} href={`/${path}`} aria-current={path === kind ? "page" : undefined}>{title}</Link>)}
    </nav>
  </main>;
}
