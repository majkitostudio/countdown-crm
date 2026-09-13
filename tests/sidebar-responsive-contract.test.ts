import { describe, expect, it } from "vitest";
import { getSidebarClassName } from "@/components/layout/sidebarLayout";

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
});
