import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import process from "node:process";

const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;
const FORBIDDEN_SQL_PATTERN = /\b(insert|update|delete|merge|alter|drop|create|grant|revoke|truncate|copy|vacuum|refresh|call)\b/i;
const SENSITIVE_ENV_PATTERN = /(secret|token|password|credential|private[_-]?key)/i;
export const EVIDENCE_CHECK_KEYS = new Set([
  "public_rpc_boundaries",
  "public_rpc_grants",
  "public_rpc_search_path",
  "private_rpc_implementations",
  "private_rpc_grants",
  "private_rpc_search_path",
  "pgtap_not_public",
  "private_schema_not_exposed",
]);
export const REQUIRED_EVIDENCE_CHECK_KEYS = [...EVIDENCE_CHECK_KEYS];
const CHILD_ENV_NAMES = [
  "PATH",
  "Path",
  "SystemRoot",
  "TEMP",
  "TMP",
  "HOME",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "CI",
  "NO_COLOR",
];

const runnerError = (code) => {
  const error = new Error(code);
  error.code = code;
  return error;
};

/**
 * @param {Record<string, string | undefined>} env
 * @param {{ cliPath?: string, workdir?: string, pathExists?: (path: string) => boolean }} paths
 * @returns {{ projectRef: string, cliPath: string, workdir: string }}
 */
export function readRunnerConfig(env = process.env, paths = {}) {
  if (Object.entries(env).some(
    ([name, value]) => name.startsWith("NEXT_PUBLIC_") && value?.trim() && SENSITIVE_ENV_PATTERN.test(name),
  )) {
    throw runnerError("FORBIDDEN_PUBLIC_SECRET");
  }

  if (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw runnerError("FORBIDDEN_APPLICATION_CREDENTIAL");
  }

  const projectRef = env.P0_3_LINKED_PROJECT_REF?.trim();
  if (!projectRef) throw runnerError("MISSING_P0_3_LINKED_PROJECT_REF");
  if (!PROJECT_REF_PATTERN.test(projectRef)) throw runnerError("INVALID_P0_3_LINKED_PROJECT_REF");

  if (!env.SUPABASE_ACCESS_TOKEN?.trim()) {
    throw runnerError("MISSING_SUPABASE_ACCESS_TOKEN");
  }
  if (!env.SUPABASE_ACCESS_TOKEN.trim().startsWith("sbp_fc")) {
    throw runnerError("INVALID_SUPABASE_ACCESS_TOKEN");
  }

  const cliPath = paths.cliPath;
  if (!cliPath || !(paths.pathExists ?? existsSync)(cliPath)) {
    throw runnerError("MISSING_SUPABASE_CLI");
  }

  return {
    projectRef,
    cliPath,
    workdir: paths.workdir ?? process.cwd(),
  };
}

export function validateReadOnlySql(sql) {
  const normalized = sql.trim();
  if (!normalized || !/^(select|with)\b/i.test(normalized)) {
    throw runnerError("NON_READ_ONLY_SQL");
  }
  const withoutTrailingSemicolon = normalized.replace(/;\s*$/, "");
  if (withoutTrailingSemicolon.includes(";")) {
    throw runnerError("MULTIPLE_SQL_STATEMENTS");
  }
  if (FORBIDDEN_SQL_PATTERN.test(normalized)) {
    throw runnerError("NON_READ_ONLY_SQL");
  }
  return true;
}

export function buildLinkedQueryInvocation({ cliPath, projectRef, sqlFile, workdir }) {
  return {
    command: process.execPath,
    args: [
      cliPath,
      "db",
      "query",
      "--linked",
      "--project-ref",
      projectRef,
      "--output-format",
      "json",
      "--file",
      sqlFile,
      "--workdir",
      workdir,
    ],
  };
}

export function fingerprint(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
}

export function sanitizeDiagnostic(text) {
  return String(text)
    .replace(/(sbp_|sb_secret_)[A-Za-z0-9._-]+/gi, "$1[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/eyJ[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "postgresql://[REDACTED]")
    .replace(/password\s*=\s*[^\s,;]+/gi, "password=[REDACTED]")
    .slice(0, 240);
}

export function parseEvidencePayload(output) {
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace < firstBrace) {
    throw runnerError("INVALID_EVIDENCE_PAYLOAD");
  }

  let payload;
  try {
    payload = JSON.parse(output.slice(firstBrace, lastBrace + 1));
  } catch {
    throw runnerError("INVALID_EVIDENCE_PAYLOAD");
  }

  if (!Array.isArray(payload?.rows) || payload.rows.length !== 1) {
    throw runnerError("INVALID_EVIDENCE_PAYLOAD");
  }

  const row = payload.rows[0];
  if (!row || typeof row !== "object" || Array.isArray(row)
    || Object.keys(row).length !== 1 || !Object.hasOwn(row, "evidence")) {
    throw runnerError("INVALID_EVIDENCE_PAYLOAD");
  }
  const evidence = row && typeof row === "object" && !Array.isArray(row)
    ? row.evidence
    : undefined;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw runnerError("INVALID_EVIDENCE_PAYLOAD");
  }

  const checks = {};
  for (const [key, value] of Object.entries(evidence)) {
    if (!EVIDENCE_CHECK_KEYS.has(key) || typeof value !== "boolean") {
      throw runnerError("INVALID_EVIDENCE_PAYLOAD");
    }
    checks[key] = value;
  }
  if (Object.keys(checks).length === 0) {
    throw runnerError("INVALID_EVIDENCE_PAYLOAD");
  }

  return { checks };
}

function childEnvironment(env) {
  const result = { SUPABASE_ACCESS_TOKEN: env.SUPABASE_ACCESS_TOKEN.trim() };
  for (const name of CHILD_ENV_NAMES) {
    if (env[name]) result[name] = env[name];
  }
  return result;
}

/**
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   paths?: { cliPath?: string, workdir?: string, pathExists?: (path: string) => boolean },
 *   sql: string,
 *   sqlFile: string,
 *   mode?: string,
 *   spawn?: (...args: any[]) => any,
 * }} input
 * @returns {{ exitCode: number, report: { [key: string]: any } }}
 */
export function runLinkedEvidence({
  env = process.env,
  paths = {},
  sql,
  sqlFile,
  mode = "read-only",
  spawn = spawnSync,
}) {
  let projectRef;
  try {
    if (mode !== "read-only") throw runnerError("WRITE_MODE_DISABLED");
    const config = readRunnerConfig(env, paths);
    projectRef = config.projectRef;
    validateReadOnlySql(sql);

    const invocation = buildLinkedQueryInvocation({
      cliPath: config.cliPath,
      projectRef: config.projectRef,
      sqlFile,
      workdir: config.workdir,
    });
    const result = spawn(invocation.command, invocation.args, {
      encoding: "utf8",
      shell: false,
      env: childEnvironment(env),
    });
    if (result.status !== 0) throw runnerError("CLI_QUERY_FAILED");

    const { checks } = parseEvidencePayload(result.stdout ?? "");
    const failedChecks = REQUIRED_EVIDENCE_CHECK_KEYS.filter((key) => checks[key] !== true);
    const report = {
      status: failedChecks.length === 0 ? "passed" : "failed",
      target: "linked-sandbox",
      mode,
      projectRefFingerprint: fingerprint(projectRef),
      checks: {
        total: REQUIRED_EVIDENCE_CHECK_KEYS.length,
        passed: REQUIRED_EVIDENCE_CHECK_KEYS.length - failedChecks.length,
        failed: failedChecks,
      },
    };
    if (failedChecks.length > 0) {
      return { exitCode: 1, report: { ...report, failureCode: "EVIDENCE_CHECK_FAILED" } };
    }
    return { exitCode: 0, report };
  } catch (error) {
    const failureCode = typeof error?.code === "string" ? error.code : "RUNNER_FAILED";
    return {
      exitCode: 1,
      report: makeFailureReport({ failureCode, projectRef, mode }),
    };
  }
}

/**
 * @param {{ failureCode: string, projectRef?: string, mode?: string }} input
 * @returns {{ status: string, failureCode: string, target: string, mode: string, projectRefFingerprint?: string }}
 */
export function makeFailureReport({ failureCode, projectRef, mode = "read-only" }) {
  const report = {
    status: "failed",
    failureCode,
    target: "linked-sandbox",
    mode,
  };
  if (projectRef) report.projectRefFingerprint = fingerprint(projectRef);
  return report;
}
