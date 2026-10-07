import { describe, expect, it } from "vitest";
import {
  getFailReasonCooldownDays,
  getFailReasonCzechLabel,
  isFailReasonRecyclable,
} from "@/lib/postCall";

describe("P4 fail recycling taxonomy and cooldown", () => {
  it("classifies approved recyclable fail reasons into P4 queue", () => {
    expect(isFailReasonRecyclable("needs_time")).toBe(true);
    expect(isFailReasonRecyclable("price")).toBe(true);
    expect(isFailReasonRecyclable("distrust")).toBe(true);
    expect(isFailReasonRecyclable("alternative_solution")).toBe(true);
    expect(isFailReasonRecyclable("other")).toBe(true);
  });

  it("strictly excludes health concerns and cold rejections from P4 retargeting", () => {
    expect(isFailReasonRecyclable("health_concern")).toBe(false);
    expect(isFailReasonRecyclable("no_interest")).toBe(false);
    expect(isFailReasonRecyclable("unknown")).toBe(false);
    expect(isFailReasonRecyclable(null)).toBe(false);
  });

  it("calculates cooling-off intervals per fail reason", () => {
    expect(getFailReasonCooldownDays("needs_time")).toBe(3);
    expect(getFailReasonCooldownDays("price")).toBe(14);
    expect(getFailReasonCooldownDays("other")).toBe(14);
    expect(getFailReasonCooldownDays("distrust")).toBe(21);
    expect(getFailReasonCooldownDays("alternative_solution")).toBe(30);
  });

  it("provides operator-friendly Czech labels for call context", () => {
    expect(getFailReasonCzechLabel("needs_time")).toBe("Rozmyšlená");
    expect(getFailReasonCzechLabel("price")).toBe("Cena");
    expect(getFailReasonCzechLabel("distrust")).toBe("Nedůvěra");
    expect(getFailReasonCzechLabel("alternative_solution")).toBe("Konkurenční řešení");
    expect(getFailReasonCzechLabel("health_concern")).toBe("Zdravotní důvody");
  });
});
