import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface WebhookTrackingPayload {
  tracking_number?: string;
  order_id?: string;
  status?: string;
  carrier_status?: string;
  title?: string;
  location?: string;
  description?: string;
  occurred_at?: string;
}

/**
 * Normalizes courier status names to the internal order status enum.
 * If the status represents an intermediate transit state (e.g. at depot, pickup point),
 * returns null so the main order status remains unchanged while the event and location are recorded.
 */
export function normalizeCarrierStatus(raw?: string | null): "delivered" | "returned" | "sent" | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();

  if (
    s === "delivered" ||
    s === "doruceno" ||
    s === "doručeno" ||
    s === "prevzato" ||
    s === "převzato" ||
    s === "vyzvednuto"
  ) {
    return "delivered";
  }

  if (
    s === "returned" ||
    s === "vraceno" ||
    s === "vráceno" ||
    s === "nedoruceno" ||
    s === "nedoručeno" ||
    s === "return_to_sender" ||
    s === "odmitnuto" ||
    s === "odmítnuto"
  ) {
    return "returned";
  }

  if (
    s === "sent" ||
    s === "in_transit" ||
    s === "odeslano" ||
    s === "odesláno" ||
    s === "podano" ||
    s === "podáno" ||
    s === "expedovano" ||
    s === "dispatched"
  ) {
    return "sent";
  }

  return null;
}

export async function POST(request: Request) {
  const secret = process.env.CARRIER_WEBHOOK_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    const secretHeader = request.headers.get("x-webhook-secret");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

    if (token !== secret && secretHeader !== secret) {
      return NextResponse.json({ error: "Unauthorized webhook request." }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const items: WebhookTrackingPayload[] = Array.isArray(body)
    ? (body as WebhookTrackingPayload[])
    : [body as WebhookTrackingPayload];

  if (items.length === 0) {
    return NextResponse.json({ error: "Empty events payload." }, { status: 400 });
  }

  const admin = createAdminClient();
  const results: Array<{ orderId: string | null; trackingNumber: string | null; success: boolean; error?: string }> = [];

  for (const item of items) {
    const trackingNumber = item.tracking_number?.trim() || null;
    const orderId = item.order_id?.trim() || null;

    if (!trackingNumber && !orderId) {
      results.push({
        orderId: null,
        trackingNumber: null,
        success: false,
        error: "Missing tracking_number or order_id",
      });
      continue;
    }

    try {
      // Find matching order
      let query = admin.from("orders").select("id, status, tracking_number").limit(1);
      if (orderId) {
        query = query.eq("id", orderId);
      } else if (trackingNumber) {
        query = query.eq("tracking_number", trackingNumber);
      }

      const { data: order, error: findError } = await query.maybeSingle();

      if (findError || !order) {
        results.push({
          orderId,
          trackingNumber,
          success: false,
          error: "Order not found",
        });
        continue;
      }

      const normalizedStatus = normalizeCarrierStatus(item.status || item.carrier_status);
      const title = item.title?.trim() || (item.location ? `Aktualizace zásilky: ${item.location}` : "Pohyb zásilky");
      const occurredAt = item.occurred_at || new Date().toISOString();

      const { error: rpcError } = await admin.rpc("record_order_tracking_event", {
        p_order_id: order.id,
        p_status: normalizedStatus,
        p_title: title,
        p_location: item.location?.trim() || null,
        p_description: item.description?.trim() || null,
        p_occurred_at: occurredAt,
      });

      if (rpcError) {
        results.push({
          orderId: order.id,
          trackingNumber: order.tracking_number,
          success: false,
          error: rpcError.message,
        });
      } else {
        results.push({
          orderId: order.id,
          trackingNumber: order.tracking_number,
          success: true,
        });
      }
    } catch (err) {
      results.push({
        orderId,
        trackingNumber,
        success: false,
        error: err instanceof Error ? err.message : "Internal processing error",
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  return NextResponse.json({
    ok: successCount > 0,
    processed: results.length,
    successCount,
    failureCount: results.length - successCount,
    results,
  });
}
