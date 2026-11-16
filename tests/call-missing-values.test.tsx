import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), training: vi.fn(), get: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/app/actions/crm", () => ({
  listCallsAction: mocks.list,
  listTrainingCallLogRecordsAction: mocks.training,
  getCallAction: mocks.get,
}));
vi.mock("@/lib/dal/db", () => ({ createDataClient: async () => ({ rpc: mocks.rpc, from: mocks.from }) }));
vi.mock("@/lib/dal/workspace", () => ({ requireWorkspaceContext: async () => ({ workspaceId: "w" }) }));
vi.mock("@/lib/auth/config", () => ({ isDemoAuthEnabled: () => false }));

import { getCallById, getCalls, summarizeCallDurations } from "@/lib/calls";
import { listWorkspaceCallsInContext, listWorkspaceLeadActivity, getWorkspaceCall } from "@/lib/dal/activity";
import { CallDetailDrawer } from "@/components/calls/CallDetailDrawer";

const call = {
  id: "call", lead_id: "lead", lead_name: "Zákazník", agent_id: null,
  agent_name: "Operátor", duration_seconds: null, order_value: null,
  outcome: "completed" as const, fail_reason: null, operator_note: null,
  sentiment: "Neutral", transcript: null, created_at: "2026-01-01",
  review_href: null, review_status: null,
};

describe("missing call values", () => {
  it("preserves missing and zero values in lead activity", async () => {
    mocks.rpc.mockResolvedValue({ data: { calls: [call, { ...call, id: "zero", duration_seconds: 0, order_value: 0 }], orders: [] }, error: null });
    const result = await listWorkspaceLeadActivity("lead");
    expect(result.calls.map(({ duration_seconds, order_value }) => [duration_seconds, order_value])).toEqual([[null, null], [0, 0]]);
  });

  it("does not invent a value in the normal call list or detail", async () => {
    const rows = [{ ...call, lead_id: null, duration_seconds: null }, { ...call, id: "zero", lead_id: null, duration_seconds: 0 }];
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockResolvedValue({ data: rows, error: null });
    mocks.from.mockReturnValue(query);
    const result = await listWorkspaceCallsInContext({ workspaceId: "w" } as Parameters<typeof listWorkspaceCallsInContext>[0]);
    expect(result.map(({ duration_seconds, order_value }) => [duration_seconds, order_value])).toEqual([[null, null], [0, null]]);
    expect((await getWorkspaceCall("call"))?.order_value).toBeNull();
  });

  it("keeps missing and zero values through call list and detail", async () => {
    mocks.list.mockResolvedValue([call, { ...call, id: "zero", duration_seconds: 0, order_value: 0 }]);
    mocks.training.mockResolvedValue([]);
    mocks.get.mockResolvedValue(call);
    const records = await getCalls();
    expect(records.map(({ duration_seconds, order_value }) => [duration_seconds, order_value])).toEqual([[null, null], [0, 0]]);
    expect((await getCallById("call"))?.duration_seconds).toBeNull();
    const missingHtml = renderToStaticMarkup(<CallDetailDrawer call={records[0]} isOpen onClose={() => {}} />);
    const zeroHtml = renderToStaticMarkup(<CallDetailDrawer call={records[1]} isOpen onClose={() => {}} />);
    expect(missingHtml.match(/—/g)).toHaveLength(2);
    expect(zeroHtml).toContain("0 s");
    expect(zeroHtml).toContain("0,00 CZK");
  });

  it("averages only recorded durations, including real zero", () => {
    expect(summarizeCallDurations([{ duration_seconds: null }, { duration_seconds: 0 }, { duration_seconds: 60 }])).toEqual({ average: 30, recordedCount: 2 });
    expect(summarizeCallDurations([{ duration_seconds: null }])).toEqual({ average: null, recordedCount: 0 });
  });
});
