"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser, requireUser } from "@/lib/browser-auth";
import { SocialError, usernameSchema } from "@/lib/social";
import {
  getSocialState,
  saveSocialProfile,
  requestFriend,
  respondFriendRequest,
  removeFriend,
  shareArticle,
  setSharedArticleRead,
  setSharedArticleReadByUrl,
  markSharedArticlesRead,
} from "@/lib/social-store";

function safeError(error: unknown) {
  return error instanceof SocialError ? error.message : "Your change could not be saved. Check the details and try again.";
}
function refreshSocial() {
  revalidatePath("/", "layout");
  revalidatePath("/friends");
}
async function submit(change: (owner: string) => Promise<unknown>, message: string) {
  const user = await requireUser();
  let error: string | undefined;
  try { await change(user.subject); refreshSocial(); }
  catch (cause) { error = safeError(cause); }
  redirect(`/friends?${error ? `error=${encodeURIComponent(error)}` : `message=${encodeURIComponent(message)}`}`);
}
export async function updateSocialProfile(form: FormData) {
  await submit(owner => saveSocialProfile(owner, { username: String(form.get("username") ?? ""), enabled: form.get("enabled") === "on" }), "Your sharing preferences are saved.");
}
export async function sendFriendRequest(form: FormData) {
  await submit(owner => requestFriend(owner, String(form.get("username") ?? "")), "Friend request sent.");
}
export async function respondToRequest(form: FormData) {
  const decision = form.get("decision");
  if (decision !== "accept" && decision !== "decline") redirect("/friends?error=Choose%20accept%20or%20decline.");
  await submit(owner => respondFriendRequest(owner, String(form.get("id") ?? ""), decision), decision === "accept" ? "Friend request accepted." : "Friend request declined.");
}
export async function endFriendship(form: FormData) {
  await submit(owner => removeFriend(owner, String(form.get("username") ?? "")), "Friend removed.");
}
export async function availableFriends(): Promise<{ friends?: { username: string }[]; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Sign in again to share an article." };
  try {
    const state = await getSocialState(user.subject);
    if (!state.profile.enabled) return { error: "Enable friends and sharing before sending an article." };
    return { friends: state.friends };
  } catch { return { error: "Your friends could not be loaded. Please try again." }; }
}
export async function sendArticleToFriend(input: { username: string; url: string; title: string; note: string }): Promise<{ error?: string; sent?: true; username?: string }> {
  const user = await getUser();
  if (!user) return { error: "Sign in again to share an article." };
  try {
    await shareArticle(user.subject, input);
    revalidatePath("/friends");
    revalidatePath(`/friends/${input.username}`);
    return { sent: true, username: input.username };
  } catch (error) { return { error: safeError(error) }; }
}

export async function changeSharedArticleRead(form: FormData) {
  const parsedUsername = usernameSchema.safeParse(String(form.get("username") ?? ""));
  const username = parsedUsername.success ? parsedUsername.data : "";
  const user = await requireUser();
  let error: string | undefined;
  try {
    await setSharedArticleRead(user.subject, {
      id: String(form.get("id") ?? ""),
      read: form.get("read") === "true",
    });
    refreshSocial();
    if (username) revalidatePath(`/friends/${username}`);
  } catch (cause) { error = safeError(cause); }
  const target = username ? `/friends/${username}` : "/friends";
  redirect(`${target}?${error ? `error=${encodeURIComponent(error)}` : "message=Reading%20status%20updated."}`);
}

export async function setSharedArticleReadFromReader(input: { url: string; read: boolean }): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Sign in again to update reading status." };
  try {
    await setSharedArticleReadByUrl(user.subject, input);
    revalidatePath("/friends");
    return {};
  } catch (error) { return { error: safeError(error) }; }
}

export async function syncSharedArticleReads(urls: string[]): Promise<void> {
  const user = await getUser();
  if (!user || !urls.length) return;
  try {
    await markSharedArticlesRead(user.subject, urls);
    revalidatePath("/friends");
  } catch { /* Local reading progress remains available if social sync fails. */ }
}
