import { describe, expect, it } from "vitest";
import {
  groupByOperator,
  RECENT_ITEMS_PER_OPERATOR_LIMIT,
  splitCallbacksByDue,
} from "@/lib/teamWorkspaceMetrics";

describe("team checkpoint helpers", () => {
  it("groups newest-first items per operator and caps each group", () => {
    const items = Array.from({ length: 12 }, (_, index) => ({
      id: `call-${index}`,
      operatorId: "op-1",
      createdAt: `2026-09-19T10:${String(30 - index).padStart(2, "0")}:00.000Z`,
    }));
    const grouped = groupByOperator(items, 10);
    expect(Object.keys(grouped)).toEqual(["op-1"]);
    expect(grouped["op-1"]).toHaveLength(10);
    expect(grouped["op-1"][0].id).toBe("call-0");
    expect(grouped["op-1"][9].id).toBe("call-9");
  });

  it("uses ten items per operator by default", () => {
    expect(RECENT_ITEMS_PER_OPERATOR_LIMIT).toBe(10);
    const items = Array.from({ length: 25 }, (_, index) => ({
      id: `call-${index}`,
      operatorId: index % 2 === 0 ? "op-1" : "op-2",
      createdAt: "2026-09-19T10:00:00.000Z",
    }));
    const grouped = groupByOperator(items);
    expect(grouped["op-1"]).toHaveLength(10);
    expect(grouped["op-2"]).toHaveLength(10);
  });

  it("drops items without an operator instead of fabricating ownership", () => {
    const grouped = groupByOperator([
      { id: "call-1", operatorId: null, createdAt: "2026-09-19T10:00:00.000Z" },
      { id: "call-2", operatorId: "op-1", createdAt: "2026-09-19T10:01:00.000Z" },
    ]);
    expect(grouped["op-1"].map((item) => item.id)).toEqual(["call-2"]);
    expect("null" in grouped).toBe(false);
  });

  it("splits callbacks into overdue and upcoming with a sharp boundary", () => {
    const now = new Date("2026-09-19T12:00:00.000Z");
    const { overdue, upcoming } = splitCallbacksByDue(
      [
        { id: "past", scheduledAt: "2026-09-19T11:59:59.000Z" },
        { id: "exact", scheduledAt: "2026-09-19T12:00:00.000Z" },
        { id: "future", scheduledAt: "2026-09-19T12:00:01.000Z" },
      ],
      now,
    );
    expect(overdue.map((item) => item.id)).toEqual(["past"]);
    expect(upcoming.map((item) => item.id)).toEqual(["exact", "future"]);
  });
});
