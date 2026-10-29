"use server";
import { getUser } from "@/lib/browser-auth";
import { deleteAccount } from "@/lib/account-deletion";
import { appUrl, contactEmail } from "@/lib/site-config";

export type DeleteAccountState = { error?: string; signOutUrl?: string };

export async function deleteMyAccount(_previous: DeleteAccountState, form: FormData): Promise<DeleteAccountState> {
  const user = await getUser();
  if (!user) return { error: "You’re signed out. Sign in again to delete your account." };
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== "delete") return { error: "Type “delete” to confirm." };
  try {
    await deleteAccount(user.subject);
  } catch (error) {
    console.error("account deletion failed", { subject: user.subject, error: String(error) });
    return { error: `Your account couldn’t be deleted just now, and nothing was removed. Please try again, or email ${contactEmail}.` };
  }
  // The browser signs out with a full navigation, because sign-out leaves this site for Auth0.
  return { signOutUrl: appUrl("/auth/logout") };
}
