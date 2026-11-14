import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");

describe("Dashboard team hierarchy UI contract", () => {
  it("keeps team and workspace context explicit", () => {
    const dashboard = readFileSync(path.join(projectRoot, "src", "app", "reports", "page.tsx"), "utf8");
    const kpis = readFileSync(path.join(projectRoot, "src", "components", "dashboard", "KpiCards.tsx"), "utf8");
    const topPerformers = readFileSync(path.join(projectRoot, "src", "components", "dashboard", "TopPerformers.tsx"), "utf8");
    const recentActivity = readFileSync(path.join(projectRoot, "src", "components", "dashboard", "RecentActivityFeed.tsx"), "utf8");
    const nextBestAction = readFileSync(path.join(projectRoot, "src", "components", "dashboard", "NextBestActionCard.tsx"), "utf8");
    const dailyBrief = readFileSync(path.join(projectRoot, "src", "components", "dashboard", "TeamLeaderDailyBriefCard.tsx"), "utf8");
    const reorderWidget = readFileSync(path.join(projectRoot, "src", "components", "dashboard", "ReorderWidget.tsx"), "utf8");

    expect(dashboard).toContain('data-testid="dashboard-team-overview"');
    expect(dashboard).toContain('data-testid="dashboard-team-attention"');
    expect(dashboard).toContain('data-testid="dashboard-supporting-analytics"');
    expect(dashboard).toContain("<KpiCards compact scope={scope} />");
    expect(dashboard).toContain("dashboard-team-attention");
    expect(dashboard).toContain("scopeLabel");
    expect(dashboard).toContain("Žádné syntetické priority");
    expect(dashboard).toContain("<NextBestActionCard scope={scope} />");
    expect(nextBestAction).toContain('data-testid="next-best-action"');
    expect(dashboard).toContain("<TeamLeaderDailyBriefCard />");
    expect(dailyBrief).toContain('data-testid="team-leader-daily-brief"');
    expect(dailyBrief).toContain("Ke kontrole");
    expect(dailyBrief).toContain("Celofiremní peněženka");
    expect(dailyBrief).toContain("scopeLabel");
    expect(dailyBrief).toContain('href="/call-logs?review=unreviewed"');
    expect(dailyBrief).not.toContain("getReorderOpportunities");
    expect(dailyBrief).toContain("loadDashboardDailyBriefAction");
    expect(dailyBrief).not.toContain("listCalendarEntriesAction");
    expect(dailyBrief).not.toContain("listCallsAction");
    expect(dailyBrief).not.toContain("getWalletOverviewAction");
    expect(reorderWidget).toContain("loadReorderOpportunitiesAction");
    expect(reorderWidget).not.toContain("getReorderOpportunities");
    expect(dailyBrief).toContain('font-mono text-lg font-semibold text-zinc-100');
    expect(kpis).toContain('scope === "team" ? "Hovory týmu" : "Hovory pracovního prostoru"');
    expect(kpis).toContain('scope === "team" ? "Konverze týmu" : "Konverze pracovního prostoru"');
    expect(kpis).toContain('scope === "team" ? "Příjmy týmu" : "Příjmy pracovního prostoru"');
    expect(kpis).toContain('scope === "team" ? "Operátoři v týmu" : "Operátoři v pracovním prostoru"');
    expect(kpis).toContain("compact = false");
    expect(kpis).not.toContain('label: "Moje hovory"');
    for (const component of [kpis, topPerformers, recentActivity]) {
      expect(component).toContain('const feedbackTone = result?.ok === false && result.code === "FORBIDDEN" ? "neutral" : "danger";');
      expect(component).toContain("je omezen");
    }
  });
});

describe("mobile order pipeline contract", () => {
  it("renders a compact mobile order card alongside the desktop table", () => {
    const pipeline = readFileSync(path.join(projectRoot, "src", "components", "orders", "OrderPipeline.tsx"), "utf8");

    expect(pipeline).toContain('data-testid="mobile-order-card"');
    expect(pipeline).toContain("md:hidden");
    expect(pipeline).toContain("hidden md:block");
    expect(pipeline).toContain("Stav");
    expect(pipeline).toContain("Operátor");
    expect(pipeline).toContain("Otevřít objednávku");
  });
});
