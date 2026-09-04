import { describe, expect, it } from "vitest";

import {
  canTransitionCallStatus,
  isTerminalCallStatus,
  mapTelnyxCallState,
  mapTelnyxEventType,
} from "@/lib/telephony/telnyxLifecycle";

describe("Telnyx lifecycle contract", () => {
  it("maps documented browser states and ignores unknown states", () => {
    expect(mapTelnyxCallState("trying")).toBe("ringing");
    expect(mapTelnyxCallState("requesting")).toBe("ringing");
    expect(mapTelnyxCallState("active")).toBe("connected");
    expect(mapTelnyxCallState("held")).toBe("held");
    expect(mapTelnyxCallState("hangup")).toBe("ended");
    expect(mapTelnyxCallState("provider_success")).toBeNull();
  });

  it("uses the actual Voice API event names", () => {
    expect(mapTelnyxEventType("call.initiated")).toBe("initiated");
    expect(mapTelnyxEventType("call.answered")).toBe("connected");
    expect(mapTelnyxEventType("call.hold")).toBe("held");
    expect(mapTelnyxEventType("call.unhold")).toBe("connected");
    expect(mapTelnyxEventType("call.hangup")).toBe("ended");
  });

  it("keeps terminal states terminal and permits hold/unhold", () => {
    expect(canTransitionCallStatus("connected", "held")).toBe(true);
    expect(canTransitionCallStatus("held", "connected")).toBe(true);
    expect(canTransitionCallStatus("ended", "connected")).toBe(false);
    expect(canTransitionCallStatus("failed", "ringing")).toBe(false);
    expect(isTerminalCallStatus("ended")).toBe(true);
    expect(isTerminalCallStatus("connected")).toBe(false);
  });
});
