import { z } from "zod";
import { isIssueDate } from "./date.ts";

export const issueItemSchema = z.object({
  title: z.string().trim().min(1).max(300),
  author: z.string().trim().min(1).max(200),
  publication: z.string().trim().min(1).max(160),
  publishedAt: z.string().trim().min(1).max(80),
  readingMinutes: z.number().int().min(1).max(240),
  type: z.string().trim().min(1).max(160),
  url: z.url({ protocol: /^https?$/ }).max(2048),
  summary: z.string().trim().min(1).max(2000),
});

export const issueSectionSchema = z.object({
  title: z.string().trim().min(1).max(100),
  items: z.array(issueItemSchema).min(1).max(50),
});

export const issueInputSchema = z.object({
  date: z.string().refine(isIssueDate, "date must be a real calendar date in YYYY-MM-DD form"),
  title: z.string().trim().min(1).max(120).default("Cerulean Crest"),
  editorNote: z.string().trim().min(1).max(4000),
  coverageGap: z.string().trim().max(2000).nullable().optional(),
  availableMinutes: z.number().int().min(1).max(1440),
  expectedMinutes: z.number().int().min(1).max(1440),
  sections: z.array(issueSectionSchema).min(1).max(20),
}).superRefine((issue, context) => {
  const total = issue.sections.reduce(
    (sum, section) => sum + section.items.reduce((itemSum, item) => itemSum + item.readingMinutes, 0),
    0,
  );
  if (Math.abs(total - issue.availableMinutes) > 2) {
    context.addIssue({
      code: "custom",
      path: ["availableMinutes"],
      message: `must be within 2 minutes of the item total (${total})`,
    });
  }
});

export type IssueInput = z.infer<typeof issueInputSchema>;
export type IssueItem = IssueInput["sections"][number]["items"][number] & {
  id: number;
  number: number;
};
export type Issue = Omit<IssueInput, "sections"> & {
  id: number;
  createdAt: string;
  updatedAt: string;
  sections: Array<{
    id: number;
    title: string;
    items: IssueItem[];
  }>;
};

export type IssueSummary = Pick<Issue, "date" | "title" | "availableMinutes" | "expectedMinutes"> & {
  itemCount: number;
};
