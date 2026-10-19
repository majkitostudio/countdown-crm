export interface ScheduledCallItem {
  id: string;
  leadId?: string;
  leadName: string;
  phone?: string | null;
  scheduledAt: string;
}

export interface ProcessedScheduledCallItem extends ScheduledCallItem {
  isOverdue: boolean;
}

export interface ScheduledCallsBannerState {
  hasScheduledCalls: boolean;
  hasScheduledCallsToday: boolean;
  totalToday: number;
  morningCount: number;
  afternoonCount: number;
  overdueCount: number;
  headline: string;
  subtext: string | null;
  urgency: "neutral" | "scheduled" | "critical";
  nextDueScheduledCall: ProcessedScheduledCallItem | null;
  items: ProcessedScheduledCallItem[];
  todayScheduledCalls: ProcessedScheduledCallItem[];
}

export function formatCzechScheduledCallCount(count: number): string {
  if (count === 1) return "1 hovor";
  if (count >= 2 && count <= 4) return `${count} hovory`;
  return `${count} hovorů`;
}

function isSameCalendarDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function formatScheduledCallClockTime(isoString: string): string {
  const date = new Date(isoString);
  if (!Number.isFinite(date.getTime())) return "--:--";
  return date.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}

export function getScheduledCallsBannerState(
  scheduledCalls: ScheduledCallItem[],
  now = new Date(),
): ScheduledCallsBannerState {
  const validScheduledCalls = scheduledCalls
    .filter((c) => Boolean(c.id && c.scheduledAt && Number.isFinite(Date.parse(c.scheduledAt))))
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));

  if (validScheduledCalls.length === 0) {
    return {
      hasScheduledCalls: false,
      hasScheduledCallsToday: false,
      totalToday: 0,
      morningCount: 0,
      afternoonCount: 0,
      overdueCount: 0,
      headline: "Nemáte žádné naplánované hovory",
      subtext: null,
      urgency: "neutral",
      nextDueScheduledCall: null,
      items: [],
      todayScheduledCalls: [],
    };
  }

  const nowMs = now.getTime();
  const processedItems: ProcessedScheduledCallItem[] = validScheduledCalls.map((c) => ({
    ...c,
    isOverdue: Date.parse(c.scheduledAt) < nowMs,
  }));

  const todayScheduledCalls = processedItems.filter((c) => isSameCalendarDay(new Date(c.scheduledAt), now));

  // Overdue: scheduled in the past (up to 48 hours back)
  const overdueScheduledCalls = processedItems.filter((c) => {
    const time = Date.parse(c.scheduledAt);
    return time < nowMs && nowMs - time < 48 * 60 * 60 * 1000;
  });

  // Morning scheduled calls today (scheduled before 12:00)
  const morningScheduledCalls = todayScheduledCalls.filter((c) => new Date(c.scheduledAt).getHours() < 12);

  // Afternoon scheduled calls today (scheduled at or after 12:00)
  const afternoonScheduledCalls = todayScheduledCalls.filter((c) => new Date(c.scheduledAt).getHours() >= 12);

  const isCurrentMorning = now.getHours() < 12;

  let headline = "";
  let urgency: ScheduledCallsBannerState["urgency"] = "scheduled";

  if (overdueScheduledCalls.length > 0) {
    headline = `Máte ${formatCzechScheduledCallCount(overdueScheduledCalls.length)} čekající na vyřízení právě teď`;
    urgency = "critical";
  } else if (isCurrentMorning && morningScheduledCalls.length > 0) {
    headline = `Máte ${formatCzechScheduledCallCount(morningScheduledCalls.length)} k vyřízení na dnešní dopoledne`;
    urgency = "scheduled";
  } else if (!isCurrentMorning && afternoonScheduledCalls.length > 0) {
    headline = `Máte ${formatCzechScheduledCallCount(afternoonScheduledCalls.length)} k vyřízení na dnešní odpoledne`;
    urgency = "scheduled";
  } else if (todayScheduledCalls.length > 0) {
    headline = `Máte ${formatCzechScheduledCallCount(todayScheduledCalls.length)} k vyřízení na dnešní den`;
    urgency = "scheduled";
  } else {
    headline = `Máte ${formatCzechScheduledCallCount(validScheduledCalls.length)} naplánovaných na další dny`;
    urgency = "neutral";
  }

  const nextDueScheduledCall = overdueScheduledCalls[0] || todayScheduledCalls[0] || processedItems[0];
  const nextTimeStr = formatScheduledCallClockTime(nextDueScheduledCall.scheduledAt);
  const subtext = nextDueScheduledCall
    ? `Nejbližší: ${nextDueScheduledCall.leadName} (${nextTimeStr})`
    : null;

  return {
    hasScheduledCalls: true,
    hasScheduledCallsToday: todayScheduledCalls.length > 0 || overdueScheduledCalls.length > 0,
    totalToday: todayScheduledCalls.length,
    morningCount: morningScheduledCalls.length,
    afternoonCount: afternoonScheduledCalls.length,
    overdueCount: overdueScheduledCalls.length,
    headline,
    subtext,
    urgency,
    nextDueScheduledCall,
    items: processedItems,
    todayScheduledCalls,
  };
}
