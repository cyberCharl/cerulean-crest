export function requireOwner(subject: string): string {
  if (typeof subject !== "string" || !subject.trim()) throw new Error("An authenticated owner subject is required");
  return subject;
}
