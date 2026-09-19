import { z } from "zod";

// Preserve the exact URL used in an edition: different paths, query strings and
// fragments can identify different articles. Never normalize across publishers.
export const articleUrlSchema = z.string().url().max(8000).refine(value => {
  const protocol = new URL(value).protocol;
  return protocol === "https:" || protocol === "http:";
}, "Use an HTTP or HTTPS article URL");
export const articleFeedbackUpdateSchema = z.object({
  url: articleUrlSchema,
  saved: z.boolean().optional(),
  reaction: z.enum(["more", "less"]).nullable().optional(),
  note: z.string().trim().max(2000).optional(),
}).strict().refine(value => value.saved !== undefined || value.reaction !== undefined || value.note !== undefined, "Provide a save, reaction or note change");
export const articleFeedbackListSchema = z.object({
  urls: z.array(articleUrlSchema).max(1000).optional(),
  savedOnly: z.boolean().optional(),
  feedbackOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
}).strict();
export type ArticleFeedbackUpdate = z.infer<typeof articleFeedbackUpdateSchema>;
export type ArticleFeedbackListOptions = z.infer<typeof articleFeedbackListSchema>;
export type ArticleFeedback = {
  url: string;
  title: string;
  publication: string;
  saved: boolean;
  reaction: "more" | "less" | null;
  note: string;
  updatedAt: string;
};
export class ArticleNotFoundError extends Error {
  constructor() { super("Article not found in your editions or saved feedback"); this.name = "ArticleNotFoundError"; }
}
export type ArticleFeedbackRow = Omit<ArticleFeedback, "saved" | "updatedAt"> & { saved: boolean | number; updated_at: string };
export function articleFeedbackFromRow(row: ArticleFeedbackRow): ArticleFeedback {
  return { url: row.url, title: row.title, publication: row.publication, saved: Boolean(row.saved), reaction: row.reaction, note: row.note, updatedAt: row.updated_at };
}
