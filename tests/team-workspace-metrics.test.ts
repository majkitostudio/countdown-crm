import { describe, expect, it } from "vitest";
import { buildTeamWorkspaceOperatorMetrics, filterAttributedCalls } from "@/lib/teamWorkspaceMetrics";
import { buildFailureReasonRanking } from "@/lib/failureReasonRanking";

const period = {
  from: "2026-09-16T00:00:00.000Z",
  to: "2026-09-17T00:00:00.000Z",
};

const operators = [{ id: "operator-1", name: "P1 Operator" }];

describe("Team Workspace operator metrics", () => {
  it("counts all sales statuses including manual orders and calculates conversion against dialed calls", () => {
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

    expect(metrics).toMatchObject({ sales: 4, fails: 1, dialedCalls: 2, conversionPercent: 200 });
  });

  it("counts unanswered calls in the conversion denominator (orders / all calls)", () => {
    const [metrics] = buildTeamWorkspaceOperatorMetrics({
      operators,
      calls: [
        { id: "sale", operatorId: "operator-1", occurredAt: "2026-09-16T08:00:00.000Z", outcome: "order_placed" },
        { id: "miss-1", operatorId: "operator-1", occurredAt: "2026-09-16T08:05:00.000Z", outcome: "no_answer" },
        { id: "miss-2", operatorId: "operator-1", occurredAt: "2026-09-16T08:10:00.000Z", outcome: "no_answer" },
        { id: "miss-3", operatorId: "operator-1", occurredAt: "2026-09-16T08:15:00.000Z", outcome: "no_answer" },
      ],
      orders: [
        { id: "order-1", operatorId: "operator-1", createdAt: "2026-09-16T08:20:00.000Z", status: "completed" },
      ],
      activities: [],
      shifts: [],
      period,
    });

    // 1 prodej ze 4 vytočených. Kdyby se počítalo jen ze spojených, vyšlo by 100 %.
    expect(metrics).toMatchObject({ sales: 1, dialedCalls: 4, connectedCalls: 1, conversionPercent: 25 });
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

describe("filterAttributedCalls", () => {
  it("keeps only calls that belong to an operator in scope", () => {
    const calls = [
      { operatorId: "operator-1", outcome: "objection" },
      { operatorId: null, outcome: "objection" },
      { operatorId: "operator-outside", outcome: "objection" },
    ];

    const filtered = filterAttributedCalls(calls, operators);

    expect(filtered.map((call) => call.operatorId)).toEqual(["operator-1"]);
  });

  it("makes the failure-reason ranking add up to the per-operator failed calls", () => {
    const calls = [
      { id: "attributed", operatorId: "operator-1", occurredAt: "2026-09-16T08:00:00.000Z", outcome: "objection" as const },
      { id: "unattributed", operatorId: null, occurredAt: "2026-09-16T08:30:00.000Z", outcome: "objection" as const },
    ];

    const [metrics] = buildTeamWorkspaceOperatorMetrics({
      operators,
      calls,
      orders: [],
      activities: [],
      shifts: [],
      period,
    });
    const ranking = buildFailureReasonRanking(
      filterAttributedCalls(calls, operators).map((call) => ({ outcome: call.outcome, failReason: null })),
    );

    // Součet v žebříčku se rovná sloupci „Neúspěšné hovory" — hovor bez
    // operátora se do žebříčku nedostane, protože se nedá nikomu připsat.
    expect(metrics.fails).toBe(1);
    expect(ranking.total).toBe(metrics.fails);
  });
});
