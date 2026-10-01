"use client";

import { useState } from "react";
import styles from "@/app/onboarding/onboarding.module.css";

export function FirstEditionPrompt({ prompt }: { prompt: string }) {
  const [message, setMessage] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setMessage("Copied. Paste this into ChatGPT after connecting Curiofold."); }
    catch { setMessage("Copy isn’t available in this browser. Select the instruction above and copy it manually."); }
  }
  return <div className={styles.prompt}>
    <p>{prompt}</p>
    <button type="button" onClick={copy}>Copy ChatGPT instruction</button>
    <p role="status" className={styles.quiet}>{message}</p>
  </div>;
}
