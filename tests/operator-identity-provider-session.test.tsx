// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  getCurrentWorkspaceContextAction: vi.fn(),
  maybeSingle: vi.fn(),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mocks.getUser,
      onAuthStateChange: mocks.onAuthStateChange,
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mocks.maybeSingle }),
      }),
    }),
  }),
}));
vi.mock("@/app/actions/workspace", () => ({
  getCurrentWorkspaceContextAction: mocks.getCurrentWorkspaceContextAction,
}));

import {
  OperatorIdentityProvider,
  useOperatorIdentity,
} from "@/components/layout/OperatorIdentityProvider";

interface Captured {
  identity: unknown;
  isLoading: boolean;
  error: string | null;
}

let captured: Captured | null = null;

function Probe() {
  const value = useOperatorIdentity();
  captured = {
    identity: value.identity,
    isLoading: value.isLoading,
    error: value.error,
  };
  return null;
}

let mountedRoot: Root | null = null;

async function mount() {
  await act(async () => {
    const container = document.createElement("div");
    document.body.append(container);
    mountedRoot = createRoot(container);
    mountedRoot.render(createElement(OperatorIdentityProvider, null, createElement(Probe)));
    // Flush the identity-loading effect and its follow-up promise.
    await Promise.resolve();
    await Promise.resolve();
  });
}

afterEach(() => {
  act(() => {
    mountedRoot?.unmount();
  });
  mountedRoot = null;
  captured = null;
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe("OperatorIdentityProvider session handling", () => {
  it("does not call the workspace action when no user is signed in", async () => {
    // Simulates the moment right after sign-out: the auth listener fires while
    // the session is already gone. Calling the workspace action here would throw
    // server-side and surface as a 500 on the login page.
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    await mount();

    expect(mocks.getCurrentWorkspaceContextAction).not.toHaveBeenCalled();
    expect(captured).toMatchObject({ identity: null, isLoading: false, error: null });
  });

  it("still resolves the workspace role for a signed-in user", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "user@example.test" } } });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.getCurrentWorkspaceContextAction.mockResolvedValue({
      userId: "user-1",
      workspaceId: "workspace-1",
      role: "team_leader",
    });

    await mount();

    expect(mocks.getCurrentWorkspaceContextAction).toHaveBeenCalledTimes(1);
    expect(captured).toMatchObject({
      isLoading: false,
      error: null,
      identity: { id: "user-1", role: "team_leader" },
    });
  });

  it("reports an unavailable workspace without throwing when the action fails", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "user@example.test" } } });
    mocks.getCurrentWorkspaceContextAction.mockRejectedValue(new Error("unauthorized"));

    await mount();

    expect(captured).toMatchObject({
      isLoading: false,
      identity: null,
      error: "Authenticated workspace membership is unavailable",
    });
  });
});
