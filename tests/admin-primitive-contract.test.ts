import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ADMIN_COMPONENTS = [
  "src/components/exceptions/ExceptionQueue.tsx",
];

describe("admin primitive contract", () => {
  it("uses shared console primitives for the remaining management controls", () => {
    for (const path of ADMIN_COMPONENTS) {
      const source = readFileSync(resolve(process.cwd(), path), "utf8");
      expect(source).toMatch(/@\/components\/ui\/(Surface|Button|Status|MetricCard)/);
    }
  });

  it("uses the shared dialog and field primitives for product administration", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/products/ProductModal.tsx"), "utf8");
    expect(source).toContain('import { Dialog } from "@/components/ui/Dialog"');
    expect(source).toContain('import { FieldLabel, SelectField, TextAreaField, TextField } from "@/components/ui/Field"');
    expect(source).toContain('<Dialog isOpen={isOpen} onClose={onClose} aria-labelledby="product-dialog-title" size="lg">');
  });
});
