import { describe, expect, it } from "vitest";
import { countOrdersByStage, getOrderStage, ORDER_STAGE_LABELS, ORDER_STAGES } from "@/lib/orderStage";

describe("order stage mapping", () => {
  it("folds pre-shipment statuses into processing", () => {
    expect(getOrderStage({ status: "pending" })).toBe("processing");
    expect(getOrderStage({ status: "completed" })).toBe("processing");
    expect(getOrderStage({ status: "in_progress" })).toBe("processing");
  });

  it("splits sent orders by pickup location", () => {
    expect(getOrderStage({ status: "sent" })).toBe("sent");
    expect(getOrderStage({ status: "sent", package_location: null })).toBe("sent");
    expect(getOrderStage({ status: "sent", package_location: "Z-BOX Ostrava" })).toBe(
      "awaiting_pickup",
    );
  });

  it("maps terminal statuses", () => {
    expect(getOrderStage({ status: "delivered" })).toBe("delivered");
    expect(getOrderStage({ status: "returned" })).toBe("returned");
    expect(getOrderStage({ status: "cancelled" })).toBe("cancelled");
  });

  it("keeps a stable stage order with a label for every stage", () => {
    expect(ORDER_STAGES).toHaveLength(6);
    for (const stage of ORDER_STAGES) {
      expect(ORDER_STAGE_LABELS[stage]).toBeTruthy();
    }
  });

  it("counts orders per stage", () => {
    const counts = countOrdersByStage([
      { status: "completed" },
      { status: "in_progress" },
      { status: "sent" },
      { status: "sent", package_location: "Z-BOX" },
      { status: "delivered" },
      { status: "returned" },
      { status: "cancelled" },
    ]);

    expect(counts).toEqual({
      processing: 2,
      sent: 1,
      awaiting_pickup: 1,
      delivered: 1,
      returned: 1,
      cancelled: 1,
    });
  });
});
