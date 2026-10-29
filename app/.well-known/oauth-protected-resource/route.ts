import { protectedResourceMetadataResponse } from "@/lib/mcp-auth";

export const dynamic = "force-dynamic";
export function GET(): Response {
  return protectedResourceMetadataResponse();
}
