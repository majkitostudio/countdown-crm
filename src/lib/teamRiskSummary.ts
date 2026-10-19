/**
 * Operational risk summary for the Team Leader dashboard.
 *
 * Answers "how many things are currently at risk or overdue" with the same
 * rules the Exception Queue uses, so the dashboard cards and the queue never
 * disagree. A queue row counts towards at most one category, using the same
 * precedence as the exception builder (recovery → overdue scheduled call →
 * expired lease).
 *
 * No products, sources, or fixed intervals beyond what `orderRisk` already
 * defines — the module is a pure function over plain rows.
 */

import { getOrderRisk } from "@/lib/orderRisk";

/** Queue state for a scheduled call (internal name kept per AGENTS.md rule 7). */
const SCHEDULED_CALL_STATE = "scheduled";
/** Queue state where an operator holds the lead. */
const ASSIGNED_STATE = "assigned";
/** Queue state waiting for a call outcome to be recorded. */
const AWAITING_OUTCOME_STATE = "awaiting_outcome";

export interface TeamRiskQueueItemInput {
  state: string;
  scheduled_at: string | null;
  lease_expires_at: string | null;
  recovery_required: boolean;
}

export interface TeamRiskPickupOrderInput {
  status: string;
  package_location: string | null;
  package_arrived_at: string | null;
  pickup_call_completed_at: string | null;
}

export interface TeamRiskSummary {
  /** Calls that ended without a recorded outcome (critical). */
  outcomeRecovery: number;
  /** Scheduled calls whose promised time has passed (high). */
  overdueScheduledCalls: number;
  /** Operator assignments that expired before completion (high). */
  expiredLeases: number;
  /** Packages at a pickup point for a risk-level number of days. */
  pickupRiskWarning: number;
  /** Packages at a pickup point for an alarm-level number of days. */
  pickupRiskAlarm: number;
  /** Sum of every category — one attention item overall. */
  total: number;
}

function isBefore(value: string | null, nowMs: number): boolean {
  if (!value) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed < nowMs;
}

export function buildTeamRiskSummary(
  queueItems: readonly TeamRiskQueueItemInput[],
  pickupOrders: readonly TeamRiskPickupOrderInput[],
  now: Date = new Date(),
): TeamRiskSummary {
  const nowMs = now.getTime();

  let outcomeRecovery = 0;
  let overdueScheduledCalls = 0;
  let expiredLeases = 0;

  for (const item of queueItems) {
    if (item.recovery_required || item.state === AWAITING_OUTCOME_STATE) {
      outcomeRecovery += 1;
    } else if (item.state === SCHEDULED_CALL_STATE && isBefore(item.scheduled_at, nowMs)) {
      overdueScheduledCalls += 1;
    } else if (item.state === ASSIGNED_STATE && isBefore(item.lease_expires_at, nowMs)) {
      expiredLeases += 1;
    }
  }

  let pickupRiskWarning = 0;
  let pickupRiskAlarm = 0;
  for (const order of pickupOrders) {
    const risk = getOrderRisk(order, nowMs);
    if (risk.level === "warning") pickupRiskWarning += 1;
    if (risk.level === "alarm") pickupRiskAlarm += 1;
  }

  return {
    outcomeRecovery,
    overdueScheduledCalls,
    expiredLeases,
    pickupRiskWarning,
    pickupRiskAlarm,
    total: outcomeRecovery + overdueScheduledCalls + expiredLeases + pickupRiskWarning + pickupRiskAlarm,
  };
}
