import { timingSafeEqual } from "node:crypto";

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAuthorized(authorization: string | null): boolean {
  const expectedUser = process.env.CERULEAN_API_USER;
  const expectedPassword = process.env.CERULEAN_API_PASSWORD;
  if (!expectedUser || !expectedPassword || !authorization?.startsWith("Basic ")) return false;

  try {
    const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator === -1) return false;
    return safeEqual(decoded.slice(0, separator), expectedUser)
      && safeEqual(decoded.slice(separator + 1), expectedPassword);
  } catch {
    return false;
  }
}
