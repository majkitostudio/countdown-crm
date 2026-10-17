import { describe, expect, it } from "vitest";
import { buildLiveOpsSummary, isPresenceSignalFresh } from "@/lib/liveOpsSummary";

const now = new Date("2026-09-16T10:00:00.000Z");
const fresh = "2026-09-16T09:58:00.000Z"; // 2 minuty
const stale = "2026-09-16T09:50:00.000Z"; // 10 minut
const boundary = "2026-09-16T09:55:00.000Z"; // přesně 5 minut

function operator(operatorId: string) {
  return { operatorId };
}

describe("buildLiveOpsSummary", () => {
  it("counts each presence state separately", () => {
    const summary = buildLiveOpsSummary(
      ["op-1", "op-2", "op-3", "op-4", "op-5"].map(operator),
      [
        { operatorId: "op-1", state: "available", lastHeartbeatAt: fresh },
        { operatorId: "op-2", state: "in_call", lastHeartbeatAt: fresh },
        { operatorId: "op-3", state: "after_call", lastHeartbeatAt: fresh },
        { operatorId: "op-4", state: "break", lastHeartbeatAt: fresh },
        { operatorId: "op-5", state: "offline", lastHeartbeatAt: fresh },
      ],
      now,
    );

    expect(summary.total).toBe(5);
    expect(summary.counts).toEqual({ available: 1, inCall: 1, afterCall: 1, break: 1, offline: 1 });
    expect(summary.staleSignals).toBe(0);
  });

  it("counts an operator without any signal row as offline", () => {
    const summary = buildLiveOpsSummary(
      ["op-1", "op-2"].map(operator),
      [{ operatorId: "op-1", state: "available", lastHeartbeatAt: fresh }],
      now,
    );

    expect(summary.total).toBe(2);
    expect(summary.counts.available).toBe(1);
    expect(summary.counts.offline).toBe(1);
    // Chybějící záznam není „vyprchavší signál" — o offline mlčíme.
    expect(summary.staleSignals).toBe(0);
  });

  it("treats a stale signal as offline and reports it separately", () => {
    const summary = buildLiveOpsSummary(
      ["op-1", "op-2"].map(operator),
      [
        { operatorId: "op-1", state: "available", lastHeartbeatAt: stale },
        { operatorId: "op-2", state: "available", lastHeartbeatAt: fresh },
      ],
      now,
    );

    expect(summary.counts.available).toBe(1);
    expect(summary.counts.offline).toBe(1);
    expect(summary.staleSignals).toBe(1);
  });

  it("ignores presence rows for operators outside the scope", () => {
    const summary = buildLiveOpsSummary(
      [operator("op-1")],
      [
        { operatorId: "op-1", state: "available", lastHeartbeatAt: fresh },
        { operatorId: "op-outside", state: "available", lastHeartbeatAt: fresh },
      ],
      now,
    );

    expect(summary.total).toBe(1);
    expect(summary.counts.available).toBe(1);
  });

  it("returns honest zeros when there are no operators in scope", () => {
    const summary = buildLiveOpsSummary([], [], now);

    expect(summary).toEqual({
      total: 0,
      counts: { available: 0, inCall: 0, afterCall: 0, break: 0, offline: 0 },
      staleSignals: 0,
    });
  });
});

describe("isPresenceSignalFresh", () => {
  it("keeps signals newer than five minutes fresh", () => {
    expect(isPresenceSignalFresh(fresh, now)).toBe(true);
  });

  it("does not treat a signal exactly five minutes old as fresh", () => {
    expect(isPresenceSignalFresh(boundary, now)).toBe(false);
  });

  it("is not fresh for an unreadable timestamp", () => {
    expect(isPresenceSignalFresh("not-a-date", now)).toBe(false);
  });
});
