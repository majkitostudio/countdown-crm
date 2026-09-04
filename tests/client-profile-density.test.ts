import { describe, expect, it } from "vitest";
import {
  getNextClientProfileDensity,
  parseClientProfileDensity,
} from "@/components/workspace/clientProfileDensity";

describe("client profile density", () => {
  it("toggles between full and compact profile views", () => {
    expect(getNextClientProfileDensity("full")).toBe("compact");
    expect(getNextClientProfileDensity("compact")).toBe("full");
  });

  it("accepts only known persisted preferences", () => {
    expect(parseClientProfileDensity("compact")).toBe("compact");
    expect(parseClientProfileDensity("full")).toBe("full");
    expect(parseClientProfileDensity("unexpected")).toBeNull();
    expect(parseClientProfileDensity(null)).toBeNull();
  });
});
