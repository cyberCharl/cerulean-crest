// Deletes a reader's Auth0 user through the Management API, using a
// machine-to-machine client that has only the delete:users permission.
// AUTH0_MANAGEMENT_DOMAIN is the tenant's own domain (e.g. tenant.eu.auth0.com),
// not the custom sign-in domain, because Management API tokens are issued for it.

type Env = Record<string, string | undefined>;
export type Auth0Deletion = "deleted" | "not-configured" | "failed";

export function auth0ManagementConfigured(env: Env = process.env): boolean {
  return Boolean(env.AUTH0_MANAGEMENT_DOMAIN && env.AUTH0_MANAGEMENT_CLIENT_ID && env.AUTH0_MANAGEMENT_CLIENT_SECRET);
}

export async function deleteAuth0User(subject: string, env: Env = process.env, fetcher: typeof fetch = fetch): Promise<Auth0Deletion> {
  if (!auth0ManagementConfigured(env)) return "not-configured";
  const origin = `https://${env.AUTH0_MANAGEMENT_DOMAIN!.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  const tokenResponse = await fetcher(`${origin}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: env.AUTH0_MANAGEMENT_CLIENT_ID,
      client_secret: env.AUTH0_MANAGEMENT_CLIENT_SECRET,
      audience: `${origin}/api/v2/`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenResponse.ok) throw new Error(`Auth0 token request failed with ${tokenResponse.status}`);
  const { access_token: token } = await tokenResponse.json() as { access_token?: string };
  if (!token) throw new Error("Auth0 token response had no access token");
  const response = await fetcher(`${origin}/api/v2/users/${encodeURIComponent(subject)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  // 404 means the user is already gone, which is the outcome we want.
  if (!response.ok && response.status !== 404) throw new Error(`Auth0 user deletion failed with ${response.status}`);
  return "deleted";
}
