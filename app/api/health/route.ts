import { isAuthorized } from "@/lib/auth";
import { getSettings, latestIssueDate } from "@/lib/db";
import { todayDate } from "@/lib/date";
import { publicationHealth } from "@/lib/publication-health";

export const dynamic = "force-dynamic";
export async function GET(request: Request): Promise<Response> {
  if (!request.headers.has("authorization")) return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  if (!process.env.CERULEAN_OWNER_SUBJECT || !isAuthorized(request.headers.get("authorization"))) return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const headers = { "Cache-Control": "no-store" };
  try {
    const [settings, latest] = await Promise.all([getSettings(process.env.CERULEAN_OWNER_SUBJECT), latestIssueDate(process.env.CERULEAN_OWNER_SUBJECT)]);
    const today = todayDate(settings.timeZone);
    const status = publicationHealth(latest, new Date(), settings.timeZone, settings.deliverySchedule);
    return Response.json({ status, today, latestEdition: latest, timeZone: settings.timeZone, schedule: settings.deliverySchedule ?? null }, { status: status === "late" ? 503 : 200, headers });
  } catch {
    console.error(JSON.stringify({ event: "publication_health_failed" }));
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
