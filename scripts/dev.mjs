import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
config({ quiet: true });

// Only manage the workspace cluster created by setup-local-db.ps1.
// Other database connections remain under their owner's control.
let databaseUrl;
try { databaseUrl = new URL(process.env.DATABASE_URL); } catch {
  console.error("Set a valid DATABASE_URL in .env before running npm run dev.");
  process.exit(1);
}
if (process.platform === "win32" &&
    ["postgres:", "postgresql:"].includes(databaseUrl.protocol) &&
    ["127.0.0.1", "localhost"].includes(databaseUrl.hostname) &&
    databaseUrl.port === "55474" && existsSync(".storage/postgres/PG_VERSION")) {
  console.log("Checking local PostgreSQL...");
  const database = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/start-local-db.ps1"], { stdio: "inherit" });
  const databaseCode = await new Promise((resolve) => {
    database.once("error", () => resolve(1));
    database.once("exit", resolve);
  });
  if (databaseCode !== 0) {
    console.error("Local PostgreSQL could not start. Check .storage/postgres.log for details.");
    process.exit(1);
  }
}
// Register newly shipped templates before accepting book requests or starting jobs.
// Use the local seed entry point so startup does not depend on Prisma CLI downloads.
const seed = spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"], { stdio: "inherit" });
const seedCode = await new Promise((resolve, reject) => {
  seed.once("error", reject);
  seed.once("exit", resolve);
});
if (seedCode !== 0) {
  console.error("Could not initialize puzzle templates. Start PostgreSQL and check DATABASE_URL in .env, then run npm run dev again.");
  process.exit(seedCode ?? 1);
}
const children = [
  spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "watch", "src/jobs/main.ts"], { stdio: "inherit" }),
  spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", ...process.argv.slice(2)], { stdio: "inherit" }),
];
let stopping = false;
function stop() { if (stopping) return; stopping = true; children.forEach(child => child.kill("SIGTERM")); }
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, stop);
children.forEach(child => child.on("exit", code => { stop(); process.exitCode = code ?? 0; }));
