import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  submitTrainingTurnAction: vi.fn(),
  saveTrainingSessionAction: vi.fn(),
  getTrainingSessionReviews: vi.fn(),
  getTrainingSessionReview: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/app/actions/training", () => ({
  submitTrainingTurnAction: mocks.submitTrainingTurnAction,
}));

vi.mock("@/app/actions/trainingSession", () => ({
  saveTrainingSessionAction: mocks.saveTrainingSessionAction,
}));

vi.mock("@/lib/dal/trainingSessions", () => ({
  getTrainingSessionReviews: mocks.getTrainingSessionReviews,
  getTrainingSessionReview: mocks.getTrainingSessionReview,
}));

vi.mock("@/lib/dal/errors", () => ({
  isDataAccessError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "code" in error),
}));

import { POST as postTurn } from "@/app/api/training/turn/route";
import { POST as postSession } from "@/app/api/training/session/route";
import { GET as getReviews } from "@/app/api/training/reviews/route";
import { GET as getReview } from "@/app/api/training/reviews/[sessionId]/route";

const validSessionId = "11111111-1111-4111-8111-111111111111";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/training", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function responseBody(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAuthenticatedUser.mockResolvedValue(undefined);
});

describe("POST /api/training/turn", () => {
  it("returns 401 when the request is unauthenticated", async () => {
    mocks.requireAuthenticatedUser.mockRejectedValue(new Error("Unauthorized"));

    const response = await postTurn(jsonRequest({}));

    expect(response.status).toBe(401);
    await expect(responseBody(response)).resolves.toMatchObject({
      ok: false,
      code: "UNAUTHORIZED",
    });
    expect(mocks.submitTrainingTurnAction).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON without invoking the action", async () => {
    const request = new Request("http://localhost/api/training/turn", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid",
    });

    const response = await postTurn(request);

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toMatchObject({
      ok: false,
      code: "VALIDATION",
    });
    expect(mocks.submitTrainingTurnAction).not.toHaveBeenCalled();
  });

  it("maps action validation to 400", async () => {
    mocks.submitTrainingTurnAction.mockResolvedValue({
      ok: false,
      code: "VALIDATION",
      message: "Training turn data is invalid.",
    });

    const response = await postTurn(jsonRequest({ scenarioId: "invalid" }));

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toMatchObject({
      ok: false,
      code: "VALIDATION",
      message: "Training turn data is invalid.",
    });
  });

  it("returns the canonical action result with status 200", async () => {
    const result = {
      ok: true,
      operatorTurn: { sequenceNumber: 0, text: "Dobrý den", source: "typed", confidence: null },
      customerTurn: {
        sequenceNumber: 1,
        text: "Dobrý den, poslouchám.",
        sentiment: "neutral",
        customerMood: "Skeptický",
        patienceDelta: 0,
        aiSource: "rule-engine",
      },
    };
    mocks.submitTrainingTurnAction.mockResolvedValue(result);

    const response = await postTurn(jsonRequest({ scenarioId: "supplements-skeptic" }));

    expect(response.status).toBe(200);
    await expect(responseBody(response)).resolves.toEqual(result);
  });

  it("maps provider and unexpected action failures to 503", async () => {
    mocks.submitTrainingTurnAction.mockResolvedValue({
      ok: false,
      code: "PROVIDER",
      message: "Training customer response is unavailable.",
    });

    const providerResponse = await postTurn(jsonRequest({ scenarioId: "supplements-skeptic" }));
    expect(providerResponse.status).toBe(503);

    mocks.submitTrainingTurnAction.mockRejectedValue(new Error("database unavailable"));
    const unexpectedResponse = await postTurn(jsonRequest({ scenarioId: "supplements-skeptic" }));
    expect(unexpectedResponse.status).toBe(503);
    await expect(responseBody(unexpectedResponse)).resolves.toMatchObject({
      ok: false,
      code: "UNAVAILABLE",
    });
  });
});

describe("POST /api/training/session", () => {
  it("returns 401 before attempting completion persistence", async () => {
    mocks.requireAuthenticatedUser.mockRejectedValue(new Error("Unauthorized"));

    const response = await postSession(jsonRequest({}));

    expect(response.status).toBe(401);
    expect(mocks.saveTrainingSessionAction).not.toHaveBeenCalled();
  });

  it("maps validation to 400 and does not turn it into a database error", async () => {
    mocks.saveTrainingSessionAction.mockResolvedValue({
      ok: false,
      code: "VALIDATION",
      message: "Training transcript data is invalid.",
    });

    const response = await postSession(jsonRequest({ messages: [] }));

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toMatchObject({ code: "VALIDATION" });
  });

  it("returns 201 and the persisted session id on completion", async () => {
    mocks.saveTrainingSessionAction.mockResolvedValue({ ok: true, sessionId: validSessionId });

    const response = await postSession(jsonRequest({ messages: ["completed"] }));

    expect(response.status).toBe(201);
    await expect(responseBody(response)).resolves.toEqual({ ok: true, sessionId: validSessionId });
  });

  it("maps unavailable and database results to 503", async () => {
    mocks.saveTrainingSessionAction.mockResolvedValue({
      ok: false,
      code: "DATABASE",
      message: "Training transcript could not be saved.",
    });

    const response = await postSession(jsonRequest({ messages: ["completed"] }));

    expect(response.status).toBe(503);
    await expect(responseBody(response)).resolves.toMatchObject({ code: "DATABASE" });
  });
});

describe("GET /api/training/reviews", () => {
  it("returns 401 before reading workspace reviews", async () => {
    mocks.requireAuthenticatedUser.mockRejectedValue(new Error("Unauthorized"));

    const response = await getReviews();

    expect(response.status).toBe(401);
    expect(mocks.getTrainingSessionReviews).not.toHaveBeenCalled();
  });

  it("preserves the manager/admin authorization boundary as 403", async () => {
    mocks.getTrainingSessionReviews.mockRejectedValue({
      code: "FORBIDDEN",
      message: "Training reviews are available to Team Leaders and Administrators only.",
    });

    const response = await getReviews();

    expect(response.status).toBe(403);
    await expect(responseBody(response)).resolves.toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
  });

  it("returns workspace-scoped sessions with status 200", async () => {
    const sessions = [{ id: validSessionId, scenarioTitle: "Skeptical supplement customer" }];
    mocks.getTrainingSessionReviews.mockResolvedValue(sessions);

    const response = await getReviews();

    expect(response.status).toBe(200);
    await expect(responseBody(response)).resolves.toEqual({ ok: true, sessions });
  });
});

describe("GET /api/training/reviews/[sessionId]", () => {
  it("rejects an invalid session id with 400", async () => {
    const response = await getReview(new Request("http://localhost"), {
      params: Promise.resolve({ sessionId: "not-a-uuid" }),
    });

    expect(response.status).toBe(400);
    expect(mocks.getTrainingSessionReview).not.toHaveBeenCalled();
  });

  it("returns 404 when the authenticated session is not found", async () => {
    mocks.getTrainingSessionReview.mockResolvedValue(null);

    const response = await getReview(new Request("http://localhost"), {
      params: Promise.resolve({ sessionId: validSessionId }),
    });

    expect(response.status).toBe(404);
    await expect(responseBody(response)).resolves.toMatchObject({
      ok: false,
      code: "NOT_FOUND",
    });
  });

  it("preserves a forbidden detail response as 403", async () => {
    mocks.getTrainingSessionReview.mockRejectedValue({ code: "FORBIDDEN" });

    const response = await getReview(new Request("http://localhost"), {
      params: Promise.resolve({ sessionId: validSessionId }),
    });

    expect(response.status).toBe(403);
    await expect(responseBody(response)).resolves.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns the review detail with status 200", async () => {
    const session = { id: validSessionId, turns: [{ sequenceNumber: 0, text: "Dobrý den" }] };
    mocks.getTrainingSessionReview.mockResolvedValue(session);

    const response = await getReview(new Request("http://localhost"), {
      params: Promise.resolve({ sessionId: validSessionId }),
    });

    expect(response.status).toBe(200);
    await expect(responseBody(response)).resolves.toEqual({ ok: true, session });
  });
});
