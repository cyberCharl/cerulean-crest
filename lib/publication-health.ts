export function publicationHealth(hasToday: boolean, now: Date, timeZone: string, deadlineHour: number) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now));
  return hasToday ? "current" : hour >= deadlineHour ? "late" : "waiting";
}
