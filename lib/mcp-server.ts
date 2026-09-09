import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createIssue, getIssue, listIssues } from "./db.ts";
import { editorialBrief } from "./editorial-brief.ts";
import { issueInputSchema, type IssueInput } from "./schema.ts";
import { APP_TIME_ZONE, todayDate } from "./date.ts";
import { mcpChallenge } from "./mcp-auth.ts";

type CreateEdition = (input: IssueInput) => Promise<{ issueId: number; created: boolean }>;

type ServerDependencies = {
  baseUrl: string;
  scopes: readonly string[];
  createEdition?: CreateEdition;
};

const editionResultSchema = {
  created: z.boolean(),
  date: z.string(),
  status: z.enum(["created", "already_exists"]),
  url: z.string().url(),
};

export function createCeruleanMcpServer({ baseUrl, scopes, createEdition = createIssue }: ServerDependencies): McpServer {
  function denied(scope: string) {
    return { isError: true, content: [{ type: "text" as const, text: "This operation requires additional authorization." }],
      _meta: { "mcp/www_authenticate": [mcpChallenge(baseUrl, scope)] } };
  }
  const server = new McpServer(
    { name: "cerulean-crest", version: "0.1.0" },
    {
      instructions:
        "Call get_editorial_brief before composing an edition. Call create_daily_edition exactly once with a complete, validated edition; an existing date is returned unchanged.",
    },
  );

  server.registerTool(
    "get_editorial_brief",
    {
      title: "Get the Cerulean Crest editorial brief",
      description: "Use before curating an edition to retrieve its attention budget, selection principles, and publishing invariants.",
      outputSchema: { brief: z.string(), rules: z.array(z.string()) },
      _meta: { securitySchemes: [{ type: "oauth2", scopes: ["editions:read"] }] },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    async () => {
      if (!scopes.includes("editions:read")) return denied("editions:read");
      const rules = [...editorialBrief.selectionRules, ...editorialBrief.publishingRules];
      const brief = JSON.stringify({ ...editorialBrief, localDate: todayDate(), timeZone: APP_TIME_ZONE });
      return {
        structuredContent: { brief, rules },
        content: [{ type: "text", text: brief }],
      };
    },
  );

  server.registerTool(
    "get_recent_editions",
    {
      title: "Get recent Cerulean Crest editions",
      description: "Review recent source URLs before selection to avoid repeating recommendations across days.",
      inputSchema: { limit: z.number().int().min(1).max(14).default(7) },
      _meta: { securitySchemes: [{ type: "oauth2", scopes: ["editions:read"] }] },
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    },
    async ({ limit }) => {
      if (!scopes.includes("editions:read")) return denied("editions:read");
      const summaries = (await listIssues()).slice(0, limit);
      const issues = await Promise.all(summaries.map((summary) => getIssue(summary.date)));
      const editions = issues.filter((issue) => issue !== null).map((issue) => ({ date: issue.date,
        url: new URL(`/issues/${issue.date}`, baseUrl).toString(),
        items: issue.sections.flatMap((section) => section.items.map((item) => ({ title: item.title, url: item.url }))) }));
      return { content: [{ type: "text", text: JSON.stringify({ editions }) }], structuredContent: { editions } };
    },
  );

  server.registerTool(
    "create_daily_edition",
    {
      title: "Create today's Cerulean Crest edition",
      description:
        "Create one complete daily edition after curation is finished. This is idempotent: if that date already exists, it is returned unchanged and is never overwritten.",
      inputSchema: issueInputSchema,
      outputSchema: editionResultSchema,
      _meta: { securitySchemes: [{ type: "oauth2", scopes: ["editions:write"] }] },
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
        openWorldHint: true,
        destructiveHint: false,
      },
    },
    async (input) => {
      if (!scopes.includes("editions:write")) return denied("editions:write");
      const result = await createEdition(input);
      console.info(JSON.stringify({ event: "edition_publish", transport: "mcp", date: input.date, created: result.created }));
      const url = new URL(`/issues/${input.date}`, baseUrl).toString();
      const status = result.created ? "created" : "already_exists";
      const structuredContent = { created: result.created, date: input.date, status, url } as const;
      return {
        structuredContent,
        content: [{
          type: "text",
          text: result.created
            ? `Created the ${input.date} edition: ${url}`
            : `The ${input.date} edition already exists and was left unchanged: ${url}`,
        }],
      };
    },
  );

  return server;
}
