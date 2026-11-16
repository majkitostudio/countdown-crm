// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ pathname: "/login" }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("@/components/layout/Sidebar", () => ({ Sidebar: () => <nav>Navigation</nav> }));
vi.mock("@/components/layout/AppHeader", () => ({ AppHeader: () => <header>Header</header> }));
vi.mock("@/components/layout/CommandPalette", () => ({ CommandPalette: () => null }));
vi.mock("@/components/layout/OperatorIdentityProvider", () => ({
  OperatorIdentityProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/layout/CallSessionProvider", () => ({
  CallSessionProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/workspace/FloatingCallController", () => ({
  FloatingCallController: () => null,
}));

import { AppShell } from "@/components/layout/AppShell";

describe("application shell", () => {
  it.each(["/login", "/auth/forgot-password", "/auth/update-password"])(
    "shows %s without workspace navigation",
    async (pathname) => {
      mocks.pathname = pathname;
      const container = document.createElement("div");
      const root = createRoot(container);
      (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
        .IS_REACT_ACT_ENVIRONMENT = true;
      await act(async () => root.render(createElement(AppShell, null, "Obsah stránky")));
      expect(container.textContent).toBe("Obsah stránky");
      expect(container.querySelector("nav, header, footer")).toBeNull();
      await act(async () => root.unmount());
    },
  );

  it("keeps workspace navigation on regular pages", async () => {
    mocks.pathname = "/orders";
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(createElement(AppShell, null, "Objednávky")));
    expect(container.querySelector("nav")).not.toBeNull();
    expect(container.querySelector("header")).not.toBeNull();
    expect(container.querySelector("footer")).not.toBeNull();
    await act(async () => root.unmount());
  });
});
