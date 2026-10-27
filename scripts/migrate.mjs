import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { pendingMigrations } from "./migration-plan.mjs";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.log("No DATABASE_URL set — skipping SQL migrate (PGLite applies files on boot).");
  process.exit(0);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "migrations");
const names = (await readdir(dir).catch(() => [])).filter((name) => name.endsWith(".sql"));
const files = names.map((name) => path.join(dir, name));

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query(
    "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const { rows } = await client.query("select name from _migrations");
  const done = rows.map((row) => row.name);
  for (const { name, path: file } of pendingMigrations(files, done)) {
    const sql = await readFile(file, "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into _migrations (name) values ($1)", [name]);
      await client.query("commit");
      console.log(`applied ${name}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
} finally {
  await client.end();
}
