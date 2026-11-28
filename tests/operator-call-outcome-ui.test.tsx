// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CallOutcomePanel,
  type CallOutcomePanelProps,
} from "@/components/workspace/OperatorCallControls";

describe("interrupted call outcome panel", () => {
  let container: HTMLDivElement;
  let root: Root;
  let onCallOutcome: CallOutcomePanelProps["onCallOutcome"];

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    onCallOutcome = vi.fn<CallOutcomePanelProps["onCallOutcome"]>();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("offers order creation after an interrupted call and sends the order outcome", () => {
    act(() => {
      root.render(<CallOutcomePanel
        isAwaitingOutcome
        recoveryRequired
        callEndedInSession={false}
        onCallOutcome={onCallOutcome}
        onScheduleCall={vi.fn()}
      />);
    });

    const createOrderButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Vytvořit objednávku"));
    expect(createOrderButton).toBeDefined();

    act(() => createOrderButton!.click());

    expect(onCallOutcome).toHaveBeenCalledExactlyOnceWith("order");
  });
});
