import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");

describe("analytics UI authorization states", () => {
  it("does not turn forbidden or empty results into the initial zero-data success view", () => {
    const source = readFileSync(path.join(projectRoot, "src", "app", "analytics", "page.tsx"), "utf8");

    expect(source).toContain('status === "forbidden"');
    expect(source).toContain('status === "empty" ? "No activity"');
    expect(source).toContain("Analytics forbidden:");
    expect(source).toContain("exportAnalyticsDataAction");
    expect(source).toContain("result?.ok && <>");
  });
});
