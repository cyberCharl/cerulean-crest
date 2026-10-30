export const dynamic = "force-dynamic";

/** Public liveness only; it reveals nothing about any reader. */
export function GET(): Response {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
