import { z } from "zod";
import { articleUrlSchema } from "./article-feedback.ts";
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z][a-z0-9_]{2,29}$/,
    "Use 3–30 letters, numbers or underscores, starting with a letter",
  );
export const socialProfileSchema = z
  .object({
    username: z.union([usernameSchema, z.literal("")]),
    enabled: z.boolean(),
  })
  .strict()
  .refine(
    (p) => !p.enabled || !!p.username,
    "Choose a username to enable friends",
  );
export const shareArticleSchema = z
  .object({
    username: usernameSchema,
    url: articleUrlSchema,
    title: z.string().trim().min(1).max(500),
    note: z.string().trim().max(2000).default(""),
  })
  .strict();
export const shareReadSchema = z.object({
  id: z.uuid(),
  read: z.boolean(),
}).strict();
export const sharedUrlReadSchema = z.object({
  url: articleUrlSchema,
  read: z.boolean(),
}).strict();
export const sharedUrlsSchema = z.array(articleUrlSchema).max(1000);
export type SocialProfile = { username: string | null; enabled: boolean };
export type SharedArticle = {
  id: string;
  username: string;
  direction: "sent" | "received";
  url: string;
  title: string;
  note: string;
  createdAt: string;
  readAt: string | null;
  includedDate: string | null;
};
export type SocialState = {
  profile: SocialProfile;
  friends: { username: string; unreadCount: number; lastSharedAt: string | null }[];
  incomingRequests: { id: string; username: string }[];
  outgoingRequests: { id: string; username: string }[];
  shares: SharedArticle[];
};
export class SocialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SocialError";
  }
}
