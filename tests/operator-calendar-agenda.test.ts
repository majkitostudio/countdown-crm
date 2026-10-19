import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { OperatorCalendar } from "@/components/calendar/OperatorCalendar";
import type { CalendarLoadResult } from "@/lib/dal/calendar";

describe("OperatorCalendar component rendering", () => {
  const mockCalendar: CalendarLoadResult = {
    entries: [
      {
        id: "call-1",
        type: "scheduled_call",
        title: "Schedule: Jan Novák",
        starts_at: new Date(Date.now() - 3600 * 1000).toISOString(), // 1 hour ago -> overdue
        remind_at: null,
        status: "scheduled",
        lead: { id: "lead-1", full_name: "Jan Novák", phone: "+420777123456", email: null },
        reminder: null,
      },
      {
        id: "reminder-1",
        type: "reminder",
        title: "Ověřit platbu",
        starts_at: new Date(Date.now() + 3600 * 1000).toISOString(), // today
        remind_at: null,
        status: "open",
        lead: null,
        reminder: {
          id: "rem-1",
          workspace_id: "ws-1",
          owner_id: "op-1",
          lead_id: null,
          title: "Ověřit platbu",
          note: "Zavolat do účtárny",
          due_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          remind_at: new Date(Date.now() + 1800 * 1000).toISOString(),
          status: "open",
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          lead: null,
        },
      },
    ],
    sources: {
      scheduledCalls: { state: "available" },
      reminders: { state: "available" },
    },
  };

  it("renders metric cards and bucket sections", () => {
    const html = renderToStaticMarkup(
      React.createElement(OperatorCalendar, { initialCalendar: mockCalendar })
    );

    // Metriky
    expect(html).toContain("Po termínu");
    expect(html).toContain("Dnes");
    expect(html).toContain("Zítra");
    expect(html).toContain("Později");

    // Zákazník a akce
    expect(html).toContain("Jan Novák");
    expect(html).toContain("+420777123456");
    expect(html).toContain("Call now");
    expect(html).toContain("/console?leadId=lead-1");

    // Připomínka a poznámka
    expect(html).toContain("Ověřit platbu");
    expect(html).toContain("Zavolat do účtárny");
    expect(html).toContain("Hotovo");
  });

  it("renders empty state notice when entries are empty", () => {
    const emptyCalendar: CalendarLoadResult = {
      entries: [],
      sources: {
        scheduledCalls: { state: "available" },
        reminders: { state: "available" },
      },
    };

    const html = renderToStaticMarkup(
      React.createElement(OperatorCalendar, { initialCalendar: emptyCalendar })
    );

    expect(html).toContain("Žádné naplánované hovory ani úkoly");
  });
});
