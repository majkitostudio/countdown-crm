import { describe, expect, it } from "vitest";
import { parseDeliveryAddressSnapshot } from "@/lib/deliveryAddress";

describe("delivery address snapshots", () => {
  it("parses a complete immutable address snapshot", () => {
    expect(parseDeliveryAddressSnapshot({
      recipient_name: "Jane Doe",
      line1: "Main 1",
      city: "Prague",
      postal_code: "110 00",
      country: "CZ",
    })).toMatchObject({ city: "Prague" });
  });

  it("rejects incomplete and non-object snapshots", () => {
    expect(parseDeliveryAddressSnapshot({ line1: "Main 1" })).toBeNull();
    expect(parseDeliveryAddressSnapshot("Main 1")).toBeNull();
  });
});
