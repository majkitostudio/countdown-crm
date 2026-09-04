import { describe, expect, it } from "vitest";

import {
  FAIL_REASON_OPTIONS,
  isFailReason,
  validateFailDetails,
} from "@/lib/postCall";
import { getCallOutcomeLabel } from "@/components/workspace/OperatorCallControls";

describe("post-call fail details", () => {
  it("exposes the approved fail reason taxonomy", () => {
    expect(FAIL_REASON_OPTIONS.map((option) => option.value)).toEqual([
      "price",
      "distrust",
      "alternative_solution",
      "health_concern",
      "no_interest",
      "needs_time",
      "other",
    ]);
    expect(FAIL_REASON_OPTIONS.map((option) => option.label)).toEqual([
      "Price",
      "Trust or doubts",
      "Already uses another solution",
      "Health concern or not suitable",
      "No interest",
      "Wants to think",
      "Other reason",
    ]);
  });

  it("accepts only known fail reasons", () => {
    expect(isFailReason("price")).toBe(true);
    expect(isFailReason("unknown")).toBe(false);
    expect(isFailReason(null)).toBe(false);
  });

  it("requires both a reason and a note before a fail can be saved", () => {
    expect(validateFailDetails({ failReason: "", note: "" })).toBe("Select a fail reason.");
    expect(validateFailDetails({ failReason: "price", note: "  " })).toBe("Add a short note for this fail.");
    expect(validateFailDetails({ failReason: "price", note: "Client considers the price too high." })).toBeNull();
  });

  it("renames the negative outcome to Fail", () => {
    expect(getCallOutcomeLabel("fail")).toBe("Fail");
  });
});
