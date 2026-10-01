import { createHash } from "node:crypto";
import { z } from "zod";
import { editorialConstitutionSchema } from "./editorial-settings.ts";

export const constitutionEditSchema = z.object({
  oldText: z.string().min(1).max(30_000),
  newText: z.string().max(30_000),
}).strict();

export const constitutionUpdateSchema = z.object({
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  edits: z.array(constitutionEditSchema).min(1).max(20),
}).strict();

export function constitutionRevision(markdown: string): string {
  return createHash("sha256").update(markdown).digest("hex");
}

/** Apply exact, non-overlapping edits against one known document revision. */
export function applyConstitutionEdits(markdown: string, edits: Array<{ oldText: string; newText: string }>): string {
  const ranges = edits.map((edit) => {
    const start = markdown.indexOf(edit.oldText);
    if (start < 0) throw new Error("An edited passage is not present in the current constitution. Read it again and retry.");
    if (markdown.indexOf(edit.oldText, start + 1) >= 0) throw new Error("An edited passage occurs more than once. Use a longer, unique passage.");
    return { ...edit, start, end: start + edit.oldText.length };
  }).sort((left, right) => right.start - left.start);
  for (let index = 1; index < ranges.length; index++) {
    if (ranges[index - 1].start < ranges[index].end) throw new Error("Constitution edits must not overlap.");
  }
  let updated = markdown;
  for (const range of ranges) updated = updated.slice(0, range.start) + range.newText + updated.slice(range.end);
  return editorialConstitutionSchema.parse(updated);
}

/** Reject ephemeral values introduced by an edit, while allowing unchanged policy text. */
export function copiedTransientValue(edits: Array<{ oldText: string; newText: string }>, values: string[]): string | undefined {
  return values.find((value) => {
    const normalized = value.trim().toLocaleLowerCase();
    if (normalized.length < 8) return false;
    return edits.some((edit) => {
      const before = edit.oldText.toLocaleLowerCase();
      const after = edit.newText.toLocaleLowerCase();
      return after.includes(normalized) && !before.includes(normalized);
    });
  });
}
