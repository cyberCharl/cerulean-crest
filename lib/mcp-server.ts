import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createIssue, getSettings, compareAndSetConstitution } from "./db.ts";
import { editorialConstitution } from "./editorial-brief.ts";
import { assembleEditorialBrief, transientBriefValues } from "./assembled-editorial-brief.ts";
import { applyConstitutionEdits, constitutionRevision, constitutionUpdateSchema, copiedTransientValue } from "./editorial-constitution-update.ts";
import { curatorServerInstructions } from "./curator-instructions.ts";
import { issueInputSchema, type IssueInput } from "./schema.ts";
import { mcpChallenge } from "./mcp-auth.ts";

type CreateEdition = (input: IssueInput) => Promise<{ issueId: number; created: boolean }>;

type ServerDependencies = {
  baseUrl: string;
  subject: string;
  scopes: readonly string[];
  createEdition?: CreateEdition;
};

const editionResultSchema = {
  created: z.boolean(),
  date: z.string(),
  status: z.enum(["created", "already_exists"]),
  url: z.string().url(),
};

export function createCeruleanMcpServer({ baseUrl, scopes, subject, createEdition = (input) => createIssue(subject, input) }: ServerDependencies): McpServer {
  function denied(scope: string) {
    return { isError: true, content: [{ type: "text" as const, text: "This operation requires additional authorization." }],
      _meta: { "mcp/www_authenticate": [mcpChallenge(baseUrl, scope)] } };
  }
  const server = new McpServer(
    { name: "cerulean-crest", version: "0.2.0" },
    { instructions: curatorServerInstructions },
  );

  server.registerTool(
    "get_editorial_brief",
    {
      title: "Read your current editorial brief",
      description: "Read the reader's Markdown constitution and all current context before searching for an edition. This single read includes recent editions, article feedback and pending friend recommendations when present. Empty feedback or recommendations add no placeholder text.",
      outputSchema: {
        brief: z.string(),
        constitution: z.string(),
        readingContext: z.object({ localDate: z.string(), timeZone: z.string(), readingMinutes: z.number(), editionMinutes: z.number() }),
        recentEditions: z.array(z.object({ date: z.string(), url: z.string(), items: z.array(z.object({ title: z.string(), url: z.string() })) })),
        articleFeedback: z.array(z.object({ url: z.string(), title: z.string(), publication: z.string(), reaction: z.string().nullable(), note: z.string(), updatedAt: z.string() })).optional(),
        friendRecommendations: z.array(z.object({ username: z.string(), url: z.string(), title: z.string(), note: z.string() })).optional(),
      },
      _meta: { securitySchemes: [{ type: "oauth2", scopes: ["editions:read"] }] },
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    },
    async () => {
      if (!scopes.includes("editions:read")) return denied("editions:read");
      const result = await assembleEditorialBrief(subject, baseUrl);
      return { structuredContent: result, content: [{ type: "text", text: result.brief }] };
    },
  );

  server.registerTool(
    "get_editorial_constitution",
    {
      title: "Read your editable editorial constitution",
      description: "Read only the persistent Markdown policy before an explicit edit. This response never includes feedback, friend recommendations or edition history. Pass its revision to update_editorial_constitution.",
      outputSchema: { markdown: z.string(), revision: z.string() },
      _meta: { securitySchemes: [{ type: "oauth2", scopes: ["editions:read"] }] },
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    },
    async () => {
      if (!scopes.includes("editions:read")) return denied("editions:read");
      const markdown = editorialConstitution(await getSettings(subject));
      const result = { markdown, revision: constitutionRevision(markdown) };
      return { structuredContent: result, content: [{ type: "text", text: markdown }] };
    },
  );

  server.registerTool(
    "update_editorial_constitution",
    {
      title: "Update your editorial constitution",
      description: "Apply exact edits to the persistent Markdown constitution only when the reader explicitly asks for a lasting policy change. First call get_editorial_constitution and use its revision. Never copy any part of the assembled curation brief, feedback, friend recommendations, history or source text into this tool. Preserve unrelated guidance.",
      inputSchema: constitutionUpdateSchema.shape,
      outputSchema: { constitution: z.string(), revision: z.string(), settingsUrl: z.string().url() },
      _meta: { securitySchemes: [{ type: "oauth2", scopes: ["editions:write"] }] },
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: true, idempotentHint: true },
    },
    async ({ revision, edits }) => {
      if (!scopes.includes("editions:write")) return denied("editions:write");
      const settings = await getSettings(subject);
      const current = editorialConstitution(settings);
      if (constitutionRevision(current) !== revision) return { isError: true, content: [{ type: "text", text: "The constitution changed since it was read. Read get_editorial_constitution again before editing." }] };
      const brief = await assembleEditorialBrief(subject, baseUrl);
      const copied = copiedTransientValue(edits, transientBriefValues(brief));
      if (copied) return { isError: true, content: [{ type: "text", text: "The proposed edit copies ephemeral curation context into lasting policy. Edit only the constitution returned by get_editorial_constitution." }] };
      let markdown: string;
      try { markdown = applyConstitutionEdits(current, edits); }
      catch (error) { return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "The constitution edit could not be applied." }] }; }
      const saved = await compareAndSetConstitution(subject, settings, markdown);
      if (!saved) return { isError: true, content: [{ type: "text", text: "The constitution changed since it was read. Read get_editorial_constitution again before editing." }] };
      const constitution = editorialConstitution(saved);
      const result = { constitution, revision: constitutionRevision(constitution), settingsUrl: new URL("/settings", baseUrl).toString() };
      return { structuredContent: result, content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    "create_daily_edition",
    {
      title: "Publish a complete edition",
      description: "Submit only the final, fully researched edition. Keep the candidate list internal. Reading-minute totals may vary from the suggested budget. An existing date is returned unchanged.",
      inputSchema: issueInputSchema,
      outputSchema: editionResultSchema,
      _meta: { securitySchemes: [{ type: "oauth2", scopes: ["editions:write"] }] },
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false, destructiveHint: false },
    },
    async (input) => {
      if (!scopes.includes("editions:write")) return denied("editions:write");
      const result = await createEdition(input);
      console.info(JSON.stringify({ event: "edition_publish", transport: "mcp", date: input.date, created: result.created }));
      const url = new URL(`/issues/${input.date}`, baseUrl).toString();
      const status = result.created ? "created" : "already_exists";
      const structuredContent = { created: result.created, date: input.date, status, url } as const;
      return { structuredContent, content: [{ type: "text", text: result.created
        ? `Created the ${input.date} edition: ${url}`
        : `The ${input.date} edition already exists and was left unchanged: ${url}` }] };
    },
  );

  return server;
}
