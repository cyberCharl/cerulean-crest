import { z } from "zod";

export const readerThemeSchema = z.enum(["quiet-book", "tactile-correspondence"]);
export type ReaderTheme = z.infer<typeof readerThemeSchema>;
export const defaultReaderTheme: ReaderTheme = "quiet-book";

export function readerTheme(settings: { theme?: ReaderTheme }): ReaderTheme {
  return settings.theme ?? defaultReaderTheme;
}
