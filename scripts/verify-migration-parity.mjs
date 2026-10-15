import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { findParityGaps, migrationVersionOf } from "./migrations-lib.mjs";

/**
 * Migration parity gate (Faze 5, krok 5).
 *
 * Compares the migration files committed in `supabase/migrations` with the
 * versions a database reports as applied. Drift in either direction means the
 * schema on disk and the schema in the database disagree, which makes every
 * later measurement meaningless.
 *
 * Usage:
 *   node scripts/verify-migration-parity.mjs            # local Docker database
 *   node scripts/verify-migration-parity.mjs --linked   # linked remote project
 *
 * The check reads the history through `supabase migration list`, so it also
 * works against the linked project when the local database is not running.
 */

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");
const target = process.argv.includes("--linked") ? "--linked" : "--local";

const localFiles = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith(".sql"))
  .sort();
const localVersions = localFiles.map(migrationVersionOf);

console.log(`Migration parity gate (${target === "--linked" ? "linked project" : "local database"})`);
console.log(`Migration files on disk: ${localFiles.length}`);

const cli = spawnSync("npx", ["supabase", "migration", "list", target], {
  encoding: "utf8",
  shell: true,
});

if (cli.status !== 0) {
  console.error("\nCould not read the migration history.");
  console.error((cli.stderr || "").trim() || (cli.stdout || "").trim());
  process.exit(2);
}

let rows;
try {
  // The CLI can print informational lines before the JSON payload.
  const jsonStart = cli.stdout.indexOf("{");
  if (jsonStart === -1) throw new Error("no JSON payload");
  rows = JSON.parse(cli.stdout.slice(jsonStart)).migrations ?? [];
} catch {
  console.error("\nCould not parse the migration list output.");
  console.error((cli.stdout || "").trim());
  process.exit(2);
}

const appliedVersions = rows.map((row) => row.remote).filter(Boolean).sort();
const gaps = findParityGaps({ localVersions, appliedVersions });

console.log(`Versions applied in the database: ${appliedVersions.length}`);

if (gaps.missingInDatabase.length === 0 && gaps.missingOnDisk.length === 0) {
  console.log("\nMIGRATION PARITY OK. Disk and database agree on every version.");
  process.exit(0);
}

if (gaps.missingInDatabase.length > 0) {
  console.error("\nMISSING IN DATABASE (declared in the repository, never applied):");
  for (const version of gaps.missingInDatabase) console.error(`- ${version}`);
}

if (gaps.missingOnDisk.length > 0) {
  console.error("\nMISSING ON DISK (applied in the database, no file in the repository):");
  for (const version of gaps.missingOnDisk) console.error(`- ${version}`);
}

console.error("\nMIGRATION PARITY FAILED.");
process.exit(1);
