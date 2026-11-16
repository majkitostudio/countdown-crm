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
    completedOrdersWithoutCurrencyCount: 0,
    revenue: 100,
    revenueByCurrency: [{ currency: "CZK", amount: 100 }],
    currency: "CZK",
    conversionRate: 50,
  },
};

const emptyCalendar = {
  entries: [],
  sources: {
    scheduledCalls: { state: "available" as const },
    reminders: { state: "available" as const },
  },
};

const wallet = {
  settings: { currency: "CZK" },
  balances: [{ balance: 250, transaction_count: 3 }],
  sections: {
    balances: { state: "available" },
    settings: { state: "available" },
  },
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

    expect(result).toMatchObject({ status: "ready", brief: { scope: "workspace", scopeLabel: "Celý pracovní prostor" } });
  });

  it("keeps a recorded zero distinct from a missing wallet record", async () => {
    mocks.getWalletOverview.mockResolvedValue({
      ...wallet,
      balances: [{ balance: 0, transaction_count: 0 }],
    });

    const result = await loadDashboardDailyBriefAction();

    expect(result.status === "ready" && result.brief.walletState).toBe("available");
    expect(result.status === "ready" && result.brief.workspaceWalletBalance).toBe(0);
  });

  it("marks a wallet with no balance rows as unrecorded", async () => {
    mocks.getWalletOverview.mockResolvedValue({ ...wallet, balances: [] });

    const result = await loadDashboardDailyBriefAction();

    expect(result.status === "ready" && result.brief.walletState).toBe("unrecorded");
    expect(result.status === "ready" && result.brief.workspaceWalletBalance).toBeNull();
  });

  it("marks a failed wallet section as unavailable instead of zero", async () => {
    mocks.getWalletOverview.mockResolvedValue({
      ...wallet,
      balances: [],
      sections: {
        ...wallet.sections,
        balances: { state: "unavailable", message: "wallet unavailable" },
      },
    });

    const result = await loadDashboardDailyBriefAction();

    expect(result.status === "ready" && result.brief.walletState).toBe("unavailable");
    expect(result.status === "ready" && result.brief.workspaceWalletBalance).toBeNull();
    expect(result.status === "ready" && result.warnings).toContain("Souhrn peněženky není dostupný.");
  });

  it("keeps the brief available when optional sources fail", async () => {
    mocks.listOperatorCalendarEntriesForWorkspace.mockRejectedValue(new Error("calendar unavailable"));
    mocks.getWalletOverview.mockRejectedValue(new Error("wallet unavailable"));
    mocks.listWorkspaceCallsInContext.mockRejectedValue(new Error("calls unavailable"));

    const result = await loadDashboardDailyBriefAction();

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.brief.daily.calls).toBe(2);
      expect(result.brief.todayScheduledCalls).toBe(0);
      expect(result.brief.workspaceWalletBalance).toBeNull();
      expect(result.warnings).toEqual(expect.arrayContaining([
        "Naplánované hovory a připomínky nejsou dostupné.",
        "Souhrn peněženky není dostupný.",
        "Fronta hodnocení není dostupná.",
      ]));
    }
  });
});
