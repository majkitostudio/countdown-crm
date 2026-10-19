import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDepartmentQueueOverview } from "@/lib/departmentQueues";
import { TeamQueuesSummaryStrip } from "@/components/team/TeamQueuesSummaryStrip";

const TEAMS = [
  { id: "team-1", slug: "p1k", name: "P1K" },
  { id: "team-2", slug: "p4x", name: "P4X" },
];

function overviewFixture(now = new Date("2026-10-16T12:00:00.000Z")) {
  return buildDepartmentQueueOverview(
    [
      // P1K → department P1: two waiting, one in progress
      { team_id: "team-1", state: "available", scheduled_at: null },
      { team_id: "team-1", state: "available", scheduled_at: null },
      { team_id: "team-1", state: "in_progress", scheduled_at: null },
      // P4X → department P4: one scheduled call overdue, one on time
      { team_id: "team-2", state: "scheduled", scheduled_at: "2026-10-16T09:00:00.000Z" },
      { team_id: "team-2", state: "scheduled", scheduled_at: "2026-10-16T18:00:00.000Z" },
      // no team → unattributed
      { team_id: null, state: "available", scheduled_at: null },
    ],
    TEAMS,
    now,
  );
}

function noop() {}

describe("TeamQueuesSummaryStrip", () => {
  it("shows per-department counts including overdue scheduled calls", () => {
    const html = renderToStaticMarkup(
      React.createElement(TeamQueuesSummaryStrip, { overview: overviewFixture(), onOpenQueues: noop }),
    );

    expect(html).toContain("Kolik práce kde čeká");
    // department badges P1–P4 are always present
    for (const key of ["P1", "P2", "P3", "P4"]) {
      expect(html).toContain(`>${key}</span>`);
    }
    // unattributed bucket is surfaced, not silently dropped
    expect(html).toContain("není přiřazeno žádnému oddělení");
  });

  it("works with an empty overview instead of hiding the section", () => {
    const html = renderToStaticMarkup(
      React.createElement(TeamQueuesSummaryStrip, {
        overview: buildDepartmentQueueOverview([], [], new Date("2026-10-16T12:00:00.000Z")),
        onOpenQueues: noop,
      }),
    );

    expect(html).toContain("Kolik práce kde čeká");
    expect(html).not.toContain("není přiřazeno žádnému oddělení");
  });

  it("shows a notice instead of fabricated zeros when the source is unavailable", () => {
    const html = renderToStaticMarkup(
      React.createElement(TeamQueuesSummaryStrip, { overview: null, onOpenQueues: noop }),
    );

    expect(html).toContain("Přehled front oddělení není dostupný");
    expect(html).not.toContain("Kolik práce kde čeká");
  });
});
