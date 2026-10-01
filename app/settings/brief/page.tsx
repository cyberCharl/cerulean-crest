import Link from "next/link";
import { headers } from "next/headers";
import { requireUser } from "@/lib/browser-auth";
import { assembleEditorialBrief } from "@/lib/assembled-editorial-brief";
import { curatorServerInstructions } from "@/lib/curator-instructions";
import { configuredAppOrigin } from "@/lib/site-config";
import styles from "../settings.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Curator brief preview", robots: { index: false, follow: false } };

export default async function BriefPreview() {
  const user = await requireUser();
  const requestHeaders = await headers();
  const baseUrl = configuredAppOrigin() ?? `http://${requestHeaders.get("host") ?? "localhost:3000"}`;
  const { brief } = await assembleEditorialBrief(user.subject, baseUrl);
  return <main className={styles.page}>
    <p><Link href="/settings">← Settings</Link></p>
    <h1>What the curator receives</h1>
    <p>These are the exact instruction and assembled curation-context strings this server supplies. ChatGPT may combine them with its own instructions and the separate curation skill. This assembled response must never be saved as the constitution; policy edits use the separate constitution-only read.</p>
    <h2>MCP connection instructions</h2>
    <pre className={styles.briefPreview}>{curatorServerInstructions}</pre>
    <h2>Current editorial brief</h2>
    <pre className={styles.briefPreview}>{brief}</pre>
  </main>;
}
