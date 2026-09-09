import { getIssue, latestIssueDate } from "@/lib/db";
import { APP_TIME_ZONE, todayDate } from "@/lib/date";
import { publicationHealth } from "@/lib/publication-health";

export const dynamic = "force-dynamic";
export async function GET(): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  try {
    const today = todayDate();
    const [issue, latest] = await Promise.all([getIssue(today), latestIssueDate()]);
    const configuredHour = Number(process.env.EDITION_DEADLINE_HOUR ?? 9);
    if (!Number.isInteger(configuredHour) || configuredHour < 0 || configuredHour > 23) throw new Error("Invalid edition deadline");
    const status = publicationHealth(Boolean(issue), new Date(), APP_TIME_ZONE, configuredHour);
    return Response.json({ status, today, latestEdition: latest, timeZone: APP_TIME_ZONE }, { status: status === "late" ? 503 : 200, headers });
  } catch {
    console.error(JSON.stringify({ event: "publication_health_failed" }));
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
