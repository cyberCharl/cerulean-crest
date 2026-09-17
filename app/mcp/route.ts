import { configuredAppOrigin } from "@/lib/site-config";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authorizeMcpRequest, mcpAuthConfigured, mcpChallenge } from "@/lib/mcp-auth";
import { createCeruleanMcpServer } from "@/lib/mcp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedMethods = "GET, POST, DELETE, OPTIONS";
const allowedHeaders = "Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID";

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": allowedMethods,
    "Access-Control-Allow-Headers": allowedHeaders,
    "Access-Control-Expose-Headers": "MCP-Protocol-Version, MCP-Session-Id",
  };
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

async function handleMcpRequest(request: Request): Promise<Response> {
  if (!mcpAuthConfigured()) return Response.json({ error: "MCP authentication is not configured" }, { status: 503, headers: corsHeaders() });
  const authInfo = await authorizeMcpRequest(request.headers.get("authorization"));
  if (!authInfo) {
    return Response.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          ...corsHeaders(),
          "WWW-Authenticate": mcpChallenge(new URL(request.url).origin),
        },
      },
    );
  }

  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  const server = createCeruleanMcpServer({ baseUrl: configuredAppOrigin() || new URL(request.url).origin, scopes: authInfo.scopes, subject: String(authInfo.extra?.subject || "") });
  await server.connect(transport);
  const response = await transport.handleRequest(request, { authInfo });

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  for (const [name, value] of Object.entries(corsHeaders())) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
export const DELETE = handleMcpRequest;
