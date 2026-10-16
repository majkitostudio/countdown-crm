import { describe, expect, it } from "vitest";
import { describeQueueReason } from "@/lib/queueReason";

describe("describeQueueReason", () => {
  it("describes the P4 rescue routing markers recorded by the SQL functions", () => {
    expect(describeQueueReason("objection")).toEqual({
      label: "Námitka – recyklace na další den",
      kind: "rescue",
    });
    expect(describeQueueReason("package_returned")).toEqual({
      label: "Vrácený balíček – Re-ship",
      kind: "rescue",
    });
    expect(describeQueueReason("at_risk_pickup")).toEqual({
      label: "Balíček na výdejně (3+ dny)",
      kind: "rescue",
    });
  });

  it("describes the P3 retention routing marker", () => {
    expect(describeQueueReason("retention_followup")).toEqual({
      label: "Retence – 21 dní po doručení",
      kind: "retention",
    });
  });

  it("returns null for plain call outcomes that are not a routing decision", () => {
    expect(describeQueueReason("no_answer")).toBeNull();
    expect(describeQueueReason("order_placed")).toBeNull();
    expect(describeQueueReason("followup_scheduled")).toBeNull();
  });

  it("returns null for missing or unknown outcomes instead of guessing", () => {
    expect(describeQueueReason(null)).toBeNull();
    expect(describeQueueReason(undefined)).toBeNull();
    expect(describeQueueReason("")).toBeNull();
    expect(describeQueueReason("something_new")).toBeNull();
  });

  it("tolerates surrounding whitespace", () => {
    expect(describeQueueReason("  package_returned  ")?.kind).toBe("rescue");
  });
});
