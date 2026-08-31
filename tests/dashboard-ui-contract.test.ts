import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");

describe("Dashboard team hierarchy UI contract", () => {
  it("keeps workspace-level team context explicit", () => {
    const dashboard = readFileSync(path.join(projectRoot, "src", "app", "page.tsx"), "utf8");
    const kpis = readFileSync(path.join(projectRoot, "src", "components", "dashboard", "KpiCards.tsx"), "utf8");
    const nextBestAction = readFileSync(path.join(projectRoot, "src", "components", "dashboard", "NextBestActionCard.tsx"), "utf8");

    expect(dashboard).toContain('data-testid="dashboard-team-overview"');
    expect(dashboard).toContain('data-testid="dashboard-team-attention"');
    expect(dashboard).toContain('data-testid="dashboard-supporting-analytics"');
    expect(dashboard).toContain("<KpiCards compact />");
    expect(dashboard).toContain("dashboard-team-attention");
    expect(dashboard).toContain("Workspace-scoped");
    expect(dashboard).toContain("No synthetic priorities");
    expect(dashboard).toContain("<NextBestActionCard />");
    expect(nextBestAction).toContain('data-testid="next-best-action"');
    expect(kpis).toContain('label: "Team Calls"');
    expect(kpis).toContain('label: "Team Conversion Rate"');
    expect(kpis).toContain('label: "Team Revenue"');
    expect(kpis).toContain('label: "Operators in Workspace"');
    expect(kpis).toContain("compact = false");
    expect(kpis).not.toContain('label: "My Calls"');
  });
});
