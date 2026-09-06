import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceContext: vi.fn(),
  listWorkspaceCallsInContext: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/dal/workspace")>(),
  requireWorkspaceContext: mocks.requireWorkspaceContext,
}));
vi.mock("@/lib/dal/activity", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/dal/activity")>(),
  listWorkspaceCallsInContext: mocks.listWorkspaceCallsInContext,
}));

import { listCallsAction } from "@/app/actions/crm";
import { CallDetailDrawer } from "@/components/calls/CallDetailDrawer";
import type { CallRecord } from "@/lib/calls";

const workspaceCall = {
  id: "call-1",
  lead_id: "lead-1",
  lead_name: "Customer One",
  agent_id: "operator-1",
  agent_name: "Olivia Operator",
  duration_seconds: 125,
  outcome: "objection" as const,
  fail_reason: "price" as const,
  operator_note: "Too expensive.",
  sentiment: "Neutral",
  order_value: 0,
  transcript: null,
  created_at: "2026-09-07T10:00:00.000Z",
};

const callRecord: CallRecord = {
  ...workspaceCall,
  sentiment: "Neutral",
  transcript: { kind: "unavailable" },
  review_href: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listWorkspaceCallsInContext.mockResolvedValue([workspaceCall]);
});

describe("Calls review entry authorization", () => {
  it.each(["team_leader", "administrator"] as const)("supplies an exact review URL to a %s", async (role) => {
    mocks.requireWorkspaceContext.mockResolvedValue({ userId: "manager-1", workspaceId: "workspace-1", role });

    await expect(listCallsAction()).resolves.toEqual([
      expect.objectContaining({ id: "call-1", review_href: "/calls/call-1/review" }),
    ]);
  });

  it("supplies no review URL to an operator", async () => {
    mocks.requireWorkspaceContext.mockResolvedValue({ userId: "operator-1", workspaceId: "workspace-1", role: "operator" });

    await expect(listCallsAction()).resolves.toEqual([
      expect.objectContaining({ id: "call-1", review_href: null }),
    ]);
  });

  it("renders only a server-supplied review URL", () => {
    const managerHtml = renderToStaticMarkup(React.createElement(CallDetailDrawer, {
      call: { ...callRecord, review_href: "/calls/call-1/review" },
      reviewHref: "/calls/call-1/review",
      isOpen: true,
      onClose: vi.fn(),
    }));
    const operatorHtml = renderToStaticMarkup(React.createElement(CallDetailDrawer, {
      call: callRecord,
      reviewHref: null,
      isOpen: true,
      onClose: vi.fn(),
    }));

    expect(managerHtml).toContain("Open Team Leader Review");
    expect(managerHtml).toContain('/calls/call-1/review');
    expect(operatorHtml).not.toContain("Open Team Leader Review");
    expect(operatorHtml).not.toContain('/calls/call-1/review');
  });
});
