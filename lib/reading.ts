import { z } from "zod";

export const readingUrlSchema = z.string().trim().min(1).max(2048).refine(value => {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
}, "Use a complete HTTP or HTTPS link without credentials.");
export const commitmentSchema = z.enum(["candidate", "later", "pinned"]);
export type Commitment = z.infer<typeof commitmentSchema>;
export const captureLinkSchema = z.object({ url: readingUrlSchema, title: z.string().trim().max(300).optional() }).strict();
export const readingLinkUpdateSchema = z.object({
  url: readingUrlSchema, commitment: commitmentSchema.optional(), dormant: z.boolean().optional(), read: z.boolean().optional(),
}).strict().refine(value => value.commitment !== undefined || value.dormant !== undefined || value.read !== undefined, "Choose a change.");
export type ReadingLink = {
  url: string; title: string; publication: string; readingMinutes: number | null;
  commitment: Commitment; dormant: boolean; read: boolean;
  metadataStatus: "pending" | "fetching" | "ready" | "unavailable";
  eligibleAfter: number; lastPresentedAt: string | null; updatedAt: string;
};
export type ReadingEdition = { date: string; revision: string; front: ReadingLink[]; inside: ReadingLink[]; retired: boolean; insidePresented: boolean };
export type ReadingConnection = { query(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]> };

export function readingLinkFromRow(row: Record<string, unknown>): ReadingLink {
  return { url: String(row.url), title: String(row.title), publication: String(row.publication),
    readingMinutes: row.reading_minutes == null ? null : Number(row.reading_minutes),
    commitment: row.commitment as Commitment, dormant: Boolean(row.dormant), read: Boolean(row.is_read),
    metadataStatus: row.metadata_status as ReadingLink["metadataStatus"], eligibleAfter: Number(row.eligible_after),
    lastPresentedAt: row.last_presented_at == null ? null : String(row.last_presented_at), updatedAt: String(row.updated_at) };
}
