import { describe, expect, it } from "vitest";
import { buildFailureReasonRanking, FAILURE_REASON_UNRECORDED_LABEL } from "@/lib/failureReasonRanking";

describe("buildFailureReasonRanking", () => {
  it("counts only objection calls and sorts by frequency descending", () => {
    const ranking = buildFailureReasonRanking([
      { outcome: "objection", failReason: "no_interest" },
      { outcome: "objection", failReason: "no_interest" },
      { outcome: "objection", failReason: "unsuccessful_sale" },
      { outcome: "order_placed", failReason: "no_interest" },
      { outcome: "objection", failReason: "price" },
    ]);

    expect(ranking.total).toBe(4);
    expect(ranking.reasons[0]).toMatchObject({ reason: "no_interest", count: 2, group: "not_influenceable" });
    // Stejný počet rozhoduje české abecední pořadí popisků: Cena < Neuzavřený obchod.
    expect(ranking.reasons[1]).toMatchObject({ reason: "price", count: 1, group: "influenceable" });
    expect(ranking.reasons[2]).toMatchObject({ reason: "unsuccessful_sale", count: 1, group: "influenceable" });
    expect(ranking.influenceableTotal).toBe(2);
    expect(ranking.notInfluenceableTotal).toBe(2);
    expect(ranking.influenceablePercent).toBe(50);
  });

  it("resolves Czech labels for known reasons and preserves unknown text", () => {
    const ranking = buildFailureReasonRanking([
      { outcome: "objection", failReason: "no_interest" },
      { outcome: "objection", failReason: "price" },
      { outcome: "objection", failReason: "strange_custom_reason" },
    ]);

    expect(ranking.reasons[0].label).toBe("Bez zájmu (ukončeno)");
    expect(ranking.reasons[1].label).toBe("Cena");
    expect(ranking.reasons[2]).toMatchObject({ label: "strange_custom_reason", reason: "strange_custom_reason" });
  });

  it("uses a dedicated label for unrecorded reasons", () => {
    const ranking = buildFailureReasonRanking([
      { outcome: "objection", failReason: null },
      { outcome: "objection", failReason: "" },
      { outcome: "objection", failReason: "   " },
    ]);

    expect(ranking.total).toBe(3);
    ranking.reasons.forEach((reason) => {
      expect(reason.label).toBe(FAILURE_REASON_UNRECORDED_LABEL);
      expect(reason.reason).toBeNull();
    });
  });

  it("computes percentage share of all objection calls and returns empty list when none", () => {
    const withData = buildFailureReasonRanking([
      { outcome: "objection", failReason: "no_interest" },
      { outcome: "objection", failReason: "unsuccessful_sale" },
    ]);
    expect(withData.reasons[0].percent).toBe(50);
    expect(withData.reasons[1].percent).toBe(50);

    const empty = buildFailureReasonRanking([{ outcome: "order_placed", failReason: "no_interest" }]);
    expect(empty).toEqual({
      total: 0,
      reasons: [],
      influenceableTotal: 0,
      notInfluenceableTotal: 0,
      influenceablePercent: 0,
    });
  });
});
