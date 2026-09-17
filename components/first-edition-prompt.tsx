"use client";

import { useState } from "react";
import styles from "@/app/onboarding/onboarding.module.css";

const prompt = "Read my Cerulean Crest editorial brief and recent editions, then curate and publish my first edition. Use my saved reading volume and interests, leave room for discovery, and return the edition link.";

export function FirstEditionPrompt() {
  const [message, setMessage] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setMessage("Copied. Paste this into ChatGPT after connecting Cerulean Crest."); }
    catch { setMessage("Copy isn’t available in this browser. Select the instruction above and copy it manually."); }
  }
  return <div className={styles.prompt}>
    <p>{prompt}</p>
    <button type="button" onClick={copy}>Copy first-edition instruction</button>
    <p role="status" className={styles.quiet}>{message}</p>
  </div>;
}
