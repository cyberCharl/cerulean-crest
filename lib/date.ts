export const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Africa/Johannesburg";

export function isIssueDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-")) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function todayDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function longDate(date: string): string {
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function weekday(date: string): string {
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: "UTC",
    weekday: "long",
  }).format(new Date(`${date}T12:00:00Z`));
}
