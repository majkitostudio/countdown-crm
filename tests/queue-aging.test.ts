import { describe, expect, it } from "vitest";
import { buildQueueAging, DAY_MS, THREE_DAYS_MS } from "@/lib/queueAging";

const now = new Date("2026-09-16T12:00:00.000Z");

function at(iso: string, state: "available" | "assigned" | "closed" | "scheduled" = "available") {
  return { state, available_at: iso };
}

describe("buildQueueAging", () => {
  it("splits waiting leads into age buckets with sharp 24 h and 72 h boundaries", () => {
    const summary = buildQueueAging([
      at("2026-09-15T13:00:00.000Z"), // 23 h
      at("2026-09-15T12:00:00.000Z"), // přesně 24 h -> 1–3 dny
      at("2026-09-13T13:00:00.000Z"), // 71 h
      at("2026-09-13T12:00:00.000Z"), // přesně 72 h -> 3+ dny
      at("2026-09-12T08:00:00.000Z"), // 100 h
    ], now);

    expect(summary.waiting).toBe(5);
    expect(summary.buckets).toEqual({ under24h: 1, dayTo3: 2, over3d: 2 });
    expect(summary.deferred).toBe(0);
  });

  it("only counts leads still waiting for an operator", () => {
    const summary = buildQueueAging([
      at("2026-09-10T08:00:00.000Z"),
      at("2026-09-10T08:00:00.000Z", "assigned"),
      at("2026-09-10T08:00:00.000Z", "closed"),
      at("2026-09-10T08:00:00.000Z", "scheduled"),
    ], now);

    expect(summary.waiting).toBe(1);
    expect(summary.buckets.over3d).toBe(1);
  });

  it("keeps leads whose time has not come yet out of the age buckets", () => {
    const summary = buildQueueAging([
      at("2026-09-17T12:00:00.000Z"), // zítra (např. recyklace do P4)
      at("2026-10-07T12:00:00.000Z"), // +21 dní (retence do P3)
    ], now);

    expect(summary.waiting).toBe(2);
    expect(summary.deferred).toBe(2);
    expect(summary.buckets).toEqual({ under24h: 0, dayTo3: 0, over3d: 0 });
    expect(summary.oldest).toBeNull();
  });

  it("reports the oldest due lead and how long it has been waiting", () => {
    const summary = buildQueueAging([
      at("2026-09-16T11:00:00.000Z"), // 1 h
      at("2026-09-14T12:00:00.000Z"), // 48 h <- nejstarší
      at("2026-09-17T12:00:00.000Z"), // ještě není na čase
    ], now);

    expect(summary.oldest).toEqual({
      availableAt: "2026-09-14T12:00:00.000Z",
      ageMs: 2 * DAY_MS,
    });
  });

  it("returns honest zeros when nothing is waiting", () => {
    expect(buildQueueAging([], now)).toEqual({
      waiting: 0,
      buckets: { under24h: 0, dayTo3: 0, over3d: 0 },
      deferred: 0,
      oldest: null,
    });
  });

  it("keeps every waiting lead in exactly one bucket", () => {
    const summary = buildQueueAging([
      at("2026-09-16T11:00:00.000Z"),
      at("2026-09-15T00:00:00.000Z"),
      at("2026-09-12T00:00:00.000Z"),
      at("2026-09-17T00:00:00.000Z"),
      at("2026-09-10T00:00:00.000Z"),
    ], now);

    const { under24h, dayTo3, over3d } = summary.buckets;
    expect(under24h + dayTo3 + over3d + summary.deferred).toBe(summary.waiting);
  });

  it("uses the documented 24 h and 72 h window constants", () => {
    expect(THREE_DAYS_MS).toBe(3 * DAY_MS);
  });
});
