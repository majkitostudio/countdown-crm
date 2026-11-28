// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  heartbeatLeadAssignmentAction: vi.fn().mockResolvedValue({ queue_item_id: "queue-1", lease_expires_at: null }),
  session: {
    id: "",
    leadId: "",
    leadName: "",
    phone: "",
    state: "idle",
    startTime: null,
    durationSeconds: 0,
    isMuted: false,
    isOnHold: false,
    errorMessage: null,
    scriptSnapshot: null,
  },
  subscribeState: vi.fn(() => () => undefined),
}));

vi.mock("@/app/actions/leadQueue", () => ({
  abortLeadCallStartAction: vi.fn(),
  endLeadCallAction: vi.fn(),
  heartbeatLeadAssignmentAction: mocks.heartbeatLeadAssignmentAction,
}));

vi.mock("@/lib/telephony/softphone", () => ({
  softphoneController: {
    getSession: () => mocks.session,
    getRemoteAudioVolume: () => 100,
    subscribeState: mocks.subscribeState,
    setRemoteAudioVolume: (value: number) => value,
    supportsRemoteAudioVolume: () => false,
    cancelDial: vi.fn(),
    hangup: vi.fn(),
    toggleMute: vi.fn(),
    toggleHold: vi.fn(),
  },
}));

import { CallSessionProvider, useCallSession } from "@/components/layout/CallSessionProvider";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

function AssignmentProbe() {
  const { setServerContext } = useCallSession();
  return createElement("button", {
    type: "button",
    onClick: () => setServerContext({ queueItemId: "queue-1", assignmentState: "assigned", recoveryRequired: false }),
  }, "set assignment");
}

describe("CallSessionProvider assignment heartbeat", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.heartbeatLeadAssignmentAction.mockClear();
    mocks.heartbeatLeadAssignmentAction.mockResolvedValue({ queue_item_id: "queue-1", lease_expires_at: null });
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  it("refreshes an assigned lease while the operator prepares the call", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(createElement(CallSessionProvider, null, createElement(AssignmentProbe)));
    });
    act(() => container.querySelector("button")?.click());
    await act(async () => Promise.resolve());

    expect(mocks.heartbeatLeadAssignmentAction).toHaveBeenCalledTimes(1);
    expect(mocks.heartbeatLeadAssignmentAction).toHaveBeenCalledWith("queue-1");

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    expect(mocks.heartbeatLeadAssignmentAction).toHaveBeenCalledTimes(2);
  });
});
