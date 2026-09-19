"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/browser-auth";
import { updateArticleFeedback } from "@/lib/db";
import { articleFeedbackUpdateSchema, type ArticleFeedback } from "@/lib/article-feedback";

export async function changeArticleFeedback(input: unknown): Promise<{ feedback: ArticleFeedback; error?: never } | { error: string; feedback?: never }> {
  const user = await getUser();
  if (!user) return { error: "Your session has ended. Sign in again to save your changes." };
  const parsed = articleFeedbackUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: "Please check your feedback. Notes can contain up to 2,000 characters." };
  try {
    const feedback = await updateArticleFeedback(user.subject, parsed.data);
    revalidatePath("/saved");
    revalidatePath("/settings");
    revalidatePath("/issues/[date]", "page");
    return { feedback };
  } catch {
    return { error: "Your changes could not be saved. Please try again." };
  }
}
