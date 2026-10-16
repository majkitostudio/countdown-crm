import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildTeamRiskSummary } from "@/lib/teamRiskSummary";
import { TeamRiskSummaryStrip } from "@/components/team/TeamRiskSummaryStrip";

const NOW = new Date("2026-10-16T12:00:00.000Z");

function queueItem(overrides: Partial<Parameters<typeof buildTeamRiskSummary>[0][number]> = {}) {
  return {
    state: "assigned",
    scheduled_at: null,
    lease_expires_at: null,
    recovery_required: false,
    ...overrides,
  };
}

function pickupOrder(overrides: Partial<Parameters<typeof buildTeamRiskSummary>[1][number]> = {}) {
  return {
    status: "sent",
    package_location: "Výdejna",
    package_arrived_at: "2026-10-10T12:00:00.000Z",
    pickup_call_completed_at: null,
    ...overrides,
  };
}

describe("buildTeamRiskSummary", () => {
  it("counts an empty workspace as zero risks", () => {
    expect(buildTeamRiskSummary([], [], NOW)).toEqual({
      outcomeRecovery: 0,
      overdueScheduledCalls: 0,
      expiredLeases: 0,
      pickupRiskWarning: 0,
      pickupRiskAlarm: 0,
      total: 0,
    });
  });

  it("counts calls without a recorded outcome, including recovery_required", () => {
    const summary = buildTeamRiskSummary(
      [
        queueItem({ state: "awaiting_outcome" }),
        queueItem({ state: "assigned", recovery_required: true }),
      ],
      [],
      NOW,
    );

    expect(summary.outcomeRecovery).toBe(2);
    expect(summary.total).toBe(2);
  });

  it("counts an overdue scheduled call but not one still in the future", () => {
    const summary = buildTeamRiskSummary(
      [
        queueItem({ state: "waiting_callback", scheduled_at: "2026-10-16T09:00:00.000Z" }),
        queueItem({ state: "waiting_callback", scheduled_at: "2026-10-16T18:00:00.000Z" }),
      ],
      [],
      NOW,
    );

    expect(summary.overdueScheduledCalls).toBe(1);
  });

  it("counts an expired lease only for assigned leads", () => {
    const summary = buildTeamRiskSummary(
      [
        queueItem({ state: "assigned", lease_expires_at: "2026-10-16T11:00:00.000Z" }),
        queueItem({ state: "assigned", lease_expires_at: "2026-10-16T13:00:00.000Z" }),
        queueItem({ state: "in_progress", lease_expires_at: "2026-10-16T11:00:00.000Z" }),
      ],
      [],
      NOW,
    );

    expect(summary.expiredLeases).toBe(1);
  });

  it("gives each queue row at most one category, matching exception precedence", () => {
    const summary = buildTeamRiskSummary(
      [
        queueItem({
          state: "waiting_callback",
          scheduled_at: "2026-10-16T09:00:00.000Z",
          recovery_required: true,
        }),
      ],
      [],
      NOW,
    );

    expect(summary.outcomeRecovery).toBe(1);
    expect(summary.overdueScheduledCalls).toBe(0);
    expect(summary.total).toBe(1);
  });

  it("separates pickup risk warnings from alarms", () => {
    const summary = buildTeamRiskSummary(
      [],
      [
        pickupOrder({ package_arrived_at: "2026-10-14T12:00:00.000Z" }), // 2 days → warning
        pickupOrder({ package_arrived_at: "2026-10-10T12:00:00.000Z" }), // 6 days → alarm
        pickupOrder({ package_arrived_at: "2026-10-10T12:00:00.000Z", pickup_call_completed_at: "2026-10-11T09:00:00.000Z" }), // called → calm
      ],
      NOW,
    );

    expect(summary.pickupRiskWarning).toBe(1);
    expect(summary.pickupRiskAlarm).toBe(1);
    expect(summary.total).toBe(2);
  });
});

describe("TeamRiskSummaryStrip", () => {
  it("shows category counts and links to the Exception Queue", () => {
    const summary = buildTeamRiskSummary(
      [queueItem({ state: "awaiting_outcome" })],
      [pickupOrder({ package_arrived_at: "2026-10-10T12:00:00.000Z" })],
      NOW,
    );

    const html = renderToStaticMarkup(React.createElement(TeamRiskSummaryStrip, { summary }));

    expect(html).toContain("Rizika a prodlevy");
    expect(html).toContain("/team/exceptions");
    expect(html).toContain("Hovor bez výsledku");
    expect(html).toContain("Zásilka na výdejně — alarm");
  });

  it("shows a calm zero state when the source is available and empty", () => {
    const html = renderToStaticMarkup(
      React.createElement(TeamRiskSummaryStrip, { summary: buildTeamRiskSummary([], [], NOW) }),
    );

    expect(html).toContain("Nic nehoří.");
  });

  it("shows a notice instead of fabricated zeros when the source is unavailable", () => {
    const html = renderToStaticMarkup(React.createElement(TeamRiskSummaryStrip, { summary: null }));

    expect(html).toContain("Rizika a prodlevy nejsou dostupné");
    expect(html).not.toContain("Nic nehoří.");
  });
});
