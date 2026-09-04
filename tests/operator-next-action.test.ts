import { describe, expect, it } from "vitest";
import { getOperatorNextAction, type OperatorCallbackSignal } from "@/components/workspace/operatorNextAction";

const now = new Date("2026-09-04T10:00:00.000Z");

const callback: OperatorCallbackSignal = {
  id: "callback-1",
  leadName: "Jana Nováková",
  scheduledAt: "2026-09-04T09:30:00.000Z",
};

describe("operator next action", () => {
  it("prioritizes recovery before every other operator action", () => {
    const result = getOperatorNextAction({
      state: "recovery_required",
      leadName: "Jana Nováková",
      callbacks: [callback],
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

  it("surfaces the oldest due callback when waiting for assignment", () => {
    const result = getOperatorNextAction({
      state: "waiting_assignment",
      callbacks: [
        { ...callback, id: "callback-later", scheduledAt: "2026-09-04T11:00:00.000Z" },
        callback,
      ],
      now,
    });

    expect(result.kind).toBe("claim_callback");
    expect(result.callback?.id).toBe("callback-1");
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
