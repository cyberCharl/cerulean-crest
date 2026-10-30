import { protectedResourceMetadataResponse } from "@/lib/mcp-auth";

// Path-specific location (RFC 9728 §3.1). Clients that ignore the 401's
// resource_metadata pointer probe this before the root document.
export const dynamic = "force-dynamic";
export function GET(): Response {
  return protectedResourceMetadataResponse();
}
