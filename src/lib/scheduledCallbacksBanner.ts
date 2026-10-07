export interface ScheduledCallbackItem {
  id: string;
  leadId?: string;
  leadName: string;
  phone?: string | null;
  scheduledAt: string;
}

export interface ProcessedScheduledCallbackItem extends ScheduledCallbackItem {
  isOverdue: boolean;
}

export interface ScheduledCallbacksBannerState {
  hasCallbacks: boolean;
  hasCallbacksToday: boolean;
  totalToday: number;
  morningCount: number;
  afternoonCount: number;
  overdueCount: number;
  headline: string;
  subtext: string | null;
  urgency: "neutral" | "scheduled" | "critical";
  nextDueCallback: ProcessedScheduledCallbackItem | null;
  items: ProcessedScheduledCallbackItem[];
  todayCallbacks: ProcessedScheduledCallbackItem[];
}

export function formatCzechCallbackCount(count: number): string {
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

export function formatCallbackClockTime(isoString: string): string {
  const date = new Date(isoString);
  if (!Number.isFinite(date.getTime())) return "--:--";
  return date.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}

export function getScheduledCallbacksBannerState(
  callbacks: ScheduledCallbackItem[],
  now = new Date(),
): ScheduledCallbacksBannerState {
  const validCallbacks = callbacks
    .filter((c) => Boolean(c.id && c.scheduledAt && Number.isFinite(Date.parse(c.scheduledAt))))
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));

  if (validCallbacks.length === 0) {
    return {
      hasCallbacks: false,
      hasCallbacksToday: false,
      totalToday: 0,
      morningCount: 0,
      afternoonCount: 0,
      overdueCount: 0,
      headline: "Nemáte žádné naplánované hovory",
      subtext: null,
      urgency: "neutral",
      nextDueCallback: null,
      items: [],
      todayCallbacks: [],
    };
  }

  const nowMs = now.getTime();
  const processedItems: ProcessedScheduledCallbackItem[] = validCallbacks.map((c) => ({
    ...c,
    isOverdue: Date.parse(c.scheduledAt) < nowMs,
  }));

  const todayCallbacks = processedItems.filter((c) => isSameCalendarDay(new Date(c.scheduledAt), now));

  // Overdue: scheduled in the past (up to 48 hours back)
  const overdueCallbacks = processedItems.filter((c) => {
    const time = Date.parse(c.scheduledAt);
    return time < nowMs && nowMs - time < 48 * 60 * 60 * 1000;
  });

  // Morning callbacks today (scheduled before 12:00)
  const morningCallbacks = todayCallbacks.filter((c) => new Date(c.scheduledAt).getHours() < 12);

  // Afternoon callbacks today (scheduled at or after 12:00)
  const afternoonCallbacks = todayCallbacks.filter((c) => new Date(c.scheduledAt).getHours() >= 12);

  const isCurrentMorning = now.getHours() < 12;

  let headline = "";
  let urgency: ScheduledCallbacksBannerState["urgency"] = "scheduled";

  if (overdueCallbacks.length > 0) {
    headline = `Máte ${formatCzechCallbackCount(overdueCallbacks.length)} čekající na vyřízení právě teď`;
    urgency = "critical";
  } else if (isCurrentMorning && morningCallbacks.length > 0) {
    headline = `Máte ${formatCzechCallbackCount(morningCallbacks.length)} k vyřízení na dnešní dopoledne`;
    urgency = "scheduled";
  } else if (!isCurrentMorning && afternoonCallbacks.length > 0) {
    headline = `Máte ${formatCzechCallbackCount(afternoonCallbacks.length)} k vyřízení na dnešní odpoledne`;
    urgency = "scheduled";
  } else if (todayCallbacks.length > 0) {
    headline = `Máte ${formatCzechCallbackCount(todayCallbacks.length)} k vyřízení na dnešní den`;
    urgency = "scheduled";
  } else {
    headline = `Máte ${formatCzechCallbackCount(validCallbacks.length)} naplánovaných na další dny`;
    urgency = "neutral";
  }

  const nextDueCallback = overdueCallbacks[0] || todayCallbacks[0] || processedItems[0];
  const nextTimeStr = formatCallbackClockTime(nextDueCallback.scheduledAt);
  const subtext = nextDueCallback
    ? `Nejbližší: ${nextDueCallback.leadName} (${nextTimeStr})`
    : null;

  return {
    hasCallbacks: true,
    hasCallbacksToday: todayCallbacks.length > 0 || overdueCallbacks.length > 0,
    totalToday: todayCallbacks.length,
    morningCount: morningCallbacks.length,
    afternoonCount: afternoonCallbacks.length,
    overdueCount: overdueCallbacks.length,
    headline,
    subtext,
    urgency,
    nextDueCallback,
    items: processedItems,
    todayCallbacks,
  };
}
