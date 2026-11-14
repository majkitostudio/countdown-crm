import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dialog = readFileSync(resolve(process.cwd(), "src/components/ui/Dialog.tsx"), "utf8");
const incomingCall = readFileSync(resolve(process.cwd(), "src/components/workspace/IncomingCallModal.tsx"), "utf8");

describe("Dialog accessibility contract", () => {
  it("marks the surrounding application inert while open", () => {
    expect(dialog).toContain("sibling.inert = true");
    expect(dialog).toContain("for (const { element, inert } of inertedElements) element.inert = inert");
    expect(dialog).toContain('aria-modal="true"');
  });

  it("restores focus to the trigger when the dialog closes or unmounts", () => {
    expect(dialog).toContain("previousFocusRef.current = document.activeElement");
    expect(dialog).toContain("if (previousFocus && document.contains(previousFocus)) previousFocus.focus()");
  });
});

describe("Incoming call accessibility contract", () => {
  it("announces the call as an alert dialog and moves focus into it", () => {
    expect(incomingCall).toContain('role="alertdialog"');
    expect(incomingCall).toContain('aria-labelledby="incoming-call-title"');
    expect(incomingCall).toContain('aria-describedby="incoming-call-customer"');
    expect(incomingCall).toContain("dialogRef.current?.focus()");
  });

  it("gives the decline icon button an accessible name", () => {
    expect(incomingCall).toContain('aria-label="Odmítnout příchozí hovor"');
  });
});
