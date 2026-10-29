"use client";

import { useState } from "react";
import styles from "@/app/onboarding/onboarding.module.css";

/** `toolName` names the destination; without one the wording stays tool-neutral. */
export function FirstEditionPrompt({ prompt, toolName }: { prompt: string; toolName?: string }) {
  const [message, setMessage] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setMessage(`Copied. Paste this into ${toolName ?? "your AI tool"} after connecting Filtered.`); }
    catch { setMessage("Copy isn’t available in this browser. Select the instruction above and copy it manually."); }
  }
  return <div className={styles.prompt}>
    <p>{prompt}</p>
    <button type="button" onClick={copy}>{toolName ? `Copy ${toolName} instruction` : "Copy instruction"}</button>
    <p role="status" className={styles.quiet}>{message}</p>
  </div>;
}
