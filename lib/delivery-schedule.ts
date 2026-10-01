import { z } from "zod";

export const deliveryDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const deliveryTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid delivery time");
export const deliveryScheduleSchema = z.discriminatedUnion("frequency", [
  z.object({ frequency: z.literal("daily"), time: deliveryTime }),
  z.object({ frequency: z.literal("weekdays"), time: deliveryTime }),
  z.object({ frequency: z.literal("weekly"), time: deliveryTime, day: z.enum(deliveryDays) }),
]);
export type DeliverySchedule = z.infer<typeof deliveryScheduleSchema>;
export const defaultDeliverySchedule: DeliverySchedule = { frequency: "daily", time: "08:00" };

export function describeDeliverySchedule(schedule: DeliverySchedule, timeZone: string) {
  const frequency = schedule.frequency === "daily" ? "Every day" : schedule.frequency === "weekdays" ? "Every weekday (Monday–Friday)" : `Every ${schedule.day}`;
  return `${frequency} at ${schedule.time} (${timeZone})`;
}
