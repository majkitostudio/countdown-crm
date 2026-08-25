import { describe, expect, it } from "vitest";
import {
  getCallOutcomeButtonClassName,
  selectCallOutcome,
} from "@/components/workspace/OperatorCallControls";

describe("post-call outcome selection", () => {
  it("keeps selection local and allows exactly one selected value", () => {
    expect(selectCallOutcome(null, "call_later", false)).toBe("call_later");
    expect(selectCallOutcome("call_later", "fail", false)).toBe("fail");
  });

  it("does not change selection while completion is pending", () => {
    expect(selectCallOutcome("schedule", "order", true)).toBe("schedule");
  });

  it("uses a selected style that is separate from focus styling", () => {
    const selected = getCallOutcomeButtonClassName(true);
    const idle = getCallOutcomeButtonClassName(false);

    expect(selected).toContain("shadow-[0_0_0_2px_rgba(125,211,252,0.3)]");
    expect(selected).not.toContain("focus-visible:ring-2");
    expect(idle).not.toContain("shadow-[0_0_0_2px_rgba(125,211,252,0.3)]");
  });
});
