import { describe, expect, it } from "vitest";
import {
  isTeamWorkspacePeriodKey,
  periodBoundsForPeriodKey,
  TEAM_WORKSPACE_PERIOD_KEYS,
  TEAM_WORKSPACE_PERIOD_LABELS,
} from "@/lib/teamWorkspaceScope";

describe("teamWorkspaceScope", () => {
  it("recognises only valid period keys", () => {
    expect(isTeamWorkspacePeriodKey("today")).toBe(true);
    expect(isTeamWorkspacePeriodKey("week")).toBe(true);
    expect(isTeamWorkspacePeriodKey("month")).toBe(true);
    expect(isTeamWorkspacePeriodKey("year")).toBe(false);
    expect(isTeamWorkspacePeriodKey(undefined)).toBe(false);
    expect(isTeamWorkspacePeriodKey(null)).toBe(false);
    expect(isTeamWorkspacePeriodKey(42)).toBe(false);
  });

  it("exposes the selectable period keys and their labels", () => {
    expect(TEAM_WORKSPACE_PERIOD_KEYS).toEqual(["today", "week", "month"]);
    expect(TEAM_WORKSPACE_PERIOD_LABELS).toEqual({
      today: "Dnes",
      week: "Týden",
      month: "Měsíc",
    });
  });

  it("bounds the today period to the UTC calendar day", () => {
    const now = new Date("2026-09-19T15:30:00.000Z");
    expect(periodBoundsForPeriodKey("today", now)).toEqual({
      from: "2026-09-19T00:00:00.000Z",
      to: "2026-09-20T00:00:00.000Z",
    });
  });

  it("bounds the week period from Monday to the following Monday", () => {
    const saturday = new Date("2026-09-19T10:00:00.000Z");
    expect(periodBoundsForPeriodKey("week", saturday)).toEqual({
      from: "2026-09-14T00:00:00.000Z",
      to: "2026-09-21T00:00:00.000Z",
    });

    const sunday = new Date("2026-09-20T23:59:00.000Z");
    expect(periodBoundsForPeriodKey("week", sunday)).toEqual({
      from: "2026-09-14T00:00:00.000Z",
      to: "2026-09-21T00:00:00.000Z",
    });
  });

  it("bounds the week period from a Monday without shifting it", () => {
    const monday = new Date("2026-09-14T08:00:00.000Z");
    expect(periodBoundsForPeriodKey("week", monday)).toEqual({
      from: "2026-09-14T00:00:00.000Z",
      to: "2026-09-21T00:00:00.000Z",
    });
  });

  it("bounds the month period to the UTC month boundaries", () => {
    const now = new Date("2026-09-19T15:30:00.000Z");
    expect(periodBoundsForPeriodKey("month", now)).toEqual({
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-10-01T00:00:00.000Z",
    });
  });

  it("handles a month boundary inside a leap-supporting year", () => {
    const now = new Date("2026-12-31T12:00:00.000Z");
    expect(periodBoundsForPeriodKey("month", now)).toEqual({
      from: "2026-12-01T00:00:00.000Z",
      to: "2027-01-01T00:00:00.000Z",
    });
  });
});