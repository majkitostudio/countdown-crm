// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import InvitePage from "@/app/auth/invite/page";

describe("invite link", () => {
  it.each([
    ["0123456789abcdef".repeat(3) + "01234567", true],
    ["abcdef".repeat(10), true],
    ["", false],
    ["xyz", false],
    ["abc\n", false],
    ["a".repeat(257), false],
  ])("checks the token before offering confirmation", async (token, valid) => {
    window.history.replaceState(null, "", `/auth/invite#token_hash=${encodeURIComponent(token)}`);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    await act(async () => root.render(createElement(InvitePage)));
    expect(Boolean(container.querySelector("button"))).toBe(valid);
    if (!valid) expect(container.textContent).toContain("Odkaz je neplatný");
    expect(window.location.hash).toBe("");
    await act(async () => root.unmount());
    container.remove();
  });
});
