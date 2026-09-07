import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/exceptionQueue", () => ({
  listTeamLeaderExceptionsAction: vi.fn(),
  resolveExceptionAction: vi.fn(),
  snoozeExceptionAction: vi.fn(),
}));

import { ExceptionQueue } from "@/components/exceptions/ExceptionQueue";
import type { ExceptionQueueDTO } from "@/lib/dal/exceptionQueue";

const data: ExceptionQueueDTO = {
  items: [{
    id: "queue:outcome_recovery:11111111-1111-4111-8111-111111111111",
    type: "outcome_recovery",
    priority: "critical",
    reason: "The call ended without a completed outcome and needs a manager check.",
    owner: { id: "operator-1", name: "Jan Operator" },
    target: { kind: "lead", id: "lead-1", label: "Jana Nováková" },
    source: { table: "lead_queue_items", id: "11111111-1111-4111-8111-111111111111" },
    occurred_at: "2026-09-06T09:00:00.000Z",
    due_at: "2026-09-06T09:30:00.000Z",
    next_action: { label: "Open queue operations", href: "/team" },
    callReview: { kind: "linked", callId: "call-1", href: "/calls/call-1/review" },
  }],
  history: [],
  sources: {
    queue: { state: "available" },
    workflows: { state: "unavailable", message: "Workflow failure checks could not be loaded." },
    scripts: { state: "available" },
    actions: { state: "available" },
    callReviews: { state: "available" },
  },
};

describe("Exception Queue UI", () => {
  it("shows the real problem, owner, next action and manager controls", () => {
    const html = renderToStaticMarkup(React.createElement(ExceptionQueue, { initialData: data }));

    expect(html).toContain("Exception Queue");
    expect(html).toContain("Outcome recovery");
    expect(html).toContain("Jana Nováková");
    expect(html).toContain("Jan Operator");
    expect(html).toContain("Critical");
    expect(html).toContain("Open queue operations");
    expect(html).toContain("Open call review");
    expect(html).toContain('/calls/call-1/review');
    expect(html).toContain("Mark handled");
    expect(html).toContain("Snooze");
    expect(html).toContain("Workflow failure checks could not be loaded.");
    expect(html).not.toMatch(/AI recommendation|predicted issue|generated alert/i);
  });

  it("states when the exact call link was not recorded", () => {
    const html = renderToStaticMarkup(React.createElement(ExceptionQueue, {
      initialData: {
        ...data,
        items: [{ ...data.items[0], callReview: { kind: "not_recorded" } }],
      },
    }));

    expect(html).toContain("Exact call was not recorded for this exception");
    expect(html).not.toContain("Open call review");
  });
});
