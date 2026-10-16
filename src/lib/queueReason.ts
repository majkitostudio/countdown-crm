/**
 * Human-readable reason why a queue item sits in its department queue.
 *
 * The SQL routing functions stamp a routing marker onto
 * `lead_queue_items.last_outcome` at the moment they move an item into a
 * department team:
 *
 *   - `objection`          → recyclable objection, P4 next day (24 h cooldown)
 *   - `package_returned`   → returned parcel, P4 Re-ship rescue
 *   - `at_risk_pickup`     → parcel sitting at a pickup point 3+ days, P4 rescue
 *   - `retention_followup` → delivered order, P3 retention (21 days)
 *
 * Anything else — a plain call outcome such as `no_answer`, or no recorded
 * outcome at all — yields `null`, so the UI shows "—" instead of guessing why a
 * lead is in the queue. Pure module: no database, no products, no lead sources.
 */

/** Styling bucket: P4 rescue work vs. P3 retention work. */
export type QueueReasonKind = "rescue" | "retention";

export interface QueueReason {
  /** Short Czech label shown in the queue table. */
  label: string;
  kind: QueueReasonKind;
}

const QUEUE_REASONS: Record<string, QueueReason> = {
  objection: { label: "Námitka – recyklace na další den", kind: "rescue" },
  package_returned: { label: "Vrácený balíček – Re-ship", kind: "rescue" },
  at_risk_pickup: { label: "Balíček na výdejně (3+ dny)", kind: "rescue" },
  retention_followup: { label: "Retence – 21 dní po doručení", kind: "retention" },
};

/**
 * Maps a queue item's `last_outcome` to a readable reason, or `null` when the
 * recorded outcome does not describe a department routing decision.
 */
export function describeQueueReason(lastOutcome: string | null | undefined): QueueReason | null {
  if (typeof lastOutcome !== "string") return null;
  return QUEUE_REASONS[lastOutcome.trim()] ?? null;
}
