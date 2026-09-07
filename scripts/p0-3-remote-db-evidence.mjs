import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  makeFailureReport,
  runLinkedEvidence,
} from "./p0-3-remote-db-evidence-lib.mjs";

const cliPath = fileURLToPath(
  new URL("../node_modules/supabase/dist/supabase.js", import.meta.url),
);
const sqlFile = fileURLToPath(
  new URL("./p0-3-remote-db-evidence.sql", import.meta.url),
);

export function runFromProcess({ env = process.env, args = process.argv.slice(2) } = {}) {
  const mode = args.includes("--allow-linked-test-writes")
    ? "transactional-test"
    : "read-only";

  let sql;
  try {
    sql = readFileSync(sqlFile, "utf8");
  } catch {
    return {
      exitCode: 1,
      report: makeFailureReport({
        failureCode: "MISSING_EVIDENCE_SQL",
        mode,
      }),
    };
  }

  return runLinkedEvidence({
    env,
    paths: {
      cliPath,
      workdir: process.cwd(),
    },
    sql,
    sqlFile,
    mode,
  });
}

export function main() {
  const result = runFromProcess();
  console.log(JSON.stringify(result.report, null, 2));
  process.exitCode = result.exitCode;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) main();
