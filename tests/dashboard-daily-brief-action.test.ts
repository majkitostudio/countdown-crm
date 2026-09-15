import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceRole: vi.fn(),
  getAnalyticsData: vi.fn(),
  listOperatorCalendarEntriesForWorkspace: vi.fn(),
  getWalletOverview: vi.fn(),
  listWorkspaceCallsInContext: vi.fn(),
  listCallReviewStatuses: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceRole: mocks.requireWorkspaceRole,
}));
vi.mock("@/lib/analytics", () => ({
  getAnalyticsData: mocks.getAnalyticsData,
}));
vi.mock("@/lib/dal/calendar", () => ({
  listOperatorCalendarEntriesForWorkspace: mocks.listOperatorCalendarEntriesForWorkspace,
}));
vi.mock("@/lib/dal/wallet", () => ({
  getWalletOverview: mocks.getWalletOverview,
}));
vi.mock("@/lib/dal/activity", () => ({
  listWorkspaceCallsInContext: mocks.listWorkspaceCallsInContext,
}));
vi.mock("@/lib/dal/callReviews", () => ({
  listCallReviewStatuses: mocks.listCallReviewStatuses,
}));

import { loadDashboardDailyBriefAction } from "@/app/actions/dashboard";

const teamLeaderContext = {
  userId: "leader-p3",
  workspaceId: "workspace-1",
  role: "team_leader" as const,
};
const administratorContext = {
  userId: "admin-1",
  workspaceId: "workspace-1",
  role: "administrator" as const,
};

const analytics = {
  daily: {
    date: "2026-09-14",
    calls: 2,
    completedOrders: 1,
    revenue: 100,
    revenueByCurrency: [{ currency: "CZK", amount: 100 }],
    currency: "CZK",
    conversionRate: 50,
  },
};

const emptyCalendar = {
  entries: [],
  sources: {
    callbacks: { state: "available" as const },
    reminders: { state: "available" as const },
  },
};

const wallet = {
  settings: { currency: "CZK" },
  balances: [{ balance: 250, transaction_count: 3 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireWorkspaceRole.mockResolvedValue(teamLeaderContext);
  mocks.getAnalyticsData.mockResolvedValue(analytics);
  mocks.listOperatorCalendarEntriesForWorkspace.mockResolvedValue(emptyCalendar);
  mocks.getWalletOverview.mockResolvedValue(wallet);
  mocks.listWorkspaceCallsInContext.mockResolvedValue([]);
  mocks.listCallReviewStatuses.mockResolvedValue(new Map());
});

describe("dashboard Daily Brief scope", () => {
  it("uses team scope for Team Leaders and passes the authorized workspace", async () => {
    const result = await loadDashboardDailyBriefAction();

    expect(result).toMatchObject({ status: "ready", brief: { scope: "team", scopeLabel: "Týmová data" } });
    expect(mocks.getAnalyticsData).toHaveBeenCalledWith("workspace-1");
    expect(mocks.listOperatorCalendarEntriesForWorkspace).toHaveBeenCalledWith(undefined, undefined, "workspace-1");
    expect(mocks.listWorkspaceCallsInContext).toHaveBeenCalledWith(teamLeaderContext);
    expect(mocks.listCallReviewStatuses).toHaveBeenCalledWith(teamLeaderContext, []);
    expect(result.status === "ready" && result.brief.workspaceWalletBalance).toBe(250);
  });

  it("uses workspace scope for Administrators", async () => {
    mocks.requireWorkspaceRole.mockResolvedValue(administratorContext);

    const result = await loadDashboardDailyBriefAction();

    expect(result).toMatchObject({ status: "ready", brief: { scope: "workspace", scopeLabel: "Celý workspace" } });
  });

  it("keeps the brief available when optional sources fail", async () => {
    mocks.listOperatorCalendarEntriesForWorkspace.mockRejectedValue(new Error("calendar unavailable"));
    mocks.getWalletOverview.mockRejectedValue(new Error("wallet unavailable"));
    mocks.listWorkspaceCallsInContext.mockRejectedValue(new Error("calls unavailable"));

    const result = await loadDashboardDailyBriefAction();

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.brief.daily.calls).toBe(2);
      expect(result.brief.todayCallbacks).toBe(0);
      expect(result.brief.workspaceWalletBalance).toBeNull();
      expect(result.warnings).toEqual(expect.arrayContaining([
        "Callbacky a reminders nejsou dostupné.",
        "Wallet souhrn není dostupný.",
        "Review fronta není dostupná.",
      ]));
    }
  });
});
