import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");

describe("analytics UI authorization states", () => {
  it("does not turn forbidden or empty results into the initial zero-data success view", () => {
    const source = readFileSync(path.join(projectRoot, "src", "app", "analytics", "page.tsx"), "utf8");

    expect(source).toContain('status === "forbidden"');
    expect(source).toContain('? "Restricted"');
    expect(source).toContain('status === "empty" ? "No activity"');
    expect(source).toContain('const resultTone = result?.ok === false && result.code === "FORBIDDEN" ? "neutral" : "danger";');
    expect(source).toContain("Analytics access is restricted:");
    expect(source).toContain("exportAnalyticsDataAction");
    expect(source).toContain("data-testid=\"analytics-scope\"");
    expect(source).toContain("Export ${scopeLabel} CSV");
    expect(source).toContain("result?.ok && <>");
  });

  it("uses the server-provided scope for the page and export instead of guessing in the browser", () => {
    const source = readFileSync(path.join(projectRoot, "src", "app", "analytics", "page.tsx"), "utf8");

    expect(source).toContain("const scopeLabel = data.scopeLabel;");
    expect(source).toContain("data.scope === \"team\"");
    expect(source).not.toContain("result.data.teamLeaderboard.filter");
  });
});
