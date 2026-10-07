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
      "no_interest",
      "unsuccessful_sale",
      "invalid_lead",
      "health_concern",
    ]);
    expect(FAIL_REASON_OPTIONS.map((option) => option.label)).toEqual([
      "Bez zájmu (ukončeno)",
      "Neúspěch (ukončeno bez finalizace)",
      "Invalidní přihláška (nesprávné údaje)",
      "Zdravotní důvody (alergie, intolerance)",
    ]);
  });

  it("accepts only known fail reasons", () => {
    expect(isFailReason("unsuccessful_sale")).toBe(true);
    expect(isFailReason("no_interest")).toBe(true);
    expect(isFailReason("invalid_lead")).toBe(true);
    expect(isFailReason("health_concern")).toBe(true);
    expect(isFailReason("price")).toBe(true);
    expect(isFailReason("unknown")).toBe(false);
    expect(isFailReason(null)).toBe(false);
  });

  it("requires both a reason and a note for pitch objections, but allows optional note for cold refusals", () => {
    expect(validateFailDetails({ failReason: "", note: "" })).toBe("Select a fail reason.");
    expect(validateFailDetails({ failReason: "unsuccessful_sale", note: "  " })).toBe("Add a short note for this fail.");
    expect(validateFailDetails({ failReason: "unsuccessful_sale", note: "Klient nekoupil po kompletním představení." })).toBeNull();
    expect(validateFailDetails({ failReason: "no_interest", note: "" })).toBeNull();
    expect(validateFailDetails({ failReason: "invalid_lead", note: "" })).toBeNull();
    expect(validateFailDetails({ failReason: "health_concern", note: "" })).toBeNull();
  });

  it("renames the negative outcome to Failed", () => {
    expect(getCallOutcomeLabel("fail")).toBe("Failed");
  });
});
