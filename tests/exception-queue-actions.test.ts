import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listTeamLeaderExceptions: vi.fn(),
  resolveException: vi.fn(),
  snoozeException: vi.fn(),
}));

vi.mock("@/lib/dal/exceptionQueue", () => mocks);

import {
  listTeamLeaderExceptionsAction,
  resolveExceptionAction,
  snoozeExceptionAction,
} from "@/app/actions/exceptionQueue";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Exception Queue Server Actions", () => {
  it("keeps reads and mutations behind the server DAL boundary", async () => {
    mocks.listTeamLeaderExceptions.mockResolvedValue({ items: [], history: [], sources: {} });
    mocks.resolveException.mockResolvedValue({ exception_key: "queue:expired_lease:item-1" });
    mocks.snoozeException.mockResolvedValue({ exception_key: "queue:expired_lease:item-1" });

    await listTeamLeaderExceptionsAction();
    await resolveExceptionAction("queue:expired_lease:item-1", "Checked and released.");
    await snoozeExceptionAction("queue:expired_lease:item-1", "2026-09-07T10:00:00.000Z", "Waiting for operator reply.");

    expect(mocks.listTeamLeaderExceptions).toHaveBeenCalledOnce();
    expect(mocks.resolveException).toHaveBeenCalledWith("queue:expired_lease:item-1", "Checked and released.");
    expect(mocks.snoozeException).toHaveBeenCalledWith(
      "queue:expired_lease:item-1",
      "2026-09-07T10:00:00.000Z",
      "Waiting for operator reply.",
    );
  });
});
