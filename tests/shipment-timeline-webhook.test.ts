import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceRole: vi.fn(),
  requireWorkspaceContext: vi.fn(),
  createDataClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceRole: mocks.requireWorkspaceRole,
  requireWorkspaceContext: mocks.requireWorkspaceContext,
}));
vi.mock("@/lib/dal/db", () => ({
  createDataClient: mocks.createDataClient,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { recordOrderTrackingEventForWorkspace } from "@/lib/dal/orders";
import { normalizeCarrierStatus, POST } from "@/app/api/carriers/webhook/route";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const migration = source("supabase/migrations/20261007140100_shipment_timeline_and_courier_webhook.sql").replace(/\s+/g, " ");
const authorizationMigration = source("supabase/migrations/20261008230000_tracking_and_monthly_settlement_hardening.sql").replace(/\s+/g, " ");

describe("Milestone 1.4: Shipment Timeline & Courier Webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CARRIER_WEBHOOK_SECRET;
  });

  describe("SQL Migration & Database Schema", () => {
    it("adds package_location and tracking_events columns to orders", () => {
      expect(migration).toContain("ADD COLUMN IF NOT EXISTS package_location TEXT");
      expect(migration).toContain("ADD COLUMN IF NOT EXISTS tracking_events JSONB DEFAULT '[]'::jsonb");
    });

    it("creates public.record_order_tracking_event function", () => {
      expect(migration).toContain("CREATE OR REPLACE FUNCTION public.record_order_tracking_event");
      expect(migration).toContain("p_order_id UUID");
      expect(migration).toContain("p_status TEXT");
      expect(migration).toContain("p_title TEXT");
      expect(migration).toContain("p_location TEXT");
      expect(migration).toContain("p_description TEXT");
      expect(migration).toContain("p_occurred_at TIMESTAMPTZ");
    });

    it("requires team-scoped permissions for authenticated tracking RPC calls", () => {
      expect(authorizationMigration).toContain(
        "private.can_manage_team_resource(v_order.workspace_id, v_order.team_id)",
      );
      expect(authorizationMigration).toContain("USING ERRCODE = '42501'");
      expect(authorizationMigration).toContain("TO authenticated, service_role");
    });

    it("automatically transitions order status and sets fulfillment context", () => {
      expect(migration).toContain("countdown.fulfillment_event_id");
      expect(migration).toContain("INSERT INTO public.order_status_history");
      expect(migration).toContain("delivered_at =");
    });

    it("updates RPC get_workspace_order_detail and list_workspace_orders to expose tracking fields", () => {
      expect(migration).toContain("package_location");
      expect(migration).toContain("tracking_events");
    });
  });

  describe("Courier Status Normalizer", () => {
    it("normalizes delivered variations to 'delivered'", () => {
      expect(normalizeCarrierStatus("delivered")).toBe("delivered");
      expect(normalizeCarrierStatus("Delivered")).toBe("delivered");
      expect(normalizeCarrierStatus("doruceno")).toBe("delivered");
      expect(normalizeCarrierStatus("doručeno")).toBe("delivered");
      expect(normalizeCarrierStatus("prevzato")).toBe("delivered");
      expect(normalizeCarrierStatus("převzato")).toBe("delivered");
      expect(normalizeCarrierStatus("vyzvednuto")).toBe("delivered");
    });

    it("normalizes returned variations to 'returned'", () => {
      expect(normalizeCarrierStatus("returned")).toBe("returned");
      expect(normalizeCarrierStatus("vraceno")).toBe("returned");
      expect(normalizeCarrierStatus("vráceno")).toBe("returned");
      expect(normalizeCarrierStatus("nedoruceno")).toBe("returned");
      expect(normalizeCarrierStatus("return_to_sender")).toBe("returned");
      expect(normalizeCarrierStatus("odmitnuto")).toBe("returned");
    });

    it("normalizes in-transit variations to 'sent'", () => {
      expect(normalizeCarrierStatus("sent")).toBe("sent");
      expect(normalizeCarrierStatus("in_transit")).toBe("sent");
      expect(normalizeCarrierStatus("odeslano")).toBe("sent");
      expect(normalizeCarrierStatus("podano")).toBe("sent");
      expect(normalizeCarrierStatus("expedovano")).toBe("sent");
    });

    it("returns null for depot/pickup point intermediate scans to preserve existing order status", () => {
      expect(normalizeCarrierStatus("at_pickup_point")).toBeNull();
      expect(normalizeCarrierStatus("depo_brno")).toBeNull();
      expect(normalizeCarrierStatus("stored_in_box")).toBeNull();
      expect(normalizeCarrierStatus(null)).toBeNull();
      expect(normalizeCarrierStatus(undefined)).toBeNull();
    });
  });

  describe("DAL: recordOrderTrackingEventForWorkspace", () => {
    it("validates that orderId and title are required", async () => {
      await expect(
        recordOrderTrackingEventForWorkspace({ orderId: "", title: "Pohyb" })
      ).rejects.toThrow("Order id is required");

      await expect(
        recordOrderTrackingEventForWorkspace({ orderId: "123", title: "  " })
      ).rejects.toThrow("Tracking event title is required");
    });

    it("calls record_order_tracking_event RPC with parameters", async () => {
      mocks.requireWorkspaceRole.mockResolvedValue({ workspaceId: "ws-1", role: "team_leader" });
      const mockRpc = vi.fn().mockResolvedValue({
        data: [
          {
            id: "order-1",
            status: "sent",
            package_location: "Depo Brno",
            tracking_events: [{ title: "Zásilka dorazila na depo Brno" }],
            revision: 2,
          },
        ],
        error: null,
      });

      mocks.createDataClient.mockResolvedValue({
        rpc: mockRpc,
      });

      const res = await recordOrderTrackingEventForWorkspace({
        orderId: "order-1",
        title: "Zásilka dorazila na depo Brno",
        location: "Depo Brno",
        status: null,
      });

      expect(mockRpc).toHaveBeenCalledWith("record_order_tracking_event", {
        p_order_id: "order-1",
        p_status: null,
        p_title: "Zásilka dorazila na depo Brno",
        p_location: "Depo Brno",
        p_description: null,
        p_occurred_at: null,
      });
      expect(res.package_location).toBe("Depo Brno");
      expect(res.revision).toBe(2);
    });
  });

  describe("Carrier Webhook Route Handler (/api/carriers/webhook)", () => {
    it("rejects requests when the webhook secret is not configured without creating an admin client", async () => {
      const req = new Request("http://localhost:3000/api/carriers/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracking_number: "Z123" }),
      });

      const res = await POST(req);

      expect(res.status).toBe(503);
      expect(mocks.createAdminClient).not.toHaveBeenCalled();
    });

    it("rejects malformed event bodies without creating an admin client", async () => {
      process.env.CARRIER_WEBHOOK_SECRET = "test-carrier-webhook-secret";

      for (const body of ["null", "42", JSON.stringify({ tracking_number: 123 }), JSON.stringify([null])]) {
        const req = new Request("http://localhost:3000/api/carriers/webhook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.CARRIER_WEBHOOK_SECRET}`,
          },
          body,
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
      }

      expect(mocks.createAdminClient).not.toHaveBeenCalled();
    });

    it("rejects unauthorized request when CARRIER_WEBHOOK_SECRET is set and token is missing or invalid", async () => {
      const originalSecret = process.env.CARRIER_WEBHOOK_SECRET;
      process.env.CARRIER_WEBHOOK_SECRET = "super-secret-key";

      try {
        const req = new Request("http://localhost:3000/api/carriers/webhook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer wrong-token",
          },
          body: JSON.stringify({ tracking_number: "Z123" }),
        });

        const res = await POST(req);
        expect(res.status).toBe(401);
      } finally {
        if (originalSecret !== undefined) {
          process.env.CARRIER_WEBHOOK_SECRET = originalSecret;
        } else {
          delete process.env.CARRIER_WEBHOOK_SECRET;
        }
      }
    });

    it("successfully processes event matching order by tracking_number and calls RPC", async () => {
      process.env.CARRIER_WEBHOOK_SECRET = "test-carrier-webhook-secret";
      const mockRpc = vi.fn().mockResolvedValue({ error: null });
      const mockAdmin = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "order-456", status: "sent", tracking_number: "Z123456789" },
                  error: null,
                }),
              }),
            }),
          }),
        }),
        rpc: mockRpc,
      };

      mocks.createAdminClient.mockReturnValue(mockAdmin);

      const req = new Request("http://localhost:3000/api/carriers/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-carrier-webhook-secret",
        },
        body: JSON.stringify({
          tracking_number: "Z123456789",
          carrier_status: "doruceno",
          title: "Zásilka doručena klientovi",
          location: "Z-BOX Brno",
          description: "Balíček byl úspěšně převzat.",
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.successCount).toBe(1);
      expect(mockRpc).toHaveBeenCalledWith("record_order_tracking_event", expect.objectContaining({
        p_order_id: "order-456",
        p_status: "delivered",
        p_title: "Zásilka doručena klientovi",
        p_location: "Z-BOX Brno",
        p_description: "Balíček byl úspěšně převzat.",
      }));
    });

    it("handles batch webhook events and reports partial failures gracefully", async () => {
      process.env.CARRIER_WEBHOOK_SECRET = "test-carrier-webhook-secret";
      const mockRpc = vi.fn().mockResolvedValue({ error: null });
      const mockAdmin = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => ({
                maybeSingle: vi.fn().mockImplementation(() => {
                  if (val === "Z_EXISTS") {
                    return Promise.resolve({
                      data: { id: "order-1", status: "sent", tracking_number: "Z_EXISTS" },
                      error: null,
                    });
                  }
                  return Promise.resolve({ data: null, error: null });
                }),
              })),
            }),
          }),
        }),
        rpc: mockRpc,
      };

      mocks.createAdminClient.mockReturnValue(mockAdmin);

      const req = new Request("http://localhost:3000/api/carriers/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-carrier-webhook-secret",
        },
        body: JSON.stringify([
          {
            tracking_number: "Z_EXISTS",
            title: "Uloženo na depu",
            location: "Depo Praha",
          },
          {
            tracking_number: "Z_NOT_FOUND",
            title: "Neznámá zásilka",
          },
        ]),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.processed).toBe(2);
      expect(json.successCount).toBe(1);
      expect(json.failureCount).toBe(1);
      expect(json.results[1].error).toBe("Order not found");
    });
  });

  describe("UI Integration Contracts", () => {
    it("integrates ShipmentTimelineCard with packageLocation in order detail page", () => {
      const orderDetailPage = source("src/app/orders/[orderId]/page.tsx");
      const timelineCard = source("src/components/orders/ShipmentTimelineCard.tsx");

      expect(orderDetailPage).toContain("ShipmentTimelineCard");
      expect(orderDetailPage).toContain("packageLocation={order.package_location || null}");
      expect(orderDetailPage).toContain("events={order.tracking_events || []}");

      expect(timelineCard).toContain("Časová osa zásilky (Timeline)");
      expect(timelineCard).toContain("Kde se balíček právě nachází:");
      expect(timelineCard).toContain("Při hovoru s klientem můžete ihned nahlásit toto výdejní místo");
    });

    it("integrates Sent & Return evening calling filter and package location in OrderPipeline", () => {
      const pipeline = source("src/components/orders/OrderPipeline.tsx");

      expect(pipeline).toContain("sent_and_returned");
      expect(pipeline).toContain("🔥 Senty & Returny");
      expect(pipeline).toContain("order.package_location");
      expect(pipeline).toContain("PhoneCall");
      expect(pipeline).toContain("Zavolat zákazníkovi");
    });
  });
});
