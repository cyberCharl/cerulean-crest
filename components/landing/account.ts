import { getUser } from "@/lib/browser-auth";
import { appUrl } from "@/lib/site-config";
import type { AccountLink } from "./desk";

/** The marketing pages hide the site header, so they offer readers a way back to their paper. */
export async function landingAccount(): Promise<{ signedIn: boolean; account: AccountLink }> {
  const user = await getUser();
  return user
    ? { signedIn: true, account: { href: appUrl("/latest"), label: "Your paper" } }
    : { signedIn: false, account: { href: appUrl("/auth/login"), label: "Sign in" } };
}

export const signupUrl = () => appUrl("/auth/login?screen_hint=signup");
