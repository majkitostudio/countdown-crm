import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("server-only", () => ({}));

import { sounds } from "@/lib/audio";
import { OperatorCommissionBadge } from "@/components/layout/OperatorCommissionBadge";

describe("Operator Commission Badge & Wall Street Sound Gamification", () => {
  it("provides playWallStreetChime method in sounds module", () => {
    expect(typeof sounds.playWallStreetChime).toBe("function");
    // Executing in test environment without WebAudio should not throw
    expect(() => sounds.playWallStreetChime()).not.toThrow();
  });

  it("playSuccessSound forwards to playWallStreetChime", () => {
    const chimeSpy = vi.spyOn(sounds, "playWallStreetChime");
    sounds.playSuccessSound();
    expect(chimeSpy).toHaveBeenCalled();
    chimeSpy.mockRestore();
  });

  it("renders OperatorCommissionBadge with link to wallet and semantic styling", () => {
    const markup = renderToStaticMarkup(<OperatorCommissionBadge />);
    expect(markup).toContain('href="/wallet"');
    expect(markup).toContain("Provize");
  });
});
