import { z } from "zod";
import { requireOwner } from "./ownership.ts";
import {
  usernameSchema,
  socialProfileSchema,
  shareArticleSchema,
} from "./social.ts";
import * as engine from "./social-engine.ts";
async function run<T>(
  owner: string,
  work: (c: engine.SocialConnection, owner: string) => Promise<T>,
  readOnly = false,
): Promise<T> {
  const subject = requireOwner(owner);
  if (process.env.VERCEL && !process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is required on Vercel");
  const backend = process.env.DATABASE_URL
    ? await import("./postgres-social.ts")
    : await import("./sqlite-social.ts");
  return backend.transaction((c) => work(c, subject), readOnly);
}
export const getSocialProfile = (owner: string) =>
  run(owner, engine.profile, true);
export const getSocialState = (owner: string) => run(owner, engine.state, true);
export const saveSocialProfile = (owner: string, input: unknown) => {
  const value = socialProfileSchema.parse(input);
  return run(owner, (c, o) => engine.saveProfile(c, o, value));
};
export const requestFriend = (owner: string, username: string) => {
  const value = usernameSchema.parse(username);
  return run(owner, (c, o) => engine.request(c, o, value));
};
export const respondFriendRequest = (
  owner: string,
  id: string,
  action: "accept" | "decline",
) => {
  const key = z.uuid().parse(id);
  const response = z.enum(["accept", "decline"]).parse(action);
  return run(owner, (c, o) => engine.respond(c, o, key, response));
};
export const removeFriend = (owner: string, username: string) => {
  const value = usernameSchema.parse(username);
  return run(owner, (c, o) => engine.remove(c, o, value));
};
export const shareArticle = (owner: string, input: unknown) => {
  const value = shareArticleSchema.parse(input);
  return run(owner, (c, o) => engine.share(c, o, value));
};
export const dismissShare = (owner: string, id: string) => {
  const key = z.uuid().parse(id);
  return run(owner, (c, o) => engine.dismiss(c, o, key));
};
export const listFriendRecommendations = (owner: string) =>
  run(owner, async (c, o) => engine.shares(c, o, true), true);
