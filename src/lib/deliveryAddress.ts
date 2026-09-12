export interface DeliveryAddressSnapshot {
  recipient_name: string;
  line1: string;
  line2?: string;
  city: string;
  postal_code: string;
  country: string;
}

export interface VerifiedDeliveryAddress {
  orderId: string;
  address: DeliveryAddressSnapshot;
  deliveredAt: string;
}

export interface DeliveryAddressSnapshotCandidate {
  id: string;
  status: string;
  delivered_at: string | null;
  created_at: string;
  delivery_address_snapshot: unknown;
}

function parseRequiredText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Parses the immutable address shape saved with an order, never lead fields. */
export function parseDeliveryAddressSnapshot(value: unknown): DeliveryAddressSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const recipientName = parseRequiredText(record.recipient_name);
  const line1 = parseRequiredText(record.line1);
  const city = parseRequiredText(record.city);
  const postalCode = parseRequiredText(record.postal_code);
  const country = parseRequiredText(record.country);

  if (!recipientName || !line1 || !city || !postalCode || !country) return null;

  const line2 = record.line2;
  if (line2 !== undefined && line2 !== null && !parseRequiredText(line2)) return null;

  return {
    recipient_name: recipientName,
    line1,
    ...(line2 ? { line2: parseRequiredText(line2)! } : {}),
    city,
    postal_code: postalCode,
    country,
  };
}

/** Returns an address only when the newest valid snapshot belongs to a delivered order. */
export function findLatestVerifiedDeliveryAddress(
  orders: DeliveryAddressSnapshotCandidate[],
): VerifiedDeliveryAddress | null {
  const delivered = orders
    .filter((order) => order.status === "delivered" && Boolean(order.delivered_at))
    .sort((left, right) => Date.parse(right.delivered_at!) - Date.parse(left.delivered_at!));

  for (const order of delivered) {
    const address = parseDeliveryAddressSnapshot(order.delivery_address_snapshot);
    if (address) return { orderId: order.id, address, deliveredAt: order.delivered_at! };
  }

  return null;
}
