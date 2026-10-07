import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceRole: vi.fn(),
  requireWorkspaceContext: vi.fn(),
  createDataClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceRole: mocks.requireWorkspaceRole,
  requireWorkspaceContext: mocks.requireWorkspaceContext,
}));
vi.mock("@/lib/dal/db", () => ({
  createDataClient: mocks.createDataClient,
}));

import { updateOrderTrackingForWorkspace } from "@/lib/dal/orders";
import {
  CARRIERS,
  detectCarrierFromTrackingNumber,
  getCarrierMeta,
  getCarrierTrackingUrl,
} from "@/lib/tracking";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const migration = source("supabase/migrations/20261007130000_order_tracking_and_carrier.sql").replace(/\s+/g, " ");

describe("Milestone 1.3: Order Tracking & Carrier Integration", () => {
  describe("Tracking URL generator and Carrier Meta", () => {
    it("generates correct tracking URLs for Czech carriers", () => {
      // Zásilkovna / Packeta
      expect(getCarrierTrackingUrl("zasilkovna", "Z123456789")).toBe(
        "https://tracking.packeta.com/cs/?id=Z123456789"
      );

      // Balíkovna
      expect(getCarrierTrackingUrl("balikovna", "BA123456789")).toBe(
        "https://www.balikovna.cz/cs/sledovat-balik?trackingNumber=BA123456789"
      );

      // Česká pošta
      expect(getCarrierTrackingUrl("ceska_posta", "DR123456789CZ")).toBe(
        "https://www.postaonline.cz/trackandtrace/-/zasilka/cislo?parcelNumbers=DR123456789CZ"
      );

      // GLS
      expect(getCarrierTrackingUrl("gls", "12345678901")).toBe(
        "https://gls-group.com/CZ/cs/sledovani-zasilek?match=12345678901"
      );

      // DPD
      expect(getCarrierTrackingUrl("dpd", "123456789")).toBe(
        "https://www.dpd.com/cz/cs/sledovani-zasilek/?parcel=123456789"
      );

      // PPL
      expect(getCarrierTrackingUrl("ppl", "987654321")).toBe(
        "https://www.ppl.cz/vyhledat-zasilku?shipmentId=987654321"
      );

      // Custom full URL
      expect(getCarrierTrackingUrl("other", "https://custom-courier.com/track/123")).toBe(
        "https://custom-courier.com/track/123"
      );

      // Empty or missing tracking number
      expect(getCarrierTrackingUrl("zasilkovna", null)).toBeNull();
      expect(getCarrierTrackingUrl("zasilkovna", "")).toBeNull();
      expect(getCarrierTrackingUrl("zasilkovna", "   ")).toBeNull();
    });

    it("detects carrier from common barcode/tracking patterns", () => {
      expect(detectCarrierFromTrackingNumber("Z987654321")).toBe("zasilkovna");
      expect(detectCarrierFromTrackingNumber("BA123456789")).toBe("balikovna");
      expect(detectCarrierFromTrackingNumber("DR123456789CZ")).toBe("ceska_posta");
      expect(detectCarrierFromTrackingNumber("12345678901")).toBe("gls");
      expect(detectCarrierFromTrackingNumber("unknown-format")).toBeNull();
    });

    it("provides metadata and badges for all supported carriers", () => {
      expect(getCarrierMeta("zasilkovna").badge).toBe("Packeta");
      expect(getCarrierMeta("balikovna").badge).toBe("Balíkovna");
      expect(getCarrierMeta("gls").badge).toBe("GLS");
      expect(CARRIERS.zasilkovna.label).toContain("Packeta");
      expect(CARRIERS.balikovna.label).toContain("Balíkovna");
    });
  });

  describe("SQL Database Migration Contract", () => {
    it("adds tracking_number and carrier columns and index to public.orders", () => {
      expect(migration).toContain("ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number TEXT");
      expect(migration).toContain("ADD COLUMN IF NOT EXISTS carrier TEXT");
      expect(migration).toContain("CREATE INDEX IF NOT EXISTS orders_workspace_tracking_idx ON public.orders(workspace_id, tracking_number)");
    });

    it("defines update_order_tracking RPC function with manager authorization and audit note", () => {
      expect(migration).toContain("CREATE OR REPLACE FUNCTION public.update_order_tracking");
      expect(migration).toContain("Only workspace managers can update tracking information");
      expect(migration).toContain("UPDATE public.orders SET tracking_number = v_clean_tracking");
      expect(migration).toContain("INSERT INTO public.order_status_history");
      expect(migration).toContain("Tracking updated:");
    });

    it("updates direct order and activity RPC queries to return tracking fields", () => {
      expect(migration).toContain("'tracking_number', target.tracking_number");
      expect(migration).toContain("'carrier', target.carrier");
      expect(migration).toContain("'tracking_number', order_row.tracking_number");
      expect(migration).toContain("'carrier', order_row.carrier");
    });
  });

  describe("DAL: updateOrderTrackingForWorkspace", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mocks.requireWorkspaceRole.mockResolvedValue({
        userId: "manager-1",
        workspaceId: "workspace-1",
        role: "team_leader",
      });
    });

    it("validates input fields before querying the database", async () => {
      await expect(
        updateOrderTrackingForWorkspace({ orderId: "" })
      ).rejects.toMatchObject({ code: "VALIDATION" });

      await expect(
        updateOrderTrackingForWorkspace({
          orderId: "ord-1",
          trackingNumber: "x".repeat(101),
        })
      ).rejects.toMatchObject({ code: "VALIDATION" });

      await expect(
        updateOrderTrackingForWorkspace({
          orderId: "ord-1",
          carrier: "y".repeat(51),
        })
      ).rejects.toMatchObject({ code: "VALIDATION" });
    });

    it("enforces manager role check and calls update_order_tracking RPC", async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [
          {
            id: "ord-1",
            status: "sent",
            tracking_number: "Z123456789",
            carrier: "zasilkovna",
            revision: 2,
          },
        ],
        error: null,
      });

      mocks.createDataClient.mockResolvedValue({ rpc: mockRpc });

      const result = await updateOrderTrackingForWorkspace({
        orderId: "ord-1",
        trackingNumber: "  Z123456789  ",
        carrier: "zasilkovna",
      });

      expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(
        ["team_leader", "administrator"],
        undefined
      );
      expect(mockRpc).toHaveBeenCalledWith("update_order_tracking", {
        p_order_id: "ord-1",
        p_tracking_number: "Z123456789",
        p_carrier: "zasilkovna",
      });
      expect(result.tracking_number).toBe("Z123456789");
      expect(result.carrier).toBe("zasilkovna");
    });
  });

  describe("UI Integration Contracts", () => {
    it("integrates OrderTrackingCard with editable state and actions in order detail page", () => {
      const orderDetailPage = source("src/app/orders/[orderId]/page.tsx");
      const trackingCard = source("src/components/orders/OrderTrackingCard.tsx");

      expect(orderDetailPage).toContain("OrderTrackingCard");
      expect(orderDetailPage).toContain("order.tracking_number");
      expect(orderDetailPage).toContain("order.carrier");
      expect(orderDetailPage).toContain("updateOrderTrackingAction");

      expect(trackingCard).toContain("data-testid=\"order-tracking-card\"");
      expect(trackingCard).toContain("getCarrierTrackingUrl");
      expect(trackingCard).toContain("external-tracking-link");
      expect(trackingCard).toContain("Sledovat balíček online");
    });

    it("integrates LeadOrdersSection in customer profile page with shipment tracking links", () => {
      const leadDetailPage = source("src/app/leads/[leadId]/page.tsx");
      const leadOrdersSection = source("src/components/leads/LeadOrdersSection.tsx");

      expect(leadDetailPage).toContain("LeadOrdersSection");
      expect(leadDetailPage).toContain("orders={activity.orders}");

      expect(leadOrdersSection).toContain("data-testid=\"lead-orders-section\"");
      expect(leadOrdersSection).toContain("getCarrierTrackingUrl");
      expect(leadOrdersSection).toContain("Sledovat balíček");
      expect(leadOrdersSection).toContain("Historie objednávek & Sledování zásilek");
    });
  });
});
