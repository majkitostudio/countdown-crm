import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");

describe("analytics UI authorization states", () => {
  it("does not turn forbidden or empty results into the initial zero-data success view", () => {
    const source = readFileSync(path.join(projectRoot, "src", "components", "analytics", "AnalyticsPanel.tsx"), "utf8");

    expect(source).toContain('status === "forbidden"');
    expect(source).toContain('? "Omezený přístup"');
    expect(source).toContain('status === "empty" ? "Bez aktivity"');
    expect(source).toContain('const resultTone = result?.ok === false && result.code === "FORBIDDEN" ? "neutral" : "danger";');
    expect(source).toContain("Přístup k analytice je omezen:");
    expect(source).toContain("exportAnalyticsDataAction");
    expect(source).toContain("data-testid=\"analytics-scope\"");
    expect(source).toContain("Exportovat CSV: ${scopeLabel}");
    expect(source).toContain("result?.ok && <>");
  });

  it("uses the server-provided scope for the page and export instead of guessing in the browser", () => {
    const source = readFileSync(path.join(projectRoot, "src", "components", "analytics", "AnalyticsPanel.tsx"), "utf8");

    expect(source).toContain("const scopeLabel = data.scopeLabel;");
    expect(source).toContain("data.scope === \"team\"");
    expect(source).not.toContain("result.data.teamLeaderboard.filter");
  });

  it("formats weekly revenue tooltip values in the displayed currency", () => {
    const source = readFileSync(path.join(projectRoot, "src", "components", "analytics", "AnalyticsPanel.tsx"), "utf8");
    const weeklyTooltip = source.match(/<Tooltip([\s\S]*?)\/>/)?.[1] ?? "";

    expect(weeklyTooltip).toContain("formatter=");
    expect(weeklyTooltip).toContain("formatCurrencyAmount");
    expect(weeklyTooltip).toContain("data.currencies[0]");
    expect(weeklyTooltip).toContain('typeof value === "number" ? value : typeof value === "string" ? Number(value) : null');
  });
});
