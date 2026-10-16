import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createEmptyCallActivity, getCallActivity } from "@/lib/callActivity";

const projectRoot = path.resolve(__dirname, "..");
const NOW = new Date("2026-10-16T12:00:00.000Z");

describe("getCallActivity", () => {
  it("buckets persisted call timestamps into daily and hourly volume", () => {
    const calls = [
      { created_at: "2026-10-16T09:15:00.000Z" },
      { created_at: "2026-10-16T09:45:30.000Z" },
      { created_at: "2026-10-16T09:59:59.000Z" },
      { created_at: "2026-10-12T18:00:00.000Z" },
    ];

    const activity = getCallActivity(calls, NOW);

    expect(activity.periodStart).toBe("2026-10-10");
    expect(activity.periodEnd).toBe("2026-10-16");
    expect(activity.periodDays).toBe(7);
    expect(activity.totalCalls).toBe(4);

    expect(activity.daily).toHaveLength(7);
    expect(activity.daily[0]).toMatchObject({ date: "2026-10-10", count: 0 });
    expect(activity.daily[6]).toMatchObject({ date: "2026-10-16", count: 3 });
    expect(activity.daily.find((point) => point.date === "2026-10-12")?.count).toBe(1);

    expect(activity.hourly).toHaveLength(24);
    expect(activity.hourly[9].count).toBe(3);
    expect(activity.hourly[18].count).toBe(1);
    expect(activity.hourly.reduce((sum, point) => sum + point.count, 0)).toBe(4);
    expect(activity.peakHour).toBe(9);
  });

  it("ignores calls outside the period and unparseable timestamps", () => {
    const calls = [
      { created_at: "2026-10-01T09:00:00.000Z" },
      { created_at: "2026-10-17T09:00:00.000Z" },
      { created_at: "not-a-date" },
      { created_at: "2026-10-16T09:00:00.000Z" },
    ];

    const activity = getCallActivity(calls, NOW);

    expect(activity.totalCalls).toBe(1);
    expect(activity.daily.reduce((sum, point) => sum + point.count, 0)).toBe(1);
    expect(activity.hourly[9].count).toBe(1);
  });

  it("returns a zero-filled neutral shape when there are no calls", () => {
    const activity = getCallActivity([], NOW);

    expect(activity.totalCalls).toBe(0);
    expect(activity.peakHour).toBeNull();
    expect(activity.daily).toHaveLength(7);
    expect(activity.daily.every((point) => point.count === 0)).toBe(true);
    expect(activity.hourly).toHaveLength(24);
    expect(activity.hourly.every((point) => point.count === 0)).toBe(true);
  });
});

describe("createEmptyCallActivity", () => {
  it("produces no bars and no invented totals", () => {
    const activity = createEmptyCallActivity();

    expect(activity.totalCalls).toBe(0);
    expect(activity.daily).toEqual([]);
    expect(activity.hourly).toEqual([]);
    expect(activity.peakHour).toBeNull();
  });
});

describe("CallActivityChart wiring", () => {
  it("reads real persisted calls through the server-authorized analytics action", () => {
    const component = readFileSync(
      path.join(projectRoot, "src", "components", "dashboard", "CallActivityChart.tsx"),
      "utf8",
    );

    expect(component).toContain("getAnalyticsDataAction");
    expect(component).toContain("data-testid=\"call-activity-chart\"");
    expect(component).toContain("data-call-activity-status");
    expect(component).toContain("createEmptyCallActivity");
  });

  it("keeps a neutral empty state instead of rendering fabricated numbers", () => {
    const component = readFileSync(
      path.join(projectRoot, "src", "components", "dashboard", "CallActivityChart.tsx"),
      "utf8",
    );

    expect(component).toContain("nejsou uložené žádné hovory");
    expect(component).toContain("StatusAlert");
    expect(component).not.toContain("Hourly activity unavailable");
    expect(component).not.toContain("peak-hour assumptions");
  });

  it("computes the chart payload from the calls already loaded for analytics", () => {
    const analytics = readFileSync(path.join(projectRoot, "src", "lib", "analytics.ts"), "utf8");

    expect(analytics).toContain("callActivity: getCallActivity(calls)");
    expect(analytics).toContain("callActivity: CallActivityOverview");
  });
});
