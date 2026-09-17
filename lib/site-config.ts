/** Deployment origins are configuration, independent of the product or Vercel project name. */
function origin(value: string | undefined, name: string): string | undefined {
  if (!value) return undefined;
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:"))
    || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${name} must be an HTTPS origin (HTTP is allowed on localhost)`);
  }
  return url.origin;
}

export function configuredAppOrigin(): string | undefined {
  return origin(process.env.CERULEAN_APP_URL || process.env.APP_BASE_URL || process.env.CERULEAN_SITE_URL, "CERULEAN_APP_URL");
}

export function configuredMarketingOrigin(): string | undefined {
  return origin(process.env.CERULEAN_MARKETING_URL, "CERULEAN_MARKETING_URL");
}

function localPath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    throw new Error("Site links require a local absolute path");
  }
  return path;
}

export function appUrl(path = "/today"): string {
  return `${configuredAppOrigin() ?? ""}${localPath(path)}`;
}

export function marketingUrl(path = "/"): string {
  return `${configuredMarketingOrigin() ?? ""}${localPath(path)}`;
}

/** Only a separately configured application host sends its homepage to the reader. */
export function isSeparateAppHost(host: string | null): boolean {
  const app = configuredAppOrigin();
  const marketing = configuredMarketingOrigin();
  return Boolean(host && app && marketing && app !== marketing && host.toLowerCase() === new URL(app).host.toLowerCase());
}
