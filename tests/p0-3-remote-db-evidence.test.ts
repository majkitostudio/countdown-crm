import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  buildLinkedQueryInvocation,
  fingerprint,
  makeFailureReport,
  parseEvidencePayload,
  readRunnerConfig,
  runLinkedEvidence,
  sanitizeDiagnostic,
  validateReadOnlySql,
} from "../scripts/p0-3-remote-db-evidence-lib.mjs";

const paths = {
  cliPath: "C:\\repo\\node_modules\\supabase\\dist\\supabase.js",
  workdir: "C:\\repo",
};

const testEnv = {
  NODE_ENV: "test",
};

const evidenceSqlPath = new URL(
  "../scripts/p0-3-remote-db-evidence.sql",
  import.meta.url,
);
const dockerfilePath = new URL(
  "../docker/p0-3-runner/Dockerfile",
  import.meta.url,
);
const guidePath = new URL(
  "../docs/P0_3_REMOTE_DB_RUNNER.md",
  import.meta.url,
);

describe("P0.3 remote evidence runner configuration", () => {
  it("rejects a missing scoped access token without exposing a value", () => {
    expect(() =>
      readRunnerConfig(
        { ...testEnv, P0_3_LINKED_PROJECT_REF: "abcdefghijklmnopqrst" },
        paths,
      ),
    ).toThrow("MISSING_SUPABASE_ACCESS_TOKEN");
  });

  it("rejects application service credentials", () => {
    expect(() =>
      readRunnerConfig(
        {
          ...testEnv,
          P0_3_LINKED_PROJECT_REF: "abcdefghijklmnopqrst",
          SUPABASE_ACCESS_TOKEN: "scoped-token",
          SUPABASE_SERVICE_ROLE_KEY: "must-not-be-used",
        },
        paths,
      ),
    ).toThrow("FORBIDDEN_APPLICATION_CREDENTIAL");
  });

  it("accepts only a single read-only select or with query", () => {
    expect(() => validateReadOnlySql("select 1;")).not.toThrow();
    expect(() => validateReadOnlySql("with rows as (select 1) select * from rows;"))
      .not.toThrow();
    expect(() => validateReadOnlySql("delete from public.workspaces;"))
      .toThrow("NON_READ_ONLY_SQL");
    expect(() => validateReadOnlySql("select 1; delete from public.workspaces;"))
      .toThrow("MULTIPLE_SQL_STATEMENTS");
  });

  it("builds a linked CLI invocation without a shell", () => {
    expect(buildLinkedQueryInvocation({
      cliPath: "C:\\repo\\node_modules\\supabase\\dist\\supabase.js",
      projectRef: "abcdefghijklmnopqrst",
      sqlFile: "C:\\repo\\scripts\\p0-3-remote-db-evidence.sql",
      workdir: "C:\\repo",
    })).toEqual({
      command: process.execPath,
      args: expect.arrayContaining([
        "db",
        "query",
        "--linked",
        "--project-ref",
        "abcdefghijklmnopqrst",
        "--output-format",
        "json",
      ]),
    });
  });

  it("redacts token, JWT and database credentials from diagnostics", () => {
    const diagnostic = sanitizeDiagnostic(
      "sbp_very-secret Bearer eyJheader.payload.signature " +
      "postgresql://user:password@host/db password=another-secret",
    );

    expect(diagnostic).not.toContain("very-secret");
    expect(diagnostic).not.toContain("header.payload.signature");
    expect(diagnostic).not.toContain("user:password@host");
    expect(diagnostic).not.toContain("another-secret");
    expect(diagnostic).toContain("[REDACTED]");
  });

  it("does not add an undefined fingerprint to a failure report", () => {
    expect(makeFailureReport({ failureCode: "MISSING_SUPABASE_ACCESS_TOKEN" }))
      .toEqual({
        status: "failed",
        failureCode: "MISSING_SUPABASE_ACCESS_TOKEN",
        target: "linked-sandbox",
        mode: "read-only",
      });
  });

  it("creates a short deterministic fingerprint without returning the source", () => {
    expect(fingerprint("abcdefghijklmnopqrst")).toMatch(/^[0-9a-f]{12}$/);
    expect(fingerprint("abcdefghijklmnopqrst")).toBe(fingerprint("abcdefghijklmnopqrst"));
    expect(fingerprint("abcdefghijklmnopqrst")).not.toContain("abcdefghijklmnopqrst");
  });

  it("parses one safe evidence row", () => {
    expect(parseEvidencePayload(
      "status text\n{" +
      '"rows":[{"evidence":{"public_rpc_boundaries":true,"pgtap_not_public":true}}]}' +
      "\n",
    )).toEqual({
      checks: {
        public_rpc_boundaries: true,
        pgtap_not_public: true,
      },
    });
  });

  it("rejects a payload with arbitrary database rows", () => {
    expect(() => parseEvidencePayload(
      '{"rows":[{"email":"person@example.test"}]}',
    )).toThrow("INVALID_EVIDENCE_PAYLOAD");
  });

  it("ships a read-only catalog query for the P0.2 contracts", () => {
    const sql = readFileSync(evidenceSqlPath, "utf8");

    expect(() => validateReadOnlySql(sql)).not.toThrow();
    expect(sql).toContain("pg_proc");
    expect(sql).toContain("pg_extension");
    expect(sql).toContain("pgtap_not_public");
    expect(sql).not.toMatch(/\b(insert|update|delete|alter|drop|grant|revoke)\b/i);
  });

  it("keeps secrets out of the Docker image", () => {
    const dockerfile = readFileSync(dockerfilePath, "utf8");

    expect(dockerfile).toContain("npm ci --ignore-scripts");
    expect(dockerfile).toContain("package-lock.json");
    expect(dockerfile).not.toMatch(/COPY[^\n]*\.env/i);
    expect(dockerfile).not.toMatch(/\bARG\s+[^\n]*(SUPABASE|TOKEN|SECRET|PASSWORD)/i);
    expect(dockerfile).not.toMatch(/\bENV\s+[^\n]*(SUPABASE|TOKEN|SECRET|PASSWORD)/i);
    expect(dockerfile).not.toContain("SERVICE_ROLE_KEY");
  });

  it("documents the three environment boundaries for the runner", () => {
    const guide = readFileSync(guidePath, "utf8");

    expect(guide).toContain("SUPABASE_ACCESS_TOKEN");
    expect(guide).toContain("P0_3_LINKED_PROJECT_REF");
    expect(guide).toContain("read-only");
    expect(guide).toContain("produkční");
    expect(guide).toContain("service-role");
    expect(guide).toContain("Docker");
    expect(guide.toLowerCase()).toContain("lokální pgtap není důkaz linked sandboxu");
  });

  it("passes the scoped token only to the child process and returns a safe report", () => {
    let childEnvironment: Record<string, string | undefined> = {};
    const result = runLinkedEvidence({
      env: {
        ...testEnv,
        P0_3_LINKED_PROJECT_REF: "abcdefghijklmnopqrst",
        SUPABASE_ACCESS_TOKEN: "sbp_scoped-token",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-value",
        UNRELATED_APP_SECRET: "should-not-be-forwarded",
      },
      paths: { ...paths, pathExists: () => true },
      sql: "select 1;",
      sqlFile: "C:\\repo\\scripts\\p0-3-remote-db-evidence.sql",
      spawn: (_command, _args, options) => {
        childEnvironment = options?.env ?? {};
        return {
          status: 0,
          stdout: '{"rows":[{"evidence":{' +
            '"public_rpc_boundaries":true,"public_rpc_grants":true,' +
            '"public_rpc_search_path":true,"private_rpc_implementations":true,' +
            '"private_rpc_grants":true,"private_rpc_search_path":true,' +
            '"pgtap_not_public":true,"private_schema_not_exposed":true' +
            '}}]}',
          stderr: "",
        };
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.report.status).toBe("passed");
    expect(childEnvironment.SUPABASE_ACCESS_TOKEN).toBe("sbp_scoped-token");
    expect(childEnvironment.UNRELATED_APP_SECRET).toBeUndefined();
    expect(JSON.stringify(result.report)).not.toContain("sbp_scoped-token");
  });

  it("refuses linked write mode before invoking the CLI", () => {
    let wasSpawned = false;
    const result = runLinkedEvidence({
      env: {
        ...testEnv,
        P0_3_LINKED_PROJECT_REF: "abcdefghijklmnopqrst",
        SUPABASE_ACCESS_TOKEN: "sbp_scoped-token",
      },
      paths: { ...paths, pathExists: () => true },
      sql: "select 1;",
      sqlFile: "C:\\repo\\scripts\\p0-3-remote-db-evidence.sql",
      mode: "transactional-test",
      spawn: () => {
        wasSpawned = true;
        return { status: 0, stdout: "", stderr: "" };
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.report.failureCode).toBe("WRITE_MODE_DISABLED");
    expect(wasSpawned).toBe(false);
  });

  it("maps a CLI failure to a safe stable code", () => {
    const result = runLinkedEvidence({
      env: {
        ...testEnv,
        P0_3_LINKED_PROJECT_REF: "abcdefghijklmnopqrst",
        SUPABASE_ACCESS_TOKEN: "sbp_scoped-token",
      },
      paths: { ...paths, pathExists: () => true },
      sql: "select 1;",
      sqlFile: "C:\\repo\\scripts\\p0-3-remote-db-evidence.sql",
      spawn: () => ({
        status: 1,
        stdout: "raw database output with password=secret",
        stderr: "postgresql://user:secret@host/db",
      }),
    });

    expect(result.exitCode).toBe(1);
    expect(result.report.failureCode).toBe("CLI_QUERY_FAILED");
    expect(JSON.stringify(result.report)).not.toContain("secret");
    expect(JSON.stringify(result.report)).not.toContain("raw database output");
  });

  it("rejects invalid CLI JSON without returning the raw payload", () => {
    const result = runLinkedEvidence({
      env: {
        ...testEnv,
        P0_3_LINKED_PROJECT_REF: "abcdefghijklmnopqrst",
        SUPABASE_ACCESS_TOKEN: "sbp_scoped-token",
      },
      paths: { ...paths, pathExists: () => true },
      sql: "select 1;",
      sqlFile: "C:\\repo\\scripts\\p0-3-remote-db-evidence.sql",
      spawn: () => ({
        status: 0,
        stdout: "not-json-with-a-secret-value",
        stderr: "",
      }),
    });

    expect(result.exitCode).toBe(1);
    expect(result.report.failureCode).toBe("INVALID_EVIDENCE_PAYLOAD");
    expect(JSON.stringify(result.report)).not.toContain("not-json-with-a-secret-value");
  });

  it("fails when a required database contract is false", () => {
    const result = runLinkedEvidence({
      env: {
        ...testEnv,
        P0_3_LINKED_PROJECT_REF: "abcdefghijklmnopqrst",
        SUPABASE_ACCESS_TOKEN: "sbp_scoped-token",
      },
      paths: { ...paths, pathExists: () => true },
      sql: "select 1;",
      sqlFile: "C:\\repo\\scripts\\p0-3-remote-db-evidence.sql",
      spawn: () => ({
        status: 0,
        stdout: '{"rows":[{"evidence":{' +
          '"public_rpc_boundaries":false,"public_rpc_grants":true,' +
          '"public_rpc_search_path":true,"private_rpc_implementations":true,' +
          '"private_rpc_grants":true,"private_rpc_search_path":true,' +
          '"pgtap_not_public":true,"private_schema_not_exposed":true' +
          '}}]}',
        stderr: "",
      }),
    });

    expect(result.exitCode).toBe(1);
    expect(result.report.failureCode).toBe("EVIDENCE_CHECK_FAILED");
    expect(result.report.checks.failed).toEqual(["public_rpc_boundaries"]);
  });
});
