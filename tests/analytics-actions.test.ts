import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAnalyticsData: vi.fn(),
  getRecentActivity: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/analytics", () => ({
  getAnalyticsData: mocks.getAnalyticsData,
  getRecentActivity: mocks.getRecentActivity,
}));

import {
  exportAnalyticsDataAction,
  getAnalyticsDataAction,
  getRecentActivityAction,
} from "@/app/actions/analytics";
import { DataAccessError } from "@/lib/dal/errors";

const analyticsData = {
  totalRevenue: 125,
  projectedRevenue: 0,
  forecastGrowthPercent: 0,
  forecastAvailable: false,
  avgOrderValue: 125,
  totalCalls: 1,
  conversionRate: 100,
  objectionResolutionRate: null,
  objectionMetricsAvailable: false,
  weeklySales: [],
  objectionBreakdown: [],
  teamLeaderboard: [],
  teamMetricsAvailable: false,
};

describe("analytics Server Action contract", () => {
  it("returns an allowed overview without changing the workspace-scoped data", async () => {
    mocks.getAnalyticsData.mockResolvedValue(analyticsData);

    await expect(getAnalyticsDataAction("workspace-1")).resolves.toEqual({ ok: true, data: analyticsData });
    expect(mocks.getAnalyticsData).toHaveBeenCalledWith("workspace-1");
  });

  it("returns an explicit 403 forbidden result without analytics data", async () => {
    mocks.getAnalyticsData.mockRejectedValue(new DataAccessError("FORBIDDEN", "Insufficient workspace permissions"));

    const result = await getAnalyticsDataAction();

    expect(result).toEqual({
      ok: false,
      code: "FORBIDDEN",
      status: 403,
      message: "Analytics are available to Team Leaders and Administrators only.",
    });
    expect(result).not.toHaveProperty("data");
  });

  it("keeps unauthenticated and unavailable states distinct from forbidden", async () => {
    mocks.getAnalyticsData.mockRejectedValueOnce(new Error("Unauthorized"));
    await expect(getAnalyticsDataAction()).resolves.toMatchObject({ ok: false, code: "UNAUTHORIZED", status: 401 });

    mocks.getAnalyticsData.mockRejectedValueOnce(new DataAccessError("DATABASE", "Analytics query failed"));
    await expect(getAnalyticsDataAction()).resolves.toMatchObject({ ok: false, code: "UNAVAILABLE", status: 503 });
  });

  it("uses the same guarded reader for export and never returns export data when forbidden", async () => {
    mocks.getAnalyticsData.mockResolvedValueOnce(analyticsData);
    await expect(exportAnalyticsDataAction()).resolves.toEqual({ ok: true, data: analyticsData });

    mocks.getAnalyticsData.mockRejectedValueOnce(new DataAccessError("FORBIDDEN", "Insufficient workspace permissions"));
    const result = await exportAnalyticsDataAction("workspace-foreign");

    expect(result).toMatchObject({ ok: false, code: "FORBIDDEN", status: 403 });
    expect(result).not.toHaveProperty("data");
    expect(mocks.getAnalyticsData).toHaveBeenLastCalledWith("workspace-foreign");
  });

  it("returns the same explicit result contract for recent activity", async () => {
    mocks.getRecentActivity.mockResolvedValue([{ id: "call-1" }]);

    await expect(getRecentActivityAction(5, "workspace-1")).resolves.toEqual({
      ok: true,
      data: [{ id: "call-1" }],
    });
    expect(mocks.getRecentActivity).toHaveBeenCalledWith(5, "workspace-1");
  });
});
