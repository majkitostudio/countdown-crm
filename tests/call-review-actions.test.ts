import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCallReview: vi.fn(),
  recordCallReview: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/dal/callReviews", () => ({
  getCallReview: mocks.getCallReview,
  recordCallReview: mocks.recordCallReview,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { getCallReviewAction, recordCallReviewAction } from "@/app/actions/callReviews";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("call review server actions", () => {
  it("delegates the manager-only review read", async () => {
    const review = { call: { id: "call-1" } };
    mocks.getCallReview.mockResolvedValue(review);

    await expect(getCallReviewAction("call-1")).resolves.toBe(review);
    expect(mocks.getCallReview).toHaveBeenCalledWith("call-1");
  });

  it("records a revision and refreshes every affected manager view", async () => {
    const input = {
      callId: "call-1",
      expectedRevision: 0,
      verdict: "Needs coaching",
      coachingNote: "Confirm understanding before closing.",
      correctionReason: null,
    };
    const revision = { id: "revision-1", callId: "call-1", revisionNumber: 1 };
    mocks.recordCallReview.mockResolvedValue(revision);

    await expect(recordCallReviewAction(input)).resolves.toBe(revision);
    expect(mocks.recordCallReview).toHaveBeenCalledWith(input);
    expect(mocks.revalidatePath.mock.calls).toEqual([
      ["/calls/call-1/review"],
      ["/exceptions"],
      ["/audit"],
    ]);
  });
});
