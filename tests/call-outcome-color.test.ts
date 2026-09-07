import { describe, expect, it } from "vitest";
import { getCallOutcomeClassName } from "@/lib/callOutcomeStyles";

describe("call outcome color hierarchy", () => {
  it("uses restrained semantic colors for important outcomes", () => {
    expect(getCallOutcomeClassName("order_placed")).toContain("text-emerald-200");
    expect(getCallOutcomeClassName("completed")).toContain("text-emerald-200");
    expect(getCallOutcomeClassName("followup_scheduled")).toContain("text-amber-200");
    expect(getCallOutcomeClassName("no_answer")).toContain("text-amber-200");
    expect(getCallOutcomeClassName("objection")).toContain("text-rose-200");
  });
});
