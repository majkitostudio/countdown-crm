import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("delivery address inputs", () => {
  it("uses the same accessible address fields for manual and post-call order forms", () => {
    const orderForm = source("src/components/orders/OrderCreateForm.tsx");
    const productPanel = source("src/components/workspace/ProductOrderPanel.tsx");

    expect(orderForm).toContain("DeliveryAddressFields");
    expect(productPanel).toContain("DeliveryAddressFields");
  });
});
