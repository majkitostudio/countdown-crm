import process from "node:process";

import { describe, expect, it } from "vitest";

import {
  buildSupabaseInvocation,
  compareFunctionCatalogs,
  parseSupabaseQueryOutput,
} from "../scripts/verify-linked-function-catalog.mjs";

const baseRow = {
  signature: "public.example(uuid)",
  definition_hash: "same-definition",
  metadata_hash: "same-metadata",
  cr_count: 4,
};

describe("parseSupabaseQueryOutput", () => {
  it("extracts the CLI JSON payload after connection status text", () => {
    const output = `Connecting to local database...\n${JSON.stringify({ rows: [baseRow] })}\n`;

    expect(parseSupabaseQueryOutput(output)).toEqual([baseRow]);
  });
});

describe("buildSupabaseInvocation", () => {
  it("runs the installed CLI through Node instead of a Windows command shim", () => {
    const invocation = buildSupabaseInvocation("--local", "C:\\project");

    expect(invocation.command).toBe(process.execPath);
    expect(invocation.args[0]).toMatch(/node_modules[\\/]supabase[\\/]dist[\\/]supabase\.js$/);
    expect(invocation.args).toContain("--local");
    expect(invocation.args).toContain("C:\\project");
  });
});

describe("compareFunctionCatalogs", () => {
  it("accepts catalogs that differ only in recorded CR characters", () => {
    const linkedRow = { ...baseRow, cr_count: 0 };

    expect(compareFunctionCatalogs([baseRow], [linkedRow])).toEqual({
      matches: true,
      differences: [],
    });
  });

  it("reports a semantic function-body change", () => {
    const linkedRow = { ...baseRow, definition_hash: "changed-definition", cr_count: 0 };

    expect(compareFunctionCatalogs([baseRow], [linkedRow])).toEqual({
      matches: false,
      differences: [
        {
          signature: baseRow.signature,
          reason: "definition",
          local: "same-definition",
          linked: "changed-definition",
        },
      ],
    });
  });

  it("reports metadata and grant changes separately from body formatting", () => {
    const linkedRow = { ...baseRow, metadata_hash: "changed-metadata", cr_count: 0 };

    expect(compareFunctionCatalogs([baseRow], [linkedRow])).toEqual({
      matches: false,
      differences: [
        {
          signature: baseRow.signature,
          reason: "metadata",
          local: "same-metadata",
          linked: "changed-metadata",
        },
      ],
    });
  });

  it("reports functions missing from either catalog", () => {
    expect(compareFunctionCatalogs([baseRow], [])).toEqual({
      matches: false,
      differences: [
        {
          signature: baseRow.signature,
          reason: "missing-linked",
          local: "present",
          linked: "missing",
        },
      ],
    });
  });
});
