export const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Africa/Johannesburg";

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
