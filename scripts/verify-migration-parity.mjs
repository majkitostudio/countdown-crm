import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
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

export function parseMigrationList(output) {
  const payload = JSON.parse(output);
  if (!payload || !Array.isArray(payload.migrations)) throw new Error("missing migrations array");
  return payload.migrations.map((row) => {
    if (!row || typeof row.local !== "string" || typeof row.remote !== "string" ||
        (row.local !== "" && !/^\d+$/.test(row.local)) ||
        (row.remote !== "" && !/^\d+$/.test(row.remote)) ||
        (!row.local && !row.remote)) {
      throw new Error("invalid migration row");
    }
    return row.remote;
  }).filter(Boolean).sort();
}

export function runParity(args, run = spawnSync) {
  if (args.some((arg) => arg !== "--linked") || args.length > 1) {
    console.error("Usage: node scripts/verify-migration-parity.mjs [--linked]");
    return 2;
  }
  const linked = args.includes("--linked");
  const localFiles = readdirSync(resolve(process.cwd(), "supabase/migrations"))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const localVersions = localFiles.map(migrationVersionOf);

  console.log(`Migration parity gate (${linked ? "linked project" : "local database"})`);
  console.log(`Migration files on disk: ${localFiles.length}`);

  const cli = run(process.execPath, [
    resolve(process.cwd(), "node_modules/supabase/dist/supabase.js"),
    "migration", "list", linked ? "--linked" : "--local", "--output-format", "json",
  ], {
    encoding: "utf8",
  });

  if (cli.status !== 0) {
    console.error("\nCould not read the migration history.");
    console.error((cli.stderr || "").trim() || (cli.stdout || "").trim() || cli.error?.message || "CLI failed");
    return 2;
  }

  let appliedVersions;
  try {
    appliedVersions = parseMigrationList(cli.stdout);
  } catch {
    console.error("\nCould not parse the migration list output.");
    return 2;
  }

  const gaps = findParityGaps({ localVersions, appliedVersions });

  console.log(`Versions applied in the database: ${appliedVersions.length}`);

  if (gaps.missingInDatabase.length === 0 && gaps.missingOnDisk.length === 0) {
    console.log("\nMIGRATION PARITY OK. Disk and database agree on every version.");
    return 0;
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
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = runParity(process.argv.slice(2));
}
