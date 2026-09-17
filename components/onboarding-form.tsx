"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveOnboarding } from "@/app/onboarding/actions";
import { interestOptions, type EditorialSettings } from "@/lib/editorial-settings";
import type { BriefStep, OnboardingFormState } from "@/lib/onboarding";
import styles from "@/app/onboarding/onboarding.module.css";

export function OnboardingForm({ step, settings, detectTimeZone }: { step: BriefStep; settings: EditorialSettings; detectTimeZone: boolean }) {
  const [state, action, pending] = useActionState(saveOnboarding.bind(null, step), {} as OnboardingFormState);
  const [timeZone, setTimeZone] = useState(settings.timeZone);
  const [readingMinutes, setReadingMinutes] = useState(String(settings.readingMinutes));
  const [editionMinutes, setEditionMinutes] = useState(String(settings.editionMinutes));
  const [interests, setInterests] = useState(settings.interests ?? []);
  const [guidelines, setGuidelines] = useState(settings.guidelines);
  const timeZoneEdited = useRef(false);
  const error = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!detectTimeZone || timeZoneEdited.current) return;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected) setTimeZone(detected);
  }, [detectTimeZone]);
  useEffect(() => { if (state.error) error.current?.focus(); }, [state]);

  return <form action={action} className={styles.form}>
    {state.error ? <p className={styles.error} role="alert" ref={error} tabIndex={-1}>{state.error}</p> : null}
    {step === "rhythm" ? <>
      <div className={styles.numbers}>
        <label htmlFor="readingMinutes">Time to settle in
          <span className={styles.numberInput}><input id="readingMinutes" name="readingMinutes" type="number" min={5} max={240} required value={readingMinutes} onChange={event => setReadingMinutes(event.target.value)} aria-describedby="reading-help" /> <span>minutes</span></span>
          <small id="reading-help">How long you’d like to read. A stopping point, not a target to hit.</small>
        </label>
        <label htmlFor="editionMinutes">Room to choose
          <span className={styles.numberInput}><input id="editionMinutes" name="editionMinutes" type="number" min={5} max={480} required value={editionMinutes} onChange={event => setEditionMinutes(event.target.value)} aria-describedby="edition-help" /> <span>minutes</span></span>
          <small id="edition-help">The total material in an edition. Extra pieces give you permission to pick and skip.</small>
        </label>
      </div>
      <label className={styles.field} htmlFor="timeZone">Your timezone
        <input id="timeZone" name="timeZone" required maxLength={100} value={timeZone} onChange={event => { timeZoneEdited.current = true; setTimeZone(event.target.value); }} aria-describedby="timezone-help" />
        <small id="timezone-help">We suggest your browser’s timezone on first setup. Change it if needed. Scheduling stays in ChatGPT.</small>
      </label>
    </> : <>
      <fieldset className={styles.topics}>
        <legend>Choose a few things you’re drawn to</legend>
        <p id="interest-help">These are starting points, not boundaries. Leave them blank to begin with a broad mix.</p>
        <div className={styles.topicGrid}>
          {interestOptions.map(topic => <label key={topic} className={styles.topic}>
            <input type="checkbox" name="interests" value={topic} checked={interests.includes(topic)} onChange={event => setInterests(current => event.target.checked ? [...current, topic] : current.filter(value => value !== topic))} aria-describedby="interest-help" />
            <span>{topic}</span>
          </label>)}
        </div>
      </fieldset>
      <label className={styles.field} htmlFor="guidelines">Anything your editor should know? <span className={styles.optional}>Optional</span>
        <textarea id="guidelines" name="guidelines" rows={4} maxLength={8000} value={guidelines} onChange={event => setGuidelines(event.target.value)} placeholder="I’m learning to grow food. I like thoughtful essays and practical stories. Less breaking news, please." aria-describedby="guidelines-help" />
        <small id="guidelines-help">A current curiosity, a favourite source, or something you’d rather skip. A sentence is enough.</small>
      </label>
    </>}
    <div className={styles.actions}>
      {step === "interests" ? <Link href="/onboarding?step=rhythm">← Reading rhythm</Link> : <span />}
      <button type="submit" disabled={pending}>{pending ? "Saving…" : step === "rhythm" ? "Next: your interests →" : "Save my brief →"}</button>
    </div>
    <p className={styles.quiet}>You can change all of this later. Each completed step is saved.</p>
  </form>;
}
