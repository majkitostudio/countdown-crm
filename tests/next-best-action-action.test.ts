import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/dal/errors";
import { listScheduledCallbacksForWorkspace } from "@/lib/dal/leadQueue";
import { getReorderOpportunities } from "@/lib/reorder";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/leadQueue", () => ({
  listScheduledCallbacksForWorkspace: vi.fn(),
}));
vi.mock("@/lib/reorder", () => ({
  getReorderOpportunities: vi.fn(),
}));

import { loadNextBestActionAction } from "@/app/actions/nextBestAction";

const mockedCallbacks = vi.mocked(listScheduledCallbacksForWorkspace);
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

function dueCallback() {
  return {
    id: "callback-1",
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
    mockedCallbacks.mockResolvedValue([]);
    mockedReorders.mockResolvedValue([]);
  });

  it("keeps an urgent reorder as partial when callbacks fail operationally", async () => {
    mockedCallbacks.mockRejectedValue(new DataAccessError("DATABASE", "Scheduled callbacks could not be loaded."));
    mockedReorders.mockResolvedValue([reorder]);

    await expect(loadNextBestActionAction()).resolves.toEqual({
      status: "partial",
      action: expect.objectContaining({ kind: "reorder", source_id: "reorder-1" }),
      unavailableSources: ["callbacks"],
      message: "Scheduled callbacks could not be loaded.",
    });
  });

  it("keeps a due callback as partial when reorder estimates fail operationally", async () => {
    mockedCallbacks.mockResolvedValue([dueCallback()]);
    mockedReorders.mockRejectedValue(new DataAccessError("DATABASE", "Re-order estimates could not be loaded."));

    await expect(loadNextBestActionAction()).resolves.toEqual({
      status: "partial",
      action: expect.objectContaining({ kind: "callback", source_id: "callback-1" }),
      unavailableSources: ["reorders"],
      message: "Re-order estimates could not be loaded.",
    });
  });

  it.each(["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "VALIDATION", "CONFLICT"] as const)(
    "rethrows a %s callback failure instead of downgrading it",
    async (code) => {
      mockedCallbacks.mockRejectedValue(new DataAccessError(code, `${code} callback failure`));

      await expect(loadNextBestActionAction()).rejects.toMatchObject({ code });
    },
  );

  it("rethrows unknown failures instead of presenting partial data", async () => {
    const failure = new Error("Unexpected callback failure");
    mockedCallbacks.mockRejectedValue(failure);

    await expect(loadNextBestActionAction()).rejects.toBe(failure);
  });
});
