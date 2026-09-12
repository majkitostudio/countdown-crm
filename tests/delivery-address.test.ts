import { describe, expect, it } from "vitest";
import {
  findLatestVerifiedDeliveryAddress,
  parseDeliveryAddressSnapshot,
} from "@/lib/deliveryAddress";

const validAddress = {
  recipient_name: "Jane Doe",
  line1: "Main 1",
  city: "Prague",
  postal_code: "110 00",
  country: "CZ",
};

describe("delivery address snapshots", () => {
  it("parses a complete immutable address snapshot", () => {
    expect(parseDeliveryAddressSnapshot({
      ...validAddress,
    })).toMatchObject({ city: "Prague" });
  });

  it("rejects incomplete and non-object snapshots", () => {
    expect(parseDeliveryAddressSnapshot({ line1: "Main 1" })).toBeNull();
    expect(parseDeliveryAddressSnapshot("Main 1")).toBeNull();
  });

  it("uses only the newest delivered order with a valid snapshot", () => {
    expect(findLatestVerifiedDeliveryAddress([
      {
        id: "cancelled",
        status: "cancelled",
        delivered_at: "2026-09-10T10:00:00Z",
        created_at: "2026-09-10T10:00:00Z",
        delivery_address_snapshot: validAddress,
      },
      {
        id: "delivered",
        status: "delivered",
        delivered_at: "2026-09-09T10:00:00Z",
        created_at: "2026-09-09T10:00:00Z",
        delivery_address_snapshot: validAddress,
      },
      {
        id: "invalid-delivery",
        status: "delivered",
        delivered_at: "2026-09-11T10:00:00Z",
        created_at: "2026-09-11T10:00:00Z",
        delivery_address_snapshot: { line1: "Missing required fields" },
      },
    ])).toMatchObject({ orderId: "delivered", address: validAddress });
  });
});
