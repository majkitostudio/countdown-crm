import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");

describe("Dashboard team hierarchy UI contract", () => {
  it("keeps workspace-level team context explicit", () => {
    const dashboard = readFileSync(path.join(projectRoot, "src", "app", "dashboard", "page.tsx"), "utf8");
    const kpis = readFileSync(path.join(projectRoot, "src", "components", "dashboard", "KpiCards.tsx"), "utf8");
    const topPerformers = readFileSync(path.join(projectRoot, "src", "components", "dashboard", "TopPerformers.tsx"), "utf8");
    const recentActivity = readFileSync(path.join(projectRoot, "src", "components", "dashboard", "RecentActivityFeed.tsx"), "utf8");
    const nextBestAction = readFileSync(path.join(projectRoot, "src", "components", "dashboard", "NextBestActionCard.tsx"), "utf8");
    const dailyBrief = readFileSync(path.join(projectRoot, "src", "components", "dashboard", "TeamLeaderDailyBriefCard.tsx"), "utf8");

    expect(dashboard).toContain('data-testid="dashboard-team-overview"');
    expect(dashboard).toContain('data-testid="dashboard-team-attention"');
    expect(dashboard).toContain('data-testid="dashboard-supporting-analytics"');
    expect(dashboard).toContain("<KpiCards compact />");
    expect(dashboard).toContain("dashboard-team-attention");
    expect(dashboard).toContain("Workspace-scoped");
    expect(dashboard).toContain("No synthetic priorities");
    expect(dashboard).toContain("<NextBestActionCard />");
    expect(nextBestAction).toContain('data-testid="next-best-action"');
    expect(dashboard).toContain("<TeamLeaderDailyBriefCard />");
    expect(dailyBrief).toContain('data-testid="team-leader-daily-brief"');
    expect(dailyBrief).toContain("listCallsAction");
    expect(dailyBrief).toContain("Needs review");
    expect(dailyBrief).toContain('href="/calls?review=unreviewed"');
    expect(dailyBrief).toContain("getWalletOverviewAction");
    expect(dailyBrief).not.toContain("getReorderOpportunities");
    expect(dailyBrief).toContain('font-mono text-lg font-semibold text-zinc-100');
    expect(kpis).toContain('label: "Team Calls"');
    expect(kpis).toContain('label: "Team Conversion Rate"');
    expect(kpis).toContain('label: "Team Revenue"');
    expect(kpis).toContain('label: "Operators in Workspace"');
    expect(kpis).toContain("compact = false");
    expect(kpis).not.toContain('label: "My Calls"');
    for (const component of [kpis, topPerformers, recentActivity]) {
      expect(component).toContain('const feedbackTone = result?.ok === false && result.code === "FORBIDDEN" ? "neutral" : "danger";');
      expect(component).toContain("access is restricted");
    }
  });
});
