import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface WebhookTrackingPayload {
  tracking_number?: string | null;
  order_id?: string | null;
  status?: string | null;
  carrier_status?: string | null;
  title?: string | null;
  location?: string | null;
  description?: string | null;
  occurred_at?: string | null;
}

const PAYLOAD_STRING_FIELDS = [
  "tracking_number",
  "order_id",
  "status",
  "carrier_status",
  "title",
  "location",
  "description",
  "occurred_at",
] as const;

function isWebhookTrackingPayload(value: unknown): value is WebhookTrackingPayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;

  return PAYLOAD_STRING_FIELDS.every((field) => {
    const fieldValue = (value as Record<string, unknown>)[field];
    return fieldValue === undefined || fieldValue === null || typeof fieldValue === "string";
  });
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
  const secret = process.env.CARRIER_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Carrier webhook is not configured." }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  const secretHeader = request.headers.get("x-webhook-secret");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (token !== secret && secretHeader !== secret) {
    return NextResponse.json({ error: "Unauthorized webhook request." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!Array.isArray(body) && !isWebhookTrackingPayload(body)) {
    return NextResponse.json({ error: "Webhook event must be an object." }, { status: 400 });
  }

  const rawItems: unknown[] = Array.isArray(body) ? body : [body];

  if (rawItems.length === 0) {
    return NextResponse.json({ error: "Empty events payload." }, { status: 400 });
  }

  if (!rawItems.some(isWebhookTrackingPayload)) {
    return NextResponse.json({ error: "Webhook payload contains no valid events." }, { status: 400 });
  }

  const admin = createAdminClient();
  const results: Array<{ orderId: string | null; trackingNumber: string | null; success: boolean; error?: string }> = [];

  for (const rawItem of rawItems) {
    if (!isWebhookTrackingPayload(rawItem)) {
      results.push({
        orderId: null,
        trackingNumber: null,
        success: false,
        error: "Invalid event payload",
      });
      continue;
    }

    const item = rawItem;
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
