import { describe, expect, it } from "vitest";
import { getOperatorKeyboardAction } from "@/components/workspace/operatorKeyboardShortcuts";

function keyEvent(key: string, overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key,
    altKey: false,
    ctrlKey: false,
    defaultPrevented: false,
    metaKey: false,
    repeat: false,
    shiftKey: false,
    target: null,
    ...overrides,
  } as KeyboardEvent;
}

describe("operator keyboard shortcuts", () => {
  it("maps the safe console actions to discoverable keys", () => {
    expect(getOperatorKeyboardAction(keyEvent("c"))).toBe("toggle_call");
    expect(getOperatorKeyboardAction(keyEvent("M"))).toBe("toggle_mute");
    expect(getOperatorKeyboardAction(keyEvent("1"))).toBe("call_later");
    expect(getOperatorKeyboardAction(keyEvent("2"))).toBe("schedule_callback");
    expect(getOperatorKeyboardAction(keyEvent("3"))).toBe("not_interested");
    expect(getOperatorKeyboardAction(keyEvent("4"))).toBe("create_order");
    expect(getOperatorKeyboardAction(keyEvent("n"))).toBe("focus_note");
  });

  it("does not intercept typing, modified keys, or key repeats", () => {
    expect(getOperatorKeyboardAction(keyEvent("c", { target: { tagName: "TEXTAREA" } as unknown as EventTarget }))).toBeNull();
    expect(getOperatorKeyboardAction(keyEvent("m", { target: { tagName: "INPUT" } as unknown as EventTarget }))).toBeNull();
    expect(getOperatorKeyboardAction(keyEvent("1", { ctrlKey: true }))).toBeNull();
    expect(getOperatorKeyboardAction(keyEvent("n", { repeat: true }))).toBeNull();
    expect(getOperatorKeyboardAction(keyEvent("4", { defaultPrevented: true }))).toBeNull();
  });
});
