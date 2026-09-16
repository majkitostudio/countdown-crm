import { describe, expect, it } from "vitest";
import { buildTeamWorkspaceOperatorMetrics } from "@/lib/teamWorkspaceMetrics";

const period = {
  from: "2026-09-16T00:00:00.000Z",
  to: "2026-09-17T00:00:00.000Z",
};

const operators = [{ id: "operator-1", name: "P1 Operator" }];

describe("Team Workspace operator metrics", () => {
  it("counts all sales statuses including manual orders and calculates the approved conversion", () => {
    const [metrics] = buildTeamWorkspaceOperatorMetrics({
      operators,
      calls: [
        { id: "call-sale", operatorId: "operator-1", occurredAt: "2026-09-16T08:00:00.000Z", outcome: "order_placed" },
        { id: "call-fail", operatorId: "operator-1", occurredAt: "2026-09-16T09:00:00.000Z", outcome: "objection" },
      ],
      orders: [
        { id: "manual", operatorId: "operator-1", createdAt: "2026-09-16T08:30:00.000Z", status: "in_progress" },
        { id: "post-call", operatorId: "operator-1", createdAt: "2026-09-16T08:40:00.000Z", status: "completed" },
        { id: "sent", operatorId: "operator-1", createdAt: "2026-09-16T08:50:00.000Z", status: "sent" },
        { id: "delivered", operatorId: "operator-1", createdAt: "2026-09-16T08:55:00.000Z", status: "delivered" },
        { id: "cancelled", operatorId: "operator-1", createdAt: "2026-09-16T08:56:00.000Z", status: "cancelled" },
        { id: "returned", operatorId: "operator-1", createdAt: "2026-09-16T08:57:00.000Z", status: "returned" },
      ],
      activities: [],
      shifts: [],
      period,
    });

    expect(metrics).toMatchObject({ sales: 4, fails: 1, conversionPercent: 400 });
  });

  it("counts dialed and connected calls separately", () => {
    const [metrics] = buildTeamWorkspaceOperatorMetrics({
      operators,
      calls: [
        { id: "answered", operatorId: "operator-1", occurredAt: "2026-09-16T08:00:00.000Z", outcome: "completed" },
        { id: "no-answer", operatorId: "operator-1", occurredAt: "2026-09-16T08:10:00.000Z", outcome: "no_answer" },
      ],
      orders: [],
      activities: [],
      shifts: [],
      period,
    });

    expect(metrics).toMatchObject({ dialedCalls: 2, connectedCalls: 1 });
  });

  it("calculates talk time and percentage against the individual shift", () => {
    const [metrics] = buildTeamWorkspaceOperatorMetrics({
      operators,
      calls: [],
      orders: [],
      activities: [
        { id: "activity-1", operatorId: "operator-1", startedAt: "2026-09-16T08:00:00.000Z", endedAt: "2026-09-16T09:00:00.000Z" },
        { id: "activity-2", operatorId: "operator-1", startedAt: "2026-09-16T10:00:00.000Z", endedAt: "2026-09-16T10:30:00.000Z" },
      ],
      shifts: [{ operatorId: "operator-1", startsAt: "2026-09-16T08:00:00.000Z", endsAt: "2026-09-16T12:00:00.000Z" }],
      period,
    });

    expect(metrics).toMatchObject({ talkTimeSeconds: 5400, shiftSeconds: 14400, talkTimePercent: 37.5 });
  });

  it("keeps conversion and talk-time percentage unavailable without a denominator", () => {
    const [metrics] = buildTeamWorkspaceOperatorMetrics({
      operators,
      calls: [],
      orders: [],
      activities: [],
      shifts: [],
      period,
    });

    expect(metrics.conversionPercent).toBeNull();
    expect(metrics.talkTimePercent).toBeNull();
    expect(metrics.shiftSeconds).toBeNull();
  });

  it("clips activity and shift time to the selected period", () => {
    const [metrics] = buildTeamWorkspaceOperatorMetrics({
      operators,
      calls: [],
      orders: [],
      activities: [{ id: "activity-1", operatorId: "operator-1", startedAt: "2026-09-15T23:30:00.000Z", endedAt: "2026-09-16T00:30:00.000Z" }],
      shifts: [{ operatorId: "operator-1", startsAt: "2026-09-15T23:00:00.000Z", endsAt: "2026-09-17T01:00:00.000Z" }],
      period,
    });

    expect(metrics.talkTimeSeconds).toBe(1800);
    expect(metrics.shiftSeconds).toBe(86400);
    expect(metrics.talkTimePercent).toBe(2.1);
  });
});
