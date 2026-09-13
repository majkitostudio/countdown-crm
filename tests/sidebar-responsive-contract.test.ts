import { describe, expect, it } from "vitest";
import { getSidebarAccessibilityProps, getSidebarClassName } from "@/components/layout/sidebarLayout";
import { shouldCloseMobileNavigationOnKey } from "@/components/layout/mobileNavigation";

describe("responsive sidebar contract", () => {
  it("uses an off-canvas drawer below the md breakpoint", () => {
    expect(getSidebarClassName(false, false)).toContain("max-md:fixed");
    expect(getSidebarClassName(false, false)).toContain("max-md:-translate-x-full");
    expect(getSidebarClassName(false, true)).toContain("max-md:translate-x-0");
  });

  it("keeps compact and expanded desktop widths independent from the mobile drawer", () => {
    expect(getSidebarClassName(false, false)).toContain("w-64");
    expect(getSidebarClassName(true, false)).toContain("w-18");
    expect(getSidebarClassName(true, false)).toContain("max-md:w-72");
  });

  it("removes a closed mobile drawer from the accessibility tree and tab order", () => {
    expect(getSidebarAccessibilityProps(true, false)).toEqual({
      "aria-hidden": true,
      inert: true,
    });
    expect(getSidebarAccessibilityProps(true, true)).toEqual({});
    expect(getSidebarAccessibilityProps(false, false)).toEqual({});
  });

  it("closes an open mobile drawer with Escape without affecting desktop navigation", () => {
    expect(shouldCloseMobileNavigationOnKey("Escape", true, true)).toBe(true);
    expect(shouldCloseMobileNavigationOnKey("Enter", true, true)).toBe(false);
    expect(shouldCloseMobileNavigationOnKey("Escape", false, true)).toBe(false);
    expect(shouldCloseMobileNavigationOnKey("Escape", true, false)).toBe(false);
  });
});
