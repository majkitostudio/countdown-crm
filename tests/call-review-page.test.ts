import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("real call review page boundary", () => {
  it("authorizes managers before loading real call evidence", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/calls/[callId]/review/page.tsx"),
      "utf8",
    );

    expect(source).not.toMatch(/^"use client";/);
    expect(source).toContain('requireWorkspaceRole(["team_leader", "administrator"])');
    expect(source.indexOf("requireWorkspaceRole")).toBeLessThan(source.indexOf("getCallReview(callId)"));
  });

  it("maps only a real missing call to the framework not-found page", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/calls/[callId]/review/page.tsx"),
      "utf8",
    );

    expect(source).toContain('error.code === "NOT_FOUND"');
    expect(source).toContain("notFound()");
    expect(source).toContain("CallReviewWorkspace");
  });
});
