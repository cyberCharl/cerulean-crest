import type { DeliverySchedule } from "./delivery-schedule.ts";

/** Compare with the most recent scheduled delivery in the reader's local calendar. */
export function publicationHealth(latestEdition: string | null, now: Date, timeZone: string, schedule?: DeliverySchedule) {
  if (!schedule) return "unscheduled";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)!.value;
  const localDate = `${part("year")}-${part("month")}-${part("day")}`;
  const localTime = `${part("hour")}:${part("minute")}`;
  // UTC is only for calendar arithmetic; delivery time is compared in the reader's timezone.
  const calendar = new Date(`${localDate}T12:00:00Z`);
  for (let daysAgo = 0; daysAgo <= 7; daysAgo++) {
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long" }).format(calendar);
    const scheduled = schedule.frequency === "daily"
      || (schedule.frequency === "weekdays" && weekday !== "Saturday" && weekday !== "Sunday")
      || (schedule.frequency === "weekly" && weekday === schedule.day);
    if (scheduled && (daysAgo > 0 || localTime >= schedule.time)) {
      return latestEdition && latestEdition >= calendar.toISOString().slice(0, 10) ? "current" : "late";
    }
    calendar.setUTCDate(calendar.getUTCDate() - 1);
  }
  return "waiting";
}
