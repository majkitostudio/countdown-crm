import type { CalendarEntryDTO } from "@/lib/dal/calendar";

export type ScheduleBucketKey = "overdue" | "today" | "tomorrow" | "later";

export interface ScheduleBucket {
  key: ScheduleBucketKey;
  label: string;
  badgeTone: "danger" | "warning" | "neutral";
  entries: CalendarEntryDTO[];
}

export interface ScheduleBucketsSummary {
  overdueCount: number;
  todayCount: number;
  tomorrowCount: number;
  laterCount: number;
  totalCount: number;
  buckets: ScheduleBucket[];
}

function getStartOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getEndOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * Rozdělí položky kalendáře / agendy do 4 logických sekcí:
 * 1. Propadlé (Overdue) - čas začátku je v minulosti a stav není completed
 * 2. Dnes (Today) - od teď do konce dnešního dne
 * 3. Zítra (Tomorrow) - celý zítřejší den
 * 4. Později / Tento týden a dále (Later) - vše za zítřkem
 */
export function buildScheduleBuckets(
  entries: CalendarEntryDTO[],
  now = new Date(),
): ScheduleBucketsSummary {
  const nowMs = now.getTime();
  const todayEndMs = getEndOfDay(now);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStartMs = getStartOfDay(tomorrow);
  const tomorrowEndMs = getEndOfDay(tomorrow);

  const overdue: CalendarEntryDTO[] = [];
  const today: CalendarEntryDTO[] = [];
  const tomorrowEntries: CalendarEntryDTO[] = [];
  const later: CalendarEntryDTO[] = [];

  for (const entry of entries) {
    if (entry.status === "completed") {
      // Dokončené úkoly/hovory zařadíme do dne, kdy měly začít, nebo do later
      const timeMs = Date.parse(entry.starts_at);
      if (timeMs <= todayEndMs) {
        today.push(entry);
      } else if (timeMs <= tomorrowEndMs) {
        tomorrowEntries.push(entry);
      } else {
        later.push(entry);
      }
      continue;
    }

    const timeMs = Date.parse(entry.starts_at);
    if (!Number.isFinite(timeMs)) {
      later.push(entry);
      continue;
    }

    if (timeMs < nowMs) {
      overdue.push(entry);
    } else if (timeMs <= todayEndMs) {
      today.push(entry);
    } else if (timeMs >= tomorrowStartMs && timeMs <= tomorrowEndMs) {
      tomorrowEntries.push(entry);
    } else {
      later.push(entry);
    }
  }

  // Seřadíme každou skupinu podle času
  const sortByTime = (a: CalendarEntryDTO, b: CalendarEntryDTO) =>
    Date.parse(a.starts_at) - Date.parse(b.starts_at);

  overdue.sort(sortByTime);
  today.sort(sortByTime);
  tomorrowEntries.sort(sortByTime);
  later.sort(sortByTime);

  const buckets: ScheduleBucket[] = [
    {
      key: "overdue",
      label: "Po termínu",
      badgeTone: "danger",
      entries: overdue,
    },
    {
      key: "today",
      label: "Dnes",
      badgeTone: "warning",
      entries: today,
    },
    {
      key: "tomorrow",
      label: "Zítra",
      badgeTone: "neutral",
      entries: tomorrowEntries,
    },
    {
      key: "later",
      label: "Později",
      badgeTone: "neutral",
      entries: later,
    },
  ];

  return {
    overdueCount: overdue.length,
    todayCount: today.length,
    tomorrowCount: tomorrowEntries.length,
    laterCount: later.length,
    totalCount: entries.length,
    buckets,
  };
}
