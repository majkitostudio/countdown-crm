import { afterEach, describe, expect, it, vi } from "vitest";

import { WebRtcSoftphoneController } from "@/lib/telephony/softphone";

const telnyxHarness = vi.hoisted(() => {
  type Listener = (event: unknown) => void;

  class FakeCall {
    state = "new";
    telnyxIDs = {
      telnyxCallControlId: "control-1",
      telnyxSessionId: "provider-session-1",
      telnyxLegId: "leg-1",
    };

    answer = vi.fn(async () => undefined);
    hangup = vi.fn(async () => undefined);
    toggleAudioMute = vi.fn();
    toggleHold = vi.fn(async () => undefined);
    dtmf = vi.fn();
  }

  class FakeClient {
    readonly listeners = new Map<string, Listener[]>();
    readonly connect = vi.fn(async () => undefined);
    readonly newCall = vi.fn(() => new FakeCall());

    on = vi.fn((eventName: string, listener: Listener) => {
      this.listeners.set(eventName, [...(this.listeners.get(eventName) || []), listener]);
      return this;
    });

    emit(eventName: string, event: unknown = {}) {
      this.listeners.get(eventName)?.forEach((listener) => listener(event));
    }

    listenerCount(eventName: string) {
      return this.listeners.get(eventName)?.length || 0;
    }
  }

  const clients: FakeClient[] = [];
  const createTelnyxClient = vi.fn(async () => {
    const client = new FakeClient();
    clients.push(client);
    return client;
  });

  return { clients, createTelnyxClient };
});

vi.mock("@/lib/telephony/telnyxClientAdapter", () => ({
  createTelnyxClient: telnyxHarness.createTelnyxClient,
}));

function mockTelephonyFetch() {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, string> : {};
    const responseBody = url.endsWith("/session") && init?.method === "POST"
      ? { sessionId: "session-1", toNumber: "+420777123456" }
      : url.endsWith("/token")
        ? { token: "test-token", callerNumber: "+420777000000" }
        : { ok: true, body };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  telnyxHarness.clients.length = 0;
});

describe("live Telnyx WebRTC lifecycle", () => {
  it("waits for telnyx.ready before creating the outbound call", async () => {
    vi.stubEnv("NEXT_PUBLIC_TELNYX_ENABLED", "true");
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({ setAttribute: vi.fn(), style: {} })),
      body: { appendChild: vi.fn() },
    });
    mockTelephonyFetch();
    const controller = new WebRtcSoftphoneController();

    const dialPromise = controller.dial("lead-1", "+420777123456", "Test Lead");
    await vi.waitFor(() => expect(telnyxHarness.clients).toHaveLength(1));
    const client = telnyxHarness.clients[0];

    expect(client.connect).toHaveBeenCalledOnce();
    expect(client.newCall).not.toHaveBeenCalled();

    client.emit("telnyx.ready");

    await expect(dialPromise).resolves.toBe(true);
    expect(client.newCall).toHaveBeenCalledOnce();
  });

  it("binds client listeners only once when the client is reused", async () => {
    vi.stubEnv("NEXT_PUBLIC_TELNYX_ENABLED", "true");
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({ setAttribute: vi.fn(), style: {} })),
      body: { appendChild: vi.fn() },
    });
    mockTelephonyFetch();
    const controller = new WebRtcSoftphoneController();

    const firstDial = controller.dial("lead-1", "+420777123456", "First Lead");
    await vi.waitFor(() => expect(telnyxHarness.clients).toHaveLength(1));
    const client = telnyxHarness.clients[0];
    client.emit("telnyx.ready");
    await expect(firstDial).resolves.toBe(true);
    controller.hangup();

    const secondDial = controller.dial("lead-2", "+420777654321", "Second Lead");
    await expect(secondDial).resolves.toBe(true);

    expect(telnyxHarness.clients).toHaveLength(1);
    expect(client.listenerCount("telnyx.notification")).toBe(1);
    expect(client.listenerCount("telnyx.error")).toBe(1);
  });

  it("does not turn a provider error into a connected call", async () => {
    vi.stubEnv("NEXT_PUBLIC_TELNYX_ENABLED", "true");
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({ setAttribute: vi.fn(), style: {} })),
      body: { appendChild: vi.fn() },
    });
    mockTelephonyFetch();
    const controller = new WebRtcSoftphoneController();

    const dialPromise = controller.dial("lead-1", "+420777123456", "Test Lead");
    await vi.waitFor(() => expect(telnyxHarness.clients).toHaveLength(1));
    const client = telnyxHarness.clients[0];
    client.emit("telnyx.ready");
    await expect(dialPromise).resolves.toBe(true);

    client.emit("telnyx.error", { error: { message: "media permission denied" } });

    expect(controller.getSession().state).toBe("failed");
  });
});
