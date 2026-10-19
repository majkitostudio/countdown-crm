import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/dal/errors";
import { listScheduledCallsForWorkspace } from "@/lib/dal/leadQueue";
import { getReorderOpportunities } from "@/lib/reorder";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/leadQueue", () => ({
  listScheduledCallsForWorkspace: vi.fn(),
}));
vi.mock("@/lib/reorder", () => ({
  getReorderOpportunities: vi.fn(),
}));

import { loadNextBestActionAction } from "@/app/actions/nextBestAction";

const mockedScheduledCalls = vi.mocked(listScheduledCallsForWorkspace);
const mockedReorders = vi.mocked(getReorderOpportunities);

const reorder = {
  id: "reorder-1",
  lead_id: "lead-2",
  lead_name: "Petr Svoboda",
  lead_phone: "+420222222222",
  product_id: "product-1",
  product_title: "Test product",
  product_category: "supplements",
  last_order_date: "2026-08-01T10:00:00.000Z",
  estimated_depletion_date: "2026-08-31T10:00:00.000Z",
  days_remaining: 1,
  urgency: "urgent" as const,
};

function dueScheduledCall() {
  return {
    id: "scheduled-call-1",
    workspace_id: "workspace-1",
    lead_id: "lead-1",
    scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    preferred_operator_id: "operator-1",
    lead: {
      id: "lead-1",
      full_name: "Jana Nováková",
      phone: "+420111111111",
      email: null,
    },
    preferred_operator: null,
  };
}

describe("next best action server boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedScheduledCalls.mockResolvedValue([]);
    mockedReorders.mockResolvedValue([]);
  });

  it("keeps an urgent reorder as partial when scheduled calls fail operationally", async () => {
    mockedScheduledCalls.mockRejectedValue(new DataAccessError("DATABASE", "Scheduled calls could not be loaded."));
    mockedReorders.mockResolvedValue([reorder]);

    await expect(loadNextBestActionAction()).resolves.toEqual({
      status: "partial",
      action: expect.objectContaining({ kind: "reorder", source_id: "reorder-1" }),
      unavailableSources: ["scheduledCalls"],
      message: "Scheduled calls could not be loaded.",
    });
  });

  it("keeps a due scheduled call as partial when reorder estimates fail operationally", async () => {
    mockedScheduledCalls.mockResolvedValue([dueScheduledCall()]);
    mockedReorders.mockRejectedValue(new DataAccessError("DATABASE", "Re-order estimates could not be loaded."));

    await expect(loadNextBestActionAction()).resolves.toEqual({
      status: "partial",
      action: expect.objectContaining({ kind: "scheduled_call", source_id: "scheduled-call-1" }),
      unavailableSources: ["reorders"],
      message: "Re-order estimates could not be loaded.",
    });
  });

  it.each(["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "VALIDATION", "CONFLICT"] as const)(
    "rethrows a %s scheduled call failure instead of downgrading it",
    async (code) => {
      mockedScheduledCalls.mockRejectedValue(new DataAccessError(code, `${code} scheduled call failure`));

      await expect(loadNextBestActionAction()).rejects.toMatchObject({ code });
    },
  );

  it("rethrows unknown failures instead of presenting partial data", async () => {
    const failure = new Error("Unexpected scheduled call failure");
    mockedScheduledCalls.mockRejectedValue(failure);

    await expect(loadNextBestActionAction()).rejects.toBe(failure);
  });
});
