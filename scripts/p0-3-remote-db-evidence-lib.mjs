import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import process from "node:process";

const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;
const FORBIDDEN_SQL_PATTERN = /\b(insert|update|delete|merge|alter|drop|create|grant|revoke|truncate|copy|vacuum|refresh|call)\b/i;
const SENSITIVE_ENV_PATTERN = /(secret|token|password|credential|private[_-]?key)/i;

const runnerError = (code) => {
  const error = new Error(code);
  error.code = code;
  return error;
};

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

export function makeFailureReport({ failureCode, projectRef, mode = "read-only" }) {
  return {
    status: "failed",
    failureCode,
    target: "linked-sandbox",
    mode,
    projectRefFingerprint: projectRef ? fingerprint(projectRef) : undefined,
  };
}
