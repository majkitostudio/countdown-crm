export interface CallActivityDayPoint {
  date: string;
  day: string;
  count: number;
}

export interface CallActivityHourPoint {
  hour: number;
  count: number;
}

export interface CallActivityOverview {
  periodDays: number;
  periodStart: string;
  periodEnd: string;
  totalCalls: number;
  daily: CallActivityDayPoint[];
  hourly: CallActivityHourPoint[];
  peakHour: number | null;
}

interface ActivityCall {
  created_at: string;
}

export const CALL_ACTIVITY_PERIOD_DAYS = 7;

/** Zero-filled shape used while analytics data is unavailable or still loading. */
export function createEmptyCallActivity(periodDays = CALL_ACTIVITY_PERIOD_DAYS): CallActivityOverview {
  return {
    periodDays,
    periodStart: "",
    periodEnd: "",
    totalCalls: 0,
    daily: [],
    hourly: [],
    peakHour: null,
  };
}

/**
 * Aggregates persisted call rows into daily volume (one bucket per calendar day
 * of the period) and hourly activity (one bucket per UTC hour, summed across
 * the period). Mirrors `getDailyTeamSummary`, so both use the UTC calendar —
 * no synthetic bars are produced when the period contains no calls.
 */
export function getCallActivity(
  calls: ActivityCall[],
  now = new Date(),
  periodDays = CALL_ACTIVITY_PERIOD_DAYS,
): CallActivityOverview {
  const safePeriodDays = Math.max(1, Math.floor(periodDays));

  const periodEnd = now.toISOString().slice(0, 10);
  const periodStartDate = new Date(now);
  periodStartDate.setUTCHours(0, 0, 0, 0);
  periodStartDate.setUTCDate(periodStartDate.getUTCDate() - (safePeriodDays - 1));
  const periodStart = periodStartDate.toISOString().slice(0, 10);
  const periodStartMs = periodStartDate.getTime();

  const dailyCounts = new Map<string, number>();
  for (let offset = 0; offset < safePeriodDays; offset += 1) {
    const date = new Date(periodStartDate);
    date.setUTCDate(periodStartDate.getUTCDate() + offset);
    dailyCounts.set(date.toISOString().slice(0, 10), 0);
  }

  const hourlyCounts = new Array<number>(24).fill(0);
  let totalCalls = 0;

  calls.forEach((call) => {
    const createdAtMs = new Date(call.created_at).getTime();
    if (Number.isNaN(createdAtMs) || createdAtMs < periodStartMs) return;

    const dateKey = call.created_at.slice(0, 10);
    const dayCount = dailyCounts.get(dateKey);
    if (dayCount === undefined) return;

    dailyCounts.set(dateKey, dayCount + 1);
    hourlyCounts[new Date(createdAtMs).getUTCHours()] += 1;
    totalCalls += 1;
  });

  const daily: CallActivityDayPoint[] = Array.from(dailyCounts.entries()).map(([date, count]) => ({
    date,
    day: new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
    count,
  }));

  const hourly: CallActivityHourPoint[] = hourlyCounts.map((count, hour) => ({ hour, count }));
  const peakCount = Math.max(...hourlyCounts);
  const peakHour = totalCalls > 0 && peakCount > 0 ? hourlyCounts.indexOf(peakCount) : null;

  return {
    periodDays: safePeriodDays,
    periodStart,
    periodEnd,
    totalCalls,
    daily,
    hourly,
    peakHour,
  };
}
