import { describe, expect, it } from "vitest";
import { getOperatorNextAction, type OperatorScheduledCallSignal } from "@/components/workspace/operatorNextAction";

const now = new Date("2026-09-04T10:00:00.000Z");

const scheduledCall: OperatorScheduledCallSignal = {
  id: "scheduled-call-1",
  leadName: "Jana Nováková",
  scheduledAt: "2026-09-04T09:30:00.000Z",
};

describe("operator next action", () => {
  it("prioritizes recovery before every other operator action", () => {
    const result = getOperatorNextAction({
      state: "recovery_required",
      leadName: "Jana Nováková",
      scheduledCalls: [scheduledCall],
      now,
    });

    expect(result.kind).toBe("recover_call");
    expect(result.title).toBe("Recover interrupted call");
  });

  it("guides an operator with an assigned lead toward starting the call", () => {
    const result = getOperatorNextAction({
      state: "ready",
      leadName: "Jana Nováková",
      now,
    });

    expect(result.kind).toBe("start_call");
    expect(result.description).toContain("Jana Nováková");
  });

  it("surfaces the oldest due scheduled call when waiting for assignment", () => {
    const result = getOperatorNextAction({
      state: "waiting_assignment",
      scheduledCalls: [
        { ...scheduledCall, id: "scheduled-call-later", scheduledAt: "2026-09-04T11:00:00.000Z" },
        scheduledCall,
      ],
      now,
    });

    expect(result.kind).toBe("claim_scheduled_call");
    expect(result.scheduledCall?.id).toBe("scheduled-call-1");
    expect(result.urgency).toBe("critical");
  });

  it("explains an empty queue without pretending that a contact exists", () => {
    const result = getOperatorNextAction({
      state: "waiting_assignment",
      now,
    });

    expect(result.kind).toBe("wait_for_assignment");
    expect(result.title).toBe("Waiting for assignment");
    expect(result.description).toContain("No callable contact");
  });
});
