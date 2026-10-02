import "dotenv/config";
import { Client } from "pg";
import { spawn, spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) throw new Error("Set up the local database first.");
const url = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Browser fixtures require a local database server.");
const client = new Client({ connectionString: url.toString() });
await client.connect();
try {
  const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", ["nicheforge_ui_test"]);
  if (!existing.rowCount) await client.query('CREATE DATABASE "nicheforge_ui_test"');
} finally { await client.end(); }
url.pathname = "/nicheforge_ui_test";
const env = { ...process.env, DATABASE_URL: url.toString(), APP_ORIGIN: "http://localhost:3101", NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? ".next-browser" };
const migration = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env, stdio: "inherit" });
if (migration.status !== 0) process.exit(migration.status ?? 1);
const seed = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"], { env, stdio: "inherit" });
if (seed.status !== 0) process.exit(seed.status ?? 1);
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", "3101"], { env, stdio: "inherit" });
const worker = spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "watch", "src/jobs/main.ts"], { env, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { child.kill(signal); worker.kill(signal); });
child.on("exit", code => { worker.kill(); process.exit(code ?? 0); });
