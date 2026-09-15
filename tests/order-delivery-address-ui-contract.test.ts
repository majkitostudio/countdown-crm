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

  it("shows the saved address on the order detail", () => {
    const detailPage = source("src/app/orders/[orderId]/page.tsx");

    expect(detailPage).toContain("parseDeliveryAddressSnapshot");
    expect(detailPage).toContain('>Delivery address<');
    expect(detailPage).toContain("deliveryAddress.recipient_name");
    expect(detailPage).toContain("deliveryAddress.postal_code");
  });
});
