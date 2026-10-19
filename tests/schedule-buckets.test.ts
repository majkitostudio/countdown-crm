import { describe, expect, it } from "vitest";
import { buildScheduleBuckets } from "@/lib/scheduleBuckets";
import type { CalendarEntryDTO } from "@/lib/dal/calendar";

describe("buildScheduleBuckets", () => {
  const fixedNow = new Date("2026-10-17T12:00:00.000Z");

  const makeEntry = (id: string, startsAt: string, type: "scheduled_call" | "reminder" = "scheduled_call", status: "scheduled" | "open" | "completed" = "scheduled"): CalendarEntryDTO => ({
    id,
    type,
    title: `Entry ${id}`,
    starts_at: startsAt,
    remind_at: null,
    status,
    lead: { id: `lead-${id}`, full_name: `Lead ${id}`, phone: "+420123456789", email: null },
    reminder: null,
  });

  it("classifies overdue, today, tomorrow, and later items correctly", () => {
    const entries: CalendarEntryDTO[] = [
      makeEntry("past", "2026-10-17T10:00:00.000Z"), // 2 hours ago -> overdue
      makeEntry("today-later", "2026-10-17T15:00:00.000Z"), // today 15:00 -> today
      makeEntry("tomorrow", "2026-10-18T09:00:00.000Z"), // tomorrow -> tomorrow
      makeEntry("future", "2026-10-20T10:00:00.000Z"), // 3 days later -> later
    ];

    const result = buildScheduleBuckets(entries, fixedNow);

    expect(result.overdueCount).toBe(1);
    expect(result.todayCount).toBe(1);
    expect(result.tomorrowCount).toBe(1);
    expect(result.laterCount).toBe(1);
    expect(result.totalCount).toBe(4);

    expect(result.buckets[0].entries[0].id).toBe("past");
    expect(result.buckets[1].entries[0].id).toBe("today-later");
    expect(result.buckets[2].entries[0].id).toBe("tomorrow");
    expect(result.buckets[3].entries[0].id).toBe("future");
  });

  it("handles completed items without marking them as overdue", () => {
    const entries: CalendarEntryDTO[] = [
      makeEntry("completed-past", "2026-10-17T09:00:00.000Z", "reminder", "completed"),
    ];

    const result = buildScheduleBuckets(entries, fixedNow);

    expect(result.overdueCount).toBe(0);
    expect(result.todayCount).toBe(1); // completed today stays in today
  });
});
