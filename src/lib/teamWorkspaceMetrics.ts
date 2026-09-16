export type TeamWorkspacePeriod = {
  from: string;
  to: string;
};

export type TeamWorkspaceOperator = {
  id: string;
  name: string;
};

export type TeamWorkspaceCall = {
  id: string;
  operatorId: string | null;
  occurredAt: string;
  outcome: "order_placed" | "followup_scheduled" | "objection" | "no_answer" | "completed";
};

export type TeamWorkspaceOrder = {
  id: string;
  operatorId: string | null;
  createdAt: string;
  status: "completed" | "pending" | "in_progress" | "sent" | "cancelled" | "delivered" | "returned";
};

export type TeamWorkspaceCallActivity = {
  id: string;
  operatorId: string | null;
  startedAt: string | null;
  endedAt: string | null;
};

export type TeamWorkspaceShift = {
  operatorId: string;
  startsAt: string;
  endsAt: string;
};

export type TeamWorkspaceOperatorMetrics = {
  operatorId: string;
  operatorName: string;
  sales: number;
  fails: number;
  conversionPercent: number | null;
  dialedCalls: number;
  connectedCalls: number;
  talkTimeSeconds: number;
  talkTimePercent: number | null;
  shiftSeconds: number | null;
};

export const SALES_ORDER_STATUSES = [
  "completed",
  "pending",
  "in_progress",
  "sent",
  "delivered",
] as const;

function parseTimestamp(value: string | null): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isWithinPeriod(value: string, period: TeamWorkspacePeriod): boolean {
  const timestamp = parseTimestamp(value);
  const from = parseTimestamp(period.from);
  const to = parseTimestamp(period.to);
  return timestamp !== null && from !== null && to !== null && timestamp >= from && timestamp < to;
}

function overlapSeconds(
  startsAt: string | null,
  endsAt: string | null,
  period: TeamWorkspacePeriod,
): number {
  const start = parseTimestamp(startsAt);
  const end = parseTimestamp(endsAt);
  const periodStart = parseTimestamp(period.from);
  const periodEnd = parseTimestamp(period.to);
  if (start === null || end === null || periodStart === null || periodEnd === null || end <= start) return 0;

  const overlapStart = Math.max(start, periodStart);
  const overlapEnd = Math.min(end, periodEnd);
  return overlapEnd > overlapStart ? Math.round((overlapEnd - overlapStart) / 1000) : 0;
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

function isSaleStatus(status: TeamWorkspaceOrder["status"]): boolean {
  return (SALES_ORDER_STATUSES as readonly string[]).includes(status);
}

export function buildTeamWorkspaceOperatorMetrics(input: {
  operators: TeamWorkspaceOperator[];
  calls: TeamWorkspaceCall[];
  orders: TeamWorkspaceOrder[];
  activities: TeamWorkspaceCallActivity[];
  shifts: TeamWorkspaceShift[];
  period: TeamWorkspacePeriod;
}): TeamWorkspaceOperatorMetrics[] {
  const callsByOperator = new Map<string, TeamWorkspaceCall[]>();
  const ordersByOperator = new Map<string, TeamWorkspaceOrder[]>();
  const activitiesByOperator = new Map<string, TeamWorkspaceCallActivity[]>();
  const shiftsByOperator = new Map<string, TeamWorkspaceShift[]>();

  for (const call of input.calls) {
    if (!call.operatorId || !isWithinPeriod(call.occurredAt, input.period)) continue;
    const entries = callsByOperator.get(call.operatorId) || [];
    entries.push(call);
    callsByOperator.set(call.operatorId, entries);
  }

  for (const order of input.orders) {
    if (!order.operatorId || !isWithinPeriod(order.createdAt, input.period) || !isSaleStatus(order.status)) continue;
    const entries = ordersByOperator.get(order.operatorId) || [];
    entries.push(order);
    ordersByOperator.set(order.operatorId, entries);
  }

  for (const activity of input.activities) {
    if (!activity.operatorId) continue;
    const entries = activitiesByOperator.get(activity.operatorId) || [];
    entries.push(activity);
    activitiesByOperator.set(activity.operatorId, entries);
  }

  for (const shift of input.shifts) {
    const entries = shiftsByOperator.get(shift.operatorId) || [];
    entries.push(shift);
    shiftsByOperator.set(shift.operatorId, entries);
  }

  return input.operators.map((operator) => {
    const calls = callsByOperator.get(operator.id) || [];
    const orders = ordersByOperator.get(operator.id) || [];
    const activities = activitiesByOperator.get(operator.id) || [];
    const shifts = shiftsByOperator.get(operator.id) || [];
    const fails = calls.filter((call) => call.outcome === "objection").length;
    const dialedCalls = calls.length;
    const connectedCalls = calls.filter((call) => call.outcome !== "no_answer").length;
    const sales = orders.length;
    const talkTimeSeconds = activities.reduce(
      (total, activity) => total + overlapSeconds(activity.startedAt, activity.endedAt, input.period),
      0,
    );
    const shiftSeconds = shifts.reduce(
      (total, shift) => total + overlapSeconds(shift.startsAt, shift.endsAt, input.period),
      0,
    );

    return {
      operatorId: operator.id,
      operatorName: operator.name,
      sales,
      fails,
      conversionPercent: fails > 0 ? roundPercent((sales / fails) * 100) : null,
      dialedCalls,
      connectedCalls,
      talkTimeSeconds,
      talkTimePercent: shiftSeconds > 0 ? roundPercent((talkTimeSeconds / shiftSeconds) * 100) : null,
      shiftSeconds: shiftSeconds > 0 ? shiftSeconds : null,
    };
  });
}
