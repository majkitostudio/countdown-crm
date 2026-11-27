// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/leadNotes", () => ({
  createLeadNoteAction: vi.fn(),
}));

import { LeadNotesCard } from "@/components/workspace/LeadNotesCard";

const leadId = "lead-migration-test";
const legacyKey = `countdown-crm:lead-note-draft:${leadId}`;
const currentKey = `velocity-crm:lead-note-draft:${leadId}`;

let container: HTMLDivElement | null = null;
let root: Root | null = null;
let storage: Storage;
let originalLocalStorage: PropertyDescriptor | undefined;

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  originalLocalStorage = Object.getOwnPropertyDescriptor(window, "localStorage");
  storage = createMemoryStorage();
  Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
  const host = document.createElement("div");
  container = host;
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  if (originalLocalStorage) Object.defineProperty(window, "localStorage", originalLocalStorage);
  else Reflect.deleteProperty(window, "localStorage");
  root = null;
  container = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function renderCard() {
  await act(async () => {
    root?.render(<LeadNotesCard leadId={leadId} notes={[]} onNotesChange={vi.fn()} />);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

function draftInput(): HTMLTextAreaElement {
  const input = container?.querySelector<HTMLTextAreaElement>("#lead-note-input");
  if (!input) throw new Error("Expected the lead-note draft field");
  return input;
}

describe("LeadNotesCard draft-key migration", () => {
  it("moves a legacy draft to the new key and removes the old key after saving it", async () => {
    storage.setItem(legacyKey, "Poznámka rozepsaná před přejmenováním.");

    await renderCard();

    expect(draftInput().value).toBe("Poznámka rozepsaná před přejmenováním.");
    expect(storage.getItem(currentKey)).toBe("Poznámka rozepsaná před přejmenováním.");
    expect(storage.getItem(legacyKey)).toBeNull();
  });

  it("keeps an existing new-key draft instead of overwriting it with the legacy draft", async () => {
    storage.setItem(legacyKey, "Starší poznámka.");
    storage.setItem(currentKey, "Novější poznámka.");

    await renderCard();

    expect(draftInput().value).toBe("Novější poznámka.");
    expect(storage.getItem(currentKey)).toBe("Novější poznámka.");
    expect(storage.getItem(legacyKey)).toBe("Starší poznámka.");
  });

  it("keeps the legacy draft readable when writing the new key fails", async () => {
    const legacyDraft = "Poznámka, kterou nesmíme ztratit.";
    storage.setItem(legacyKey, legacyDraft);
    const originalSetItem = storage.setItem;
    const removeItem = vi.spyOn(storage, "removeItem");
    vi.spyOn(storage, "setItem").mockImplementation((key, value) => {
      if (key === currentKey) throw new Error("Storage write blocked");
      return originalSetItem.call(storage, key, value);
    });

    await renderCard();

    expect(draftInput().value).toBe(legacyDraft);
    expect(storage.getItem(legacyKey)).toBe(legacyDraft);
    expect(storage.getItem(currentKey)).toBeNull();
    expect(removeItem).not.toHaveBeenCalledWith(legacyKey);
  });
});
