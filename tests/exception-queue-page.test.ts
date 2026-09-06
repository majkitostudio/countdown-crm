import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/dal/errors";

const mocks = vi.hoisted(() => ({
  listTeamLeaderExceptions: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/exceptionQueue", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/dal/exceptionQueue")>()),
  listTeamLeaderExceptions: mocks.listTeamLeaderExceptions,
}));

import ExceptionsPage from "@/app/exceptions/page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Exception Queue page", () => {
  it("renders the manager queue returned by the authorized DAL", async () => {
    mocks.listTeamLeaderExceptions.mockResolvedValue({
      items: [],
      history: [],
      sources: {
        queue: { state: "available" },
        workflows: { state: "available" },
        scripts: { state: "available" },
        actions: { state: "available" },
        callReviews: { state: "available" },
      },
    });

    const html = renderToStaticMarkup(await ExceptionsPage());

    expect(html).toContain("Team Leader Exception Queue");
    expect(html).toContain("Nothing needs attention");
  });

  it("shows a truthful forbidden state when an operator opens the URL directly", async () => {
    mocks.listTeamLeaderExceptions.mockRejectedValue(
      new DataAccessError("FORBIDDEN", "Insufficient workspace permissions"),
    );

    const html = renderToStaticMarkup(await ExceptionsPage());

    expect(html).toContain("Exception Queue unavailable");
    expect(html).toContain("Team Leaders and Administrators only");
    expect(html).not.toContain("Nothing needs attention");
  });
});
