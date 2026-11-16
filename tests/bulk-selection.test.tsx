// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BulkActionPanel } from "@/components/ui/BulkActionPanel";
import { useBulkSelection } from "@/hooks/useBulkSelection";

function Fixture() {
  const selection = useBulkSelection();
  const visibleState = selection.getVisibleState(["a", "b", "b"]);
  return (
    <>
      <output data-testid="selected">{Array.from(selection.selectedIds).sort().join(",")}</output>
      <output data-testid="visible">{String(visibleState.allSelected)} / {String(visibleState.partiallySelected)}</output>
      <button onClick={() => selection.toggle("a")}>Přepnout A</button>
      <button onClick={() => selection.toggle("outside")}>Přepnout jinou</button>
      <button onClick={() => selection.toggleVisible(["a", "b", "b"])}>Přepnout viditelné</button>
      <button onClick={() => selection.toggleVisible([])}>Prázdný výběr</button>
      <BulkActionPanel selectedCount={selection.selectedCount} onClear={selection.clear}>
        <button>Budoucí akce</button>
      </BulkActionPanel>
    </>
  );
}

describe("bulk selection foundation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<Fixture />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  function click(label: string) {
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === label);
    expect(button).toBeDefined();
    act(() => button!.click());
  }

  it("toggles individual and visible items without losing selections outside the view", () => {
    expect(container.querySelector('[role="status"]')?.textContent).toContain("Vybrané položky: 0");
    expect(container.querySelector<HTMLButtonElement>("button:disabled")?.textContent).toBe("Zrušit výběr");
    click("Přepnout jinou");
    click("Přepnout A");
    expect(container.querySelector('[data-testid="visible"]')?.textContent).toBe("false / true");
    click("Přepnout viditelné");
    expect(container.querySelector('[data-testid="selected"]')?.textContent).toBe("a,b,outside");
    expect(container.querySelector('[data-testid="visible"]')?.textContent).toBe("true / false");
    click("Přepnout viditelné");
    click("Prázdný výběr");
    expect(container.querySelector('[data-testid="selected"]')?.textContent).toBe("outside");
    click("Zrušit výběr");
    expect(container.querySelector('[data-testid="selected"]')?.textContent).toBe("");
  });
});
