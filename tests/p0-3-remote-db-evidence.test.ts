import { describe, expect, it } from "vitest";

import {
  buildLinkedQueryInvocation,
  fingerprint,
  makeFailureReport,
  readRunnerConfig,
  sanitizeDiagnostic,
  validateReadOnlySql,
} from "../scripts/p0-3-remote-db-evidence-lib.mjs";

const paths = {
  cliPath: "C:\\repo\\node_modules\\supabase\\dist\\supabase.js",
  workdir: "C:\\repo",
};

describe("P0.3 remote evidence runner configuration", () => {
  it("rejects a missing scoped access token without exposing a value", () => {
    expect(() =>
      readRunnerConfig(
        { P0_3_LINKED_PROJECT_REF: "abcdefghijklmnopqrst" },
        paths,
      ),
    ).toThrow("MISSING_SUPABASE_ACCESS_TOKEN");
  });

  it("rejects application service credentials", () => {
    expect(() =>
      readRunnerConfig(
        {
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
});
