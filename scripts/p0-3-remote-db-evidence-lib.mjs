import { createHash } from "node:crypto";
import process from "node:process";

const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;
const FORBIDDEN_SQL_PATTERN = /\b(insert|update|delete|merge|alter|drop|create|grant|revoke|truncate|copy|vacuum|refresh|call)\b/i;
const SENSITIVE_ENV_PATTERN = /(secret|token|password|credential|private[_-]?key)/i;
const REQUEST_TIMEOUT_MS = 30_000;
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
const DATABASE_EVIDENCE_CHECK_KEYS = new Set(
  [...EVIDENCE_CHECK_KEYS].filter((key) => key !== "private_schema_not_exposed"),
);
export const REQUIRED_EVIDENCE_CHECK_KEYS = [...EVIDENCE_CHECK_KEYS];
const runnerError = (code) => {
  const error = new Error(code);
  error.code = code;
  return error;
};

/**
 * @param {Record<string, string | undefined>} env
 * @returns {{ projectRef: string }}
 */
export function readRunnerConfig(env = process.env) {
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

  return { projectRef };
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

export function buildReadOnlyQueryRequest({ projectRef, token, sql }) {
  return {
    url: `https://api.supabase.com/v1/projects/${projectRef}/database/query/read-only`,
    options: {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  };
}

export function buildPostgrestConfigRequest({ projectRef, token }) {
  return {
    url: `https://api.supabase.com/v1/projects/${projectRef}/postgrest`,
    options: {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    },
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
  let payload;
  try {
    payload = JSON.parse(String(output).trim());
  } catch {
    throw runnerError("INVALID_EVIDENCE_PAYLOAD");
  }

  if (!Array.isArray(payload) || payload.length !== 1) {
    throw runnerError("INVALID_EVIDENCE_PAYLOAD");
  }

  const row = payload[0];
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
    if (!DATABASE_EVIDENCE_CHECK_KEYS.has(key) || typeof value !== "boolean") {
      throw runnerError("INVALID_EVIDENCE_PAYLOAD");
    }
    checks[key] = value;
  }
  if (Object.keys(checks).length === 0) {
    throw runnerError("INVALID_EVIDENCE_PAYLOAD");
  }

  return { checks };
}

export function parsePostgrestConfig(output) {
  let config;
  try {
    config = JSON.parse(String(output).trim());
  } catch {
    throw runnerError("INVALID_POSTGREST_CONFIG");
  }

  if (!config || typeof config !== "object" || Array.isArray(config)
    || typeof config.db_schema !== "string" || !config.db_schema.trim()) {
    throw runnerError("INVALID_POSTGREST_CONFIG");
  }

  const exposedSchemas = config.db_schema
    .split(",")
    .map((schema) => schema.trim())
    .filter(Boolean);
  return { private_schema_not_exposed: !exposedSchemas.includes("private") };
}

/**
 * @param {{ url: string, options: { method: string, headers: Record<string, string>, body?: string } }} input
 * @returns {Promise<{ status: number, body: string }>}
 */
export async function requestReadOnlyQuery({ url, options }) {
  const response = await globalThis.fetch(url, {
    ...options,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return { status: response.status, body: await response.text() };
}

/**
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   sql: string,
 *   mode?: string,
 *   request?: (input: { url: string, options: { method: string, headers: Record<string, string>, body?: string } }) => Promise<{ status: number, body: string }>,
 * }} input
 * @returns {Promise<{ exitCode: number, report: { [key: string]: any } }>}
 */
export async function runLinkedEvidence({
  env = process.env,
  sql,
  mode = "read-only",
  request = requestReadOnlyQuery,
}) {
  let projectRef;
  try {
    if (mode !== "read-only") throw runnerError("WRITE_MODE_DISABLED");
    const config = readRunnerConfig(env);
    projectRef = config.projectRef;
    validateReadOnlySql(sql);

    const queryRequest = buildReadOnlyQueryRequest({
      projectRef: config.projectRef,
      token: env.SUPABASE_ACCESS_TOKEN.trim(),
      sql,
    });
    let result;
    try {
      result = await request(queryRequest);
    } catch {
      throw runnerError("API_QUERY_FAILED");
    }
    if (result.status < 200 || result.status >= 300) throw runnerError("API_QUERY_FAILED");

    const databaseEvidence = parseEvidencePayload(result.body ?? "");
    const postgrestRequest = buildPostgrestConfigRequest({
      projectRef: config.projectRef,
      token: env.SUPABASE_ACCESS_TOKEN.trim(),
    });
    let postgrestResult;
    try {
      postgrestResult = await request(postgrestRequest);
    } catch {
      throw runnerError("POSTGREST_CONFIG_FAILED");
    }
    if (postgrestResult.status < 200 || postgrestResult.status >= 300) {
      throw runnerError("POSTGREST_CONFIG_FAILED");
    }
    const postgrestEvidence = parsePostgrestConfig(postgrestResult.body ?? "");
    const checks = { ...databaseEvidence.checks, ...postgrestEvidence };
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
