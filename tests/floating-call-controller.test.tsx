// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  endCall: vi.fn(),
  context: {
    session: {
      id: "session-1",
      leadId: "lead-1",
      leadName: "Test Customer",
      phone: "",
      state: "connected",
      startTime: null,
      durationSeconds: 10,
      isMuted: false,
      isOnHold: false,
      errorMessage: null,
      scriptSnapshot: null,
    },
    serverContext: { queueItemId: "queue-1", assignmentState: "awaiting_outcome", recoveryRequired: false },
    isActionPending: false,
    error: null,
    clearError: vi.fn(),
    cancelDial: vi.fn(),
    endCall: vi.fn(),
    toggleMute: vi.fn(),
    toggleHold: vi.fn(),
    remoteVolume: 100,
    supportsRemoteVolume: false,
    setRemoteVolume: vi.fn(),
  },
}));

vi.mock("@/components/layout/CallSessionProvider", () => ({
  useCallSession: () => ({ ...mocks.context, endCall: mocks.endCall }),
}));

import { FloatingCallController } from "@/components/workspace/FloatingCallController";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe("FloatingCallController", () => {
  it("keeps live-call controls available when the server assignment awaits an outcome", () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    act(() => {
      root?.render(createElement(FloatingCallController));
    });

    const endButton = document.body.querySelector<HTMLButtonElement>('button[type="button"]');
    expect(document.body.textContent).toContain("Na hovoru");
    expect(document.body.textContent).toContain("00:10");
    expect(endButton?.textContent).toContain("Ukončit hovor");

    act(() => endButton?.click());
    expect(mocks.endCall).toHaveBeenCalledTimes(1);
  });
});
