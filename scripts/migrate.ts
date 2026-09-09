import { migrate } from "../lib/migrations.ts";

const connection = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connection) throw new Error("Set DATABASE_URL_UNPOOLED for the intended environment before migrating");
try {
  const applied = await migrate(connection);
  console.log(applied.length ? `Applied migrations: ${applied.join(", ")}` : "Database schema is up to date");
} catch (error) {
  console.error("Migration failed", error instanceof Error ? error.name : "unknown error");
  process.exitCode = 1;
}
