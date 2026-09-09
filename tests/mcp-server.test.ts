import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createCeruleanMcpServer } from "../lib/mcp-server.ts";
import type { IssueInput } from "../lib/schema.ts";

const issue: IssueInput = {
  date: "2031-01-15",
  title: "Cerulean Crest",
  editorNote: "A focused edition.",
  coverageGap: null,
  availableMinutes: 12,
  expectedMinutes: 6,
  sections: [{
    title: "Read First",
    items: [{
      title: "A useful piece",
      author: "Author",
      publication: "Publication",
      publishedAt: "15 January 2031",
      readingMinutes: 12,
      type: "Essay",
      url: "https://example.com/piece",
      summary: "Why this earned a place in the edition.",
    }],
  }],
};

async function connectedClient(createEdition: (input: IssueInput) => Promise<{ issueId: number; created: boolean }>, scopes = ["editions:read", "editions:write"]) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createCeruleanMcpServer({ baseUrl: "https://cerulean.example", scopes, createEdition });
  const client = new Client({ name: "cerulean-test", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, server };
}

test("advertises the editorial brief and idempotent create tools with accurate hints", async (context) => {
  const { client, server } = await connectedClient(async () => ({ issueId: 1, created: true }));
  context.after(async () => {
    await client.close();
    await server.close();
  });

  const result = await client.listTools();
  const brief = result.tools.find((tool) => tool.name === "get_editorial_brief");
  const create = result.tools.find((tool) => tool.name === "create_daily_edition");

  assert.equal(brief?.annotations?.readOnlyHint, true);
  assert.equal(create?.annotations?.readOnlyHint, false);
  assert.equal(create?.annotations?.destructiveHint, false);
  assert.equal(create?.annotations?.openWorldHint, true);
});

test("creates a complete edition and returns its canonical URL", async (context) => {
  let received: IssueInput | undefined;
  const { client, server } = await connectedClient(async (input) => {
    received = input;
    return { issueId: 42, created: true };
  });
  context.after(async () => {
    await client.close();
    await server.close();
  });

  const result = await client.callTool({ name: "create_daily_edition", arguments: issue });

  assert.deepEqual(received, issue);
  assert.deepEqual(result.structuredContent, {
    created: true,
    date: issue.date,
    status: "created",
    url: "https://cerulean.example/issues/2031-01-15",
  });
});

test("rejects an invalid edition before calling storage", async (context) => {
  let calls = 0;
  const { client, server } = await connectedClient(async () => {
    calls += 1;
    return { issueId: 1, created: true };
  });
  context.after(async () => {
    await client.close();
    await server.close();
  });

  const invalid = structuredClone(issue);
  invalid.availableMinutes = 100;
  const result = await client.callTool({ name: "create_daily_edition", arguments: invalid });

  assert.equal(result.isError, true);
  assert.equal(calls, 0);
});

test("read-only authorization cannot publish, and the brief specifies date and timezone", async (context) => {
  let writes = 0;
  const { client, server } = await connectedClient(async () => { writes++; return { issueId: 1, created: true }; }, ["editions:read"]);
  context.after(async () => { await client.close(); await server.close(); });
  const result = await client.callTool({ name: "create_daily_edition", arguments: issue });
  assert.equal(result.isError, true);
  assert.equal(writes, 0);
  const brief = await client.callTool({ name: "get_editorial_brief", arguments: {} });
  const parsed = JSON.parse(String((brief.structuredContent as Record<string, unknown>)?.brief));
  assert.match(parsed.localDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(typeof parsed.timeZone, "string");
});
