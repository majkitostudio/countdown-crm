import { describe, expect, it } from "vitest";
import { getDailyTeamSummary } from "@/lib/dailyTeamSummary";
import { buildTeamLeaderDailyBrief } from "@/lib/teamLeaderDailyBrief";

const now = new Date("2026-08-31T10:00:00.000Z");

describe("Team Leader Daily Brief", () => {
  it("calculates today's calls, completed orders and revenue", () => {
    const daily = getDailyTeamSummary(
      [
        { created_at: "2026-08-31T08:00:00.000Z" },
        { created_at: "2026-08-30T08:00:00.000Z" },
      ],
      [
        { created_at: "2026-08-31T09:00:00.000Z", status: "completed", total_amount: 125, currency: "CZK" },
        { created_at: "2026-08-31T09:30:00.000Z", status: "pending", total_amount: 80, currency: "CZK" },
      ],
      now,
    );

    expect(daily).toEqual({
      date: "2026-08-31",
      calls: 1,
      completedOrders: 1,
      revenue: 125,
      revenueByCurrency: [{ currency: "CZK", amount: 125 }],
      currency: "CZK",
      conversionRate: 100,
    });
  });

  it("summarizes callback attention and team wallet without inventing missing wallet data", () => {
    const brief = buildTeamLeaderDailyBrief({
      now,
      daily: { date: "2026-08-31", calls: 3, completedOrders: 1, revenue: 125, revenueByCurrency: [{ currency: "CZK", amount: 125 }], currency: "CZK", conversionRate: 33.3 },
      callbacks: [{
        id: "callback-1",
        lead_id: "lead-1",
        lead_name: "Jana Nováková",
        scheduled_at: "2026-08-31T09:00:00.000Z",
      }],
      reminders: [{ starts_at: "2026-08-31T12:00:00.000Z", status: "open" }],
      wallet: null,
    });

    expect(brief.todayCallbacks).toBe(1);
    expect(brief.overdueCallbacks).toBe(1);
    expect(brief.openReminders).toBe(1);
    expect(brief.teamWalletBalance).toBeNull();
    expect(brief.nextAction.kind).toBe("callback");
  });
});
