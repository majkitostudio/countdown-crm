import { describe, expect, it } from "vitest";
import { countOrdersByRisk, daysOnPickup, getOrderRisk } from "@/lib/orderRisk";

const NOW = Date.UTC(2026, 9, 14, 12, 0, 0); // 2026-10-14T12:00:00Z

function at(daysAgo: number): string {
  return new Date(NOW - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

describe("pickup risk", () => {
  it("is calm for orders that are not a sent package at a pickup point", () => {
    expect(getOrderRisk({ status: "processing" }, NOW)).toEqual({ level: "calm", daysOnPickup: null });
    expect(getOrderRisk({ status: "sent" }, NOW).level).toBe("calm");
    expect(getOrderRisk({ status: "sent", package_location: "Z-BOX" }, NOW).level).toBe("calm");
    expect(daysOnPickup({ status: "delivered", package_location: "Z-BOX", package_arrived_at: at(9) }, NOW)).toBeNull();
  });

  it("stays calm on the first day at the pickup point", () => {
    const risk = getOrderRisk(
      { status: "sent", package_location: "Z-BOX Ostrava", package_arrived_at: at(1) },
      NOW,
    );
    expect(risk).toEqual({ level: "calm", daysOnPickup: 1 });
  });

  it("raises a warning the day before the limit", () => {
    const risk = getOrderRisk(
      { status: "sent", package_location: "Z-BOX Ostrava", package_arrived_at: at(2) },
      NOW,
    );
    expect(risk).toEqual({ level: "warning", daysOnPickup: 2 });
  });

  it("raises an alarm at 3+ days, matching the P4 rule", () => {
    expect(
      getOrderRisk({ status: "sent", package_location: "Z-BOX", package_arrived_at: at(3) }, NOW),
    ).toEqual({ level: "alarm", daysOnPickup: 3 });
    expect(
      getOrderRisk({ status: "sent", package_location: "Z-BOX", package_arrived_at: at(6) }, NOW).level,
    ).toBe("alarm");
  });

  it("resolves the risk once the pickup call is completed", () => {
    const risk = getOrderRisk(
      {
        status: "sent",
        package_location: "Z-BOX",
        package_arrived_at: at(5),
        pickup_call_completed_at: at(4),
      },
      NOW,
    );
    expect(risk).toEqual({ level: "calm", daysOnPickup: 5 });
  });

  it("counts alarm and warning packages", () => {
    const counts = countOrdersByRisk(
      [
        { status: "sent", package_location: "Z-BOX", package_arrived_at: at(4) },
        { status: "sent", package_location: "Z-BOX", package_arrived_at: at(3) },
        { status: "sent", package_location: "Z-BOX", package_arrived_at: at(2) },
        { status: "sent", package_location: "Z-BOX", package_arrived_at: at(1) },
        { status: "delivered" },
      ],
      NOW,
    );

    expect(counts).toEqual({ alarm: 2, warning: 1 });
  });
});
