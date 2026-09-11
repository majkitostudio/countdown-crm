// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { PhoneCall } from "lucide-react";
import {
  PageHeader,
  getPageHeaderBadgeClassName,
  getPageHeaderSurfaceClassName,
} from "@/components/layout/PageHeader";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { Sidebar } from "@/components/layout/Sidebar";
import { CallStatusBar } from "@/components/workspace/CallStatusBar";
import { getStatusClassName } from "@/components/ui/Status";
import { getSurfaceClassName } from "@/components/ui/Surface";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getLeads: vi.fn().mockResolvedValue([]),
  getProducts: vi.fn().mockResolvedValue([]),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next/navigation", () => ({
  usePathname: () => "/workspace",
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/components/layout/OperatorIdentityProvider", () => ({
  OperatorIdentityProvider: ({ children }: { children: React.ReactNode }) => children,
  useOperatorIdentity: () => ({
    identity: {
      id: "operator-1",
      name: "Alex Operator",
      email: "alex@example.test",
      role: "operator",
    },
    isLoading: false,
  }),
}));

vi.mock("@/lib/leads", () => ({
  getLeads: mocks.getLeads,
}));

vi.mock("@/lib/products", () => ({
  getProducts: mocks.getProducts,
}));

let mountedRoot: Root | null = null;

function mount(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.append(container);
  mountedRoot = createRoot(container);
  act(() => {
    mountedRoot?.render(ui);
  });
  return container;
}

function dispatchWindowKey(key: string, options: KeyboardEventInit = {}) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key, ...options }));
  });
}

afterEach(() => {
  act(() => {
    mountedRoot?.unmount();
  });
  mountedRoot = null;
  document.body.replaceChildren();
  vi.clearAllMocks();
});

it("renders the canonical page header with the shared page surface", () => {
  const markup = renderToStaticMarkup(
    <PageHeader icon={PhoneCall} title="Orders" description="Review and manage orders." />,
  );

  expect(getPageHeaderSurfaceClassName()).toBe(getSurfaceClassName("page"));
  expect(markup).toContain(getPageHeaderSurfaceClassName());
  expect(markup).toContain("rounded-2xl");
});

it("maps unavailable and ordinary header badges to neutral", () => {
  expect(getPageHeaderBadgeClassName("neutral")).toBe(getStatusClassName("neutral"));
  expect(getPageHeaderBadgeClassName("unavailable")).toBe(getStatusClassName("neutral"));
});

it("keeps an active simulated call visually neutral while preserving the destructive end-call control", () => {
  const markup = renderToStaticMarkup(
    <CallStatusBar
      status="in_call"
      isCallActive
      isDialing={false}
      durationSeconds={12}
      isMuted={false}
      isOnHold={false}
      activeLeadName="Alex Customer"
      onToggleCall={() => undefined}
      onToggleMute={() => undefined}
      onToggleHold={() => undefined}
      onSimulateIncoming={() => undefined}
      onStatusChange={() => undefined}
      onCallOutcome={() => undefined}
      telephonyAdapter="simulation"
    />,
  );

  expect(markup).toContain("bg-zinc-500");
  expect(markup).toContain('class="text-zinc-300" aria-label="Simulated audio activity"');
  expect(markup).toContain("bg-rose-950/20");
});

it("restores focus to the command-palette opener after Escape and traps Tab within the dialog", () => {
  const trigger = document.createElement("button");
  trigger.textContent = "Open command palette";
  document.body.append(trigger);
  mount(createElement(CommandPalette));

  trigger.focus();
  dispatchWindowKey("k", { ctrlKey: true });

  const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
  const input = document.querySelector<HTMLInputElement>('input[aria-label="Search commands and available records"]');
  expect(dialog).not.toBeNull();
  expect(input).not.toBeNull();
  expect(document.activeElement).toBe(input);

  const focusable = dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])') ?? [];
  const lastFocusable = focusable[focusable.length - 1];
  lastFocusable.focus();
  dispatchWindowKey("Tab");
  expect(document.activeElement).toBe(input);

  dispatchWindowKey("Escape");
  expect(document.activeElement).toBe(trigger);
});

describe("sidebar operator-status menu", () => {
  it("exposes the status menu with button and menu semantics, then returns focus after Escape", () => {
    const container = mount(createElement(Sidebar));
    const toggle = container.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]');

    expect(toggle).not.toBeNull();
    expect(toggle?.type).toBe("button");
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");

    act(() => {
      toggle?.click();
    });

    const menu = document.querySelector<HTMLElement>('[role="menu"][aria-label="Operator status"]');
    expect(menu).not.toBeNull();
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    expect(menu?.querySelectorAll('[role="menuitem"]')).toHaveLength(3);

    dispatchWindowKey("Escape");
    expect(document.querySelector('[role="menu"][aria-label="Operator status"]')).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });
});
