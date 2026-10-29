import type { ReactNode } from "react";
import { contactEmail } from "@/lib/site-config";
import { Desk, type AccountLink } from "./desk";
import desk from "./desk.module.css";
import styles from "./policy-page.module.css";

export const policiesUpdated = "29 October 2026";

export function Email() {
  return <a href={`mailto:${contactEmail}`}>{contactEmail}</a>;
}

type Props = { title: string; intro: ReactNode; account: AccountLink; children: ReactNode };

/** A plain document on the desk, used by the privacy, terms and help pages. */
export function PolicyPage({ title, intro, account, children }: Props) {
  return (
    <Desk account={account}>
      <main className={styles.page}>
        <article className={styles.document} aria-labelledby="policy-title">
          <p className={desk.cardLabel}><span>Filtered</span><span>Last updated {policiesUpdated}</span></p>
          <h1 id="policy-title">{title}</h1>
          <div className={styles.intro}>{intro}</div>
          {children}
        </article>
      </main>
    </Desk>
  );
}
