import { isAuthorized } from "@/lib/auth";
import { getIssue, replaceIssue } from "@/lib/db";
import { issueInputSchema } from "@/lib/schema";

type RouteContext = { params: Promise<{ date: string }> };

function unauthorizedResponse() {
  return Response.json(
    { error: "Unauthorized" },
    { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Cerulean Crest API", charset="UTF-8"' } },
  );
}

export async function PUT(request: Request, { params }: RouteContext) {
  if (!isAuthorized(request.headers.get("authorization"))) return unauthorizedResponse();

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const { date } = await params;
  const parsed = issueInputSchema.safeParse(input);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid issue", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  if (parsed.data.date !== date) {
    return Response.json({ error: "Body date must match the URL date" }, { status: 409 });
  }

  const result = await replaceIssue(parsed.data);
  console.info(JSON.stringify({ event: "edition_publish", transport: "api", date, created: result.created }));
  return Response.json(
    { ok: true, date, url: `/issues/${date}` },
    { status: result.created ? 201 : 200 },
  );
}

export async function GET(request: Request, { params }: RouteContext) {
  if (!isAuthorized(request.headers.get("authorization"))) return unauthorizedResponse();
  const { date } = await params;
  const issue = await getIssue(date);
  return issue ? Response.json(issue) : Response.json({ error: "Issue not found" }, { status: 404 });
}
