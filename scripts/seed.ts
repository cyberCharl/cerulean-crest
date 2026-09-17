import { seedIssue } from "../lib/seed.ts";

if (process.env.VERCEL_ENV === "production") throw new Error("Demo seeding is disabled in production");
const db = process.env.DATABASE_URL ? await import("../lib/postgres-db.ts") : await import("../lib/sqlite-db.ts");
const result = await db.createIssue(process.env.CERULEAN_OWNER_SUBJECT || "demo", seedIssue);
console.log(result.created ? "Created the demo edition" : "Demo date already exists; left unchanged");
