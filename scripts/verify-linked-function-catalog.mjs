import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const SUPABASE_CLI_PATH = fileURLToPath(
  new URL("../node_modules/supabase/dist/supabase.js", import.meta.url)
);

const FUNCTION_CATALOG_QUERY = `
SELECT
  format(
    '%I.%I(%s)',
    namespace.nspname,
    procedure.proname,
    pg_get_function_identity_arguments(procedure.oid)
  ) AS signature,
  md5(replace(procedure.prosrc, chr(13), '')) AS definition_hash,
  md5(concat_ws(
    '|',
    pg_get_function_arguments(procedure.oid),
    pg_get_function_result(procedure.oid),
    procedure.prosecdef::text,
    procedure.provolatile::text,
    procedure.proparallel::text,
    procedure.proleakproof::text,
    procedure.proisstrict::text,
    procedure.proretset::text,
    procedure.prokind::text,
    coalesce(array_to_string(procedure.proconfig, ','), ''),
    pg_get_userbyid(procedure.proowner),
    coalesce(array_to_string(procedure.proacl, ','), '')
  )) AS metadata_hash,
  length(procedure.prosrc) - length(replace(procedure.prosrc, chr(13), '')) AS cr_count
FROM pg_proc AS procedure
JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
WHERE namespace.nspname IN ('public', 'private')
  AND NOT EXISTS (
    SELECT 1
    FROM pg_depend AS dependency
    WHERE dependency.classid = 'pg_proc'::regclass
      AND dependency.objid = procedure.oid
      AND dependency.deptype = 'e'
  )
ORDER BY signature;
`.trim();

/** @typedef {{ signature: string, definition_hash: string, metadata_hash: string, cr_count: number }} FunctionCatalogRow */

export function parseSupabaseQueryOutput(output) {
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");

  if (firstBrace < 0 || lastBrace < firstBrace) {
    throw new Error("Supabase query did not return a JSON payload.");
  }

  const payload = JSON.parse(output.slice(firstBrace, lastBrace + 1));
  if (!Array.isArray(payload.rows)) {
    throw new Error("Supabase query JSON does not contain a rows array.");
  }

  return payload.rows;
}

/**
 * @param {FunctionCatalogRow[]} localRows
 * @param {FunctionCatalogRow[]} linkedRows
 */
export function compareFunctionCatalogs(localRows, linkedRows) {
  const local = new Map(localRows.map((row) => [row.signature, row]));
  const linked = new Map(linkedRows.map((row) => [row.signature, row]));
  const signatures = [...new Set([...local.keys(), ...linked.keys()])].sort();
  const differences = [];

  for (const signature of signatures) {
    const localRow = local.get(signature);
    const linkedRow = linked.get(signature);

    if (!localRow) {
      differences.push({
        signature,
        reason: "missing-local",
        local: "missing",
        linked: "present",
      });
      continue;
    }
    if (!linkedRow) {
      differences.push({
        signature,
        reason: "missing-linked",
        local: "present",
        linked: "missing",
      });
      continue;
    }
    if (localRow.definition_hash !== linkedRow.definition_hash) {
      differences.push({
        signature,
        reason: "definition",
        local: localRow.definition_hash,
        linked: linkedRow.definition_hash,
      });
    }
    if (localRow.metadata_hash !== linkedRow.metadata_hash) {
      differences.push({
        signature,
        reason: "metadata",
        local: localRow.metadata_hash,
        linked: linkedRow.metadata_hash,
      });
    }
  }

  return { matches: differences.length === 0, differences };
}

function runCatalogQuery(scope, projectDir) {
  const invocation = buildSupabaseInvocation(scope, projectDir);
  const result = spawnSync(
    invocation.command,
    invocation.args,
    { encoding: "utf8", shell: false }
  );

  if (result.status !== 0) {
    const detail = (
      result.error?.message ||
      result.stderr ||
      result.stdout ||
      "unknown CLI error"
    ).trim();
    throw new Error(`Supabase ${scope} catalog query failed: ${detail}`);
  }

  return parseSupabaseQueryOutput(result.stdout);
}

export function buildSupabaseInvocation(scope, projectDir) {
  return {
    command: process.execPath,
    args: [
      SUPABASE_CLI_PATH,
      "db",
      "query",
      scope,
      FUNCTION_CATALOG_QUERY,
      "--workdir",
      projectDir,
    ],
  };
}

function projectDirFromArgs(args) {
  const index = args.indexOf("--project-dir");
  if (index < 0) return process.cwd();
  if (!args[index + 1]) throw new Error("--project-dir requires a path.");
  return args[index + 1];
}

function main() {
  const projectDir = projectDirFromArgs(process.argv.slice(2));
  const localRows = runCatalogQuery("--local", projectDir);
  const linkedRows = runCatalogQuery("--linked", projectDir);
  const comparison = compareFunctionCatalogs(localRows, linkedRows);

  if (!comparison.matches) {
    console.error("Project function catalogs differ semantically:");
    console.error(JSON.stringify(comparison.differences, null, 2));
    process.exitCode = 1;
    return;
  }

  const linkedBySignature = new Map(linkedRows.map((row) => [row.signature, row]));
  const lineEndingOnly = localRows.filter(
    (row) => row.cr_count !== linkedBySignature.get(row.signature)?.cr_count
  );

  console.log(
    `Project function catalogs match semantically (${localRows.length} functions).`
  );
  console.log(
    `Line-ending-only differences: ${lineEndingOnly.length} function${
      lineEndingOnly.length === 1 ? "" : "s"
    }.`
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  main();
}
