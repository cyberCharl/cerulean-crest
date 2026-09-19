"use client";

import { useId, useState, useTransition } from "react";
import { changeArticleFeedback } from "@/app/saved/actions";
import type { ArticleFeedback } from "@/lib/article-feedback";

export function ArticleActions({ url, initialFeedback }: { url: string; initialFeedback?: ArticleFeedback | null }) {
  const id = useId();
  const [feedback, setFeedback] = useState(initialFeedback);
  const [note, setNote] = useState(initialFeedback?.note ?? "");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const hasFeedback = Boolean(feedback?.reaction || feedback?.note);

  function update(patch: { saved?: boolean; reaction?: "more" | "less" | null; note?: string }, success: string) {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const result = await changeArticleFeedback({ url, ...patch });
        if (result.error) { setError(result.error); return; }
        if (result.feedback) {
          setFeedback(result.feedback);
          if (patch.note !== undefined) setNote(result.feedback.note);
          setMessage(success);
        }
      } catch {
        setError("Your changes could not be saved. Please try again.");
      }
    });
  }

  return <div className="article-tools" aria-busy={pending}>
    <div className="article-tool-buttons">
      <button type="button" aria-pressed={feedback?.saved ?? false} disabled={pending}
        onClick={() => update({ saved: !feedback?.saved }, feedback?.saved ? "Removed from Saved." : "Added to Saved.")}>
        {feedback?.saved ? "✓ Saved" : "Save article"}
      </button>
      <button type="button" aria-expanded={open} aria-controls={`${id}-editor`} onClick={() => setOpen(!open)}>
        Tell the editor{hasFeedback ? " · feedback saved" : ""}
      </button>
    </div>
    {open ? <div className="editor-feedback" id={`${id}-editor`}>
      <p>Private feedback for future selections. Your editor will consider it next time it prepares an edition. For a standing instruction, update your <a href="/settings">editorial brief</a>.</p>
      <div className="article-tool-buttons" role="group" aria-label="Editorial reaction">
        <button type="button" disabled={pending} aria-pressed={feedback?.reaction === "more"}
          onClick={() => update({ reaction: feedback?.reaction === "more" ? null : "more" }, feedback?.reaction === "more" ? "Reaction cleared." : "Your editor will consider more like this.")}>More like this</button>
        <button type="button" disabled={pending} aria-pressed={feedback?.reaction === "less"}
          onClick={() => update({ reaction: feedback?.reaction === "less" ? null : "less" }, feedback?.reaction === "less" ? "Reaction cleared." : "Your editor will consider less like this.")}>Less like this</button>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); update({ note }, note.trim() ? "Your note is saved for the editor." : "Your note was cleared."); }}>
        <label htmlFor={`${id}-note`}>A note for your editor <span>(optional)</span></label>
        <textarea id={`${id}-note`} value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={2000} disabled={pending}
          placeholder="Loved the depth, but I’d prefer fewer startup stories…" aria-describedby={`${id}-hint`} />
        <p id={`${id}-hint`} className="feedback-hint">{note.length.toLocaleString()} / 2,000 characters. Explain what worked or what you’d change.</p>
        <div className="article-tool-buttons">
          <button type="submit" disabled={pending || note === (feedback?.note ?? "")}>Save note</button>
          {hasFeedback ? <button type="button" disabled={pending} onClick={() => update({ reaction: null, note: "" }, "Your reaction and note were cleared.")}>Clear editorial feedback</button> : null}
        </div>
      </form>
    </div> : null}
    <p className="article-action-status" role="status">{pending ? "Saving…" : message}</p>
    {error ? <p className="article-action-error" role="alert">{error}</p> : null}
  </div>;
}
