import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const editorSource = readFileSync(
  resolve(process.cwd(), "src/components/orders/OrderStatusEditor.tsx"),
  "utf8",
);

describe("P4 returned orders re-ship workflow", () => {
  it("allows operators to transition returned orders back to pending for re-shipping", () => {
    expect(editorSource).toContain('returned: ["pending"]');
  });

  it("exposes a one-click re-ship action for returned orders", () => {
    expect(editorSource).toContain('Znovu odeslat balíček (P4)');
    expect(editorSource).toContain('updateOrderStatusAction');
    expect(editorSource).toContain('"pending"');
    expect(editorSource).toContain('Přebalení zásilky a opětovné odeslání');
  });
});
