import { MCP_SCOPES, oauthConfig } from "@/lib/mcp-auth";

export const dynamic = "force-dynamic";
export function GET(): Response {
  const config = oauthConfig();
  if (process.env.CERULEAN_MCP_AUTH_MODE === "pilot" || !config) {
    return Response.json({ error: "OAuth is not configured" }, { status: 503 });
  }
  return Response.json({ resource: config.resource, authorization_servers: [config.issuer], scopes_supported: MCP_SCOPES,
    bearer_methods_supported: ["header"], resource_name: "Cerulean Crest" },
  { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } });
}
