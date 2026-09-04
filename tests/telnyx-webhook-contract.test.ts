import { describe, expect, it } from "vitest";

import {
  isDuplicateProviderEvent,
  parseTelnyxVoiceEvent,
  statusForTelnyxEvent,
} from "@/lib/telephony/telnyxWebhook";

describe("Telnyx webhook contract", () => {
  it("uses the documented Voice API hold event names", () => {
    expect(statusForTelnyxEvent("call.hold")).toBe("held");
    expect(statusForTelnyxEvent("call.unhold")).toBe("connected");
    expect(statusForTelnyxEvent("call.held")).toBeNull();
  });

  it("treats only the Postgres unique violation as a duplicate event", () => {
    expect(isDuplicateProviderEvent({ code: "23505" })).toBe(true);
    expect(isDuplicateProviderEvent({ code: "42501", message: "duplicate key" })).toBe(false);
    expect(isDuplicateProviderEvent(null)).toBe(false);
  });

  it("parses the minimum event envelope and rejects malformed input", () => {
    expect(parseTelnyxVoiceEvent(JSON.stringify({
      data: {
        id: "event-1",
        event_type: "call.answered",
        occurred_at: "2026-09-04T00:00:00.000Z",
        payload: { call_control_id: "control-1" },
      },
    }))).toEqual({
      eventId: "event-1",
      eventType: "call.answered",
      occurredAt: "2026-09-04T00:00:00.000Z",
      payload: { call_control_id: "control-1" },
    });
    expect(parseTelnyxVoiceEvent("not-json")).toBeNull();
    expect(parseTelnyxVoiceEvent(JSON.stringify({ data: { id: "event-1" } }))).toBeNull();
  });
});
