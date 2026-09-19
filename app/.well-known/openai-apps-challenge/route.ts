// The portal issues this public proof-of-domain token; it is not a credential.
export const dynamic = "force-dynamic";

export function GET(): Response {
  const token = process.env.OPENAI_APPS_CHALLENGE;
  return new Response(token || "Not configured", {
    status: token ? 200 : 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
