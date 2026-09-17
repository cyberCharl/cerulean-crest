import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { cache } from "react";
import { redirect } from "next/navigation";
import { configuredAppOrigin, appUrl } from "./site-config";

export function browserAuthConfigured(): boolean {
  return Boolean(process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID && process.env.AUTH0_CLIENT_SECRET && process.env.AUTH0_SECRET && configuredAppOrigin());
}
let client: Auth0Client | undefined;
export function auth0(): Auth0Client {
  if (!browserAuthConfigured()) throw new Error("Browser sign-in is not configured");
  return client ??= new Auth0Client({ appBaseUrl: configuredAppOrigin(), signInReturnToPath: "/today", enableAccessTokenEndpoint: false });
}
export type Reader = { subject: string; name?: string; email?: string };
export const getUser = cache(async (): Promise<Reader | null> => {
  if (!browserAuthConfigured()) return null;
  const session = await auth0().getSession();
  if (!session?.user.sub) return null;
  return { subject: session.user.sub, name: session.user.name, email: session.user.email };
});
export async function requireUser(): Promise<Reader> {
  const user = await getUser();
  if (!user) redirect(appUrl("/auth/login"));
  return user;
}
