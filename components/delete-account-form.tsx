"use client";
import { useActionState, useEffect } from "react";
import { deleteMyAccount, type DeleteAccountState } from "@/app/settings/actions";

export function DeleteAccountForm({ className }: { className?: string }) {
  const [state, action, pending] = useActionState(deleteMyAccount, {} as DeleteAccountState);
  useEffect(() => {
    if (!state.signOutUrl) return;
    // Clear anything this site kept in the browser, then sign out.
    try { localStorage.clear(); } catch { /* Storage may be unavailable; nothing else to clear. */ }
    window.location.assign(state.signOutUrl);
  }, [state.signOutUrl]);
  if (state.signOutUrl) return <p role="status">Your account is deleted. Signing you out…</p>;
  return <form action={action} className={className}>
    <label>Type “delete” to confirm
      <input name="confirm" autoComplete="off" autoCapitalize="none" spellCheck={false} required />
      <span>This removes your brief, settings, papers, saved links, feedback and friends at once, and signs you out. It can’t be undone.</span>
    </label>
    {state.error ? <p role="alert">{state.error}</p> : null}
    <button type="submit" disabled={pending}>{pending ? "Deleting…" : "Delete my account"}</button>
  </form>;
}
