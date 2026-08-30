import { afterEach, describe, expect, it, vi } from "vitest";

import { audioEngine } from "@/lib/telephony/audioEngine";
import { SOFTPHONE_AUDIO_INIT_TIMEOUT_MS, WebRtcSoftphoneController } from "@/lib/telephony/softphone";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("WebRtcSoftphoneController lifecycle", () => {
  it("returns to idle when audio initialization fails and never connects later", async () => {
    vi.useFakeTimers();
    vi.spyOn(audioEngine, "initialize").mockResolvedValue(false);
    const controller = new WebRtcSoftphoneController();

    await expect(controller.dial("lead-1", "+420700000001", "Test Lead")).resolves.toBe(false);
    expect(controller.getSession().state).toBe("idle");

    await vi.advanceTimersByTimeAsync(4_000);

    expect(controller.getSession().state).toBe("idle");
  });

  it("returns to idle when audio initialization never settles", async () => {
    vi.useFakeTimers();
    vi.spyOn(audioEngine, "initialize").mockImplementation(() => new Promise<boolean>(() => {}));
    const controller = new WebRtcSoftphoneController();

    const dialPromise = controller.dial("lead-1", "+420700000001", "Test Lead");
    await vi.advanceTimersByTimeAsync(SOFTPHONE_AUDIO_INIT_TIMEOUT_MS);

    await expect(dialPromise).resolves.toBe(false);
    expect(controller.getSession().state).toBe("idle");
  });

  it("cancels dialing without allowing delayed timers to connect", async () => {
    vi.useFakeTimers();
    vi.spyOn(audioEngine, "initialize").mockResolvedValue(true);
    const controller = new WebRtcSoftphoneController();

    await expect(controller.dial("lead-1", "+420700000001", "Test Lead")).resolves.toBe(true);
    expect(controller.getSession().state).toBe("dialing");

    expect(controller.cancelDial()).toBe(true);
    expect(controller.getSession().state).toBe("idle");

    await vi.advanceTimersByTimeAsync(4_000);

    expect(controller.getSession().state).toBe("idle");
  });

  it("does not let an old ended-session timer reset a new call", async () => {
    vi.useFakeTimers();
    vi.spyOn(audioEngine, "initialize").mockResolvedValue(true);
    const controller = new WebRtcSoftphoneController();

    await controller.dial("lead-1", "+420700000001", "First Lead");
    await vi.advanceTimersByTimeAsync(3_200);
    expect(controller.getSession().state).toBe("connected");

    controller.hangup();
    await controller.dial("lead-2", "+420700000002", "Second Lead");
    await vi.advanceTimersByTimeAsync(3_200);

    expect(controller.getSession()).toMatchObject({
      leadId: "lead-2",
      leadName: "Second Lead",
      state: "connected",
    });
  });
});
