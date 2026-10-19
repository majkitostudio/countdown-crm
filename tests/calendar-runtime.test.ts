import { describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/dal/errors";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/leadQueue", () => ({
  listScheduledCallsForWorkspace: vi.fn(),
}));
vi.mock("@/lib/dal/operatorReminders", () => ({
  listOperatorRemindersForWorkspace: vi.fn(),
}));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceContext: vi.fn(),
}));

import { buildCalendarLoadResult, type CalendarEntryDTO } from "@/lib/dal/calendar";

const scheduledCallEntry = {
  id: "scheduled-call-1",
  workspace_id: "workspace-1",
  lead_id: "lead-1",
  scheduled_at: "2026-09-04T09:00:00.000Z",
  preferred_operator_id: "operator-1",
  lead: {
    id: "lead-1",
    full_name: "Scheduled Call Lead",
    phone: "+420111111111",
    email: "scheduled.call@example.com",
  },
  preferred_operator: null,
};

const reminderEntry = {
  id: "reminder-1",
  workspace_id: "workspace-1",
  owner_id: "operator-1",
  lead_id: "lead-2",
  title: "Check payment",
  note: null,
  due_at: "2026-09-04T08:30:00.000Z",
  remind_at: "2026-09-04T08:15:00.000Z",
  status: "open" as const,
  completed_at: null,
  created_at: "2026-09-04T08:00:00.000Z",
  updated_at: "2026-09-04T08:00:00.000Z",
  lead: {
    id: "lead-2",
    full_name: "Reminder Lead",
    phone: "+420222222222",
  },
};

function getEntryTypes(entries: CalendarEntryDTO[]): Array<CalendarEntryDTO["type"]> {
  return entries.map((entry) => entry.type);
}

describe("calendar runtime partial-failure contract", () => {
  it("keeps scheduled call entries when reminders fail", () => {
    const result = buildCalendarLoadResult(
      { status: "fulfilled", value: [scheduledCallEntry] },
      {
        status: "rejected",
        reason: new DataAccessError("DATABASE", "Operator reminders could not be loaded."),
      },
    );

    expect(result.entries).toEqual([expect.objectContaining({ type: "scheduled_call" })]);
    expect(result.sources.scheduledCalls).toEqual({ state: "available" });
    expect(result.sources.reminders).toEqual({
      state: "unavailable",
      message: "Operator reminders could not be loaded.",
    });
  });

  it("keeps reminder entries when scheduled calls fail", () => {
    const result = buildCalendarLoadResult(
      {
        status: "rejected",
        reason: new DataAccessError("DATABASE", "Scheduled calls could not be loaded."),
      },
      { status: "fulfilled", value: [reminderEntry] },
    );

    expect(result.entries).toEqual([expect.objectContaining({ type: "reminder" })]);
    expect(result.sources.scheduledCalls).toEqual({
      state: "unavailable",
      message: "Scheduled calls could not be loaded.",
    });
    expect(result.sources.reminders).toEqual({ state: "available" });
  });

  it("reports both sources unavailable without fabricating empty data", () => {
    const result = buildCalendarLoadResult(
      {
        status: "rejected",
        reason: new DataAccessError("DATABASE", "Scheduled calls could not be loaded."),
      },
      {
        status: "rejected",
        reason: new DataAccessError("DATABASE", "Operator reminders could not be loaded."),
      },
    );

    expect(result.entries).toEqual([]);
    expect(result.sources).toEqual({
      scheduledCalls: {
        state: "unavailable",
        message: "Scheduled calls could not be loaded.",
      },
      reminders: {
        state: "unavailable",
        message: "Operator reminders could not be loaded.",
      },
    });
  });

  it("sorts successful entries across both sources by starts_at", () => {
    const result = buildCalendarLoadResult(
      { status: "fulfilled", value: [scheduledCallEntry] },
      { status: "fulfilled", value: [reminderEntry] },
    );

    expect(getEntryTypes(result.entries)).toEqual(["reminder", "scheduled_call"]);
    expect(result.entries.map((entry) => entry.starts_at)).toEqual([
      "2026-09-04T08:30:00.000Z",
      "2026-09-04T09:00:00.000Z",
    ]);
  });

  it("uses a safe fallback message for unknown source rejections", () => {
    const result = buildCalendarLoadResult(
      { status: "fulfilled", value: [scheduledCallEntry] },
      { status: "rejected", reason: new Error("socket hang up") },
    );

    expect(result.entries).toEqual([expect.objectContaining({ type: "scheduled_call" })]);
    expect(result.sources.reminders).toEqual({
      state: "unavailable",
      message: "Calendar source could not be loaded.",
    });
  });

  it("rethrows non-database DataAccessError values instead of downgrading them to partial unavailable", () => {
    expect(() => buildCalendarLoadResult(
      {
        status: "rejected",
        reason: new DataAccessError("FORBIDDEN", "Insufficient workspace permissions"),
      },
      { status: "fulfilled", value: [reminderEntry] },
    )).toThrowError(
      expect.objectContaining({
        code: "FORBIDDEN",
        message: "Insufficient workspace permissions",
      }),
    );
  });
});
