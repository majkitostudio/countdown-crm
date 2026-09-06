import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireWorkspaceRole: vi.fn(),
  createDataClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceRole: mocks.requireWorkspaceRole,
}));
vi.mock("@/lib/dal/db", () => ({
  createDataClient: mocks.createDataClient,
}));

import { DataAccessError } from "@/lib/dal/errors";
import { getCallReview, recordCallReview } from "@/lib/dal/callReviews";

const context = {
  userId: "manager-1",
  workspaceId: "workspace-1",
  role: "team_leader" as const,
};

const call = {
  id: "call-1",
  workspace_id: context.workspaceId,
  lead_id: "lead-1",
  agent_id: "operator-1",
  duration_seconds: 125,
  outcome: "objection",
  fail_reason: "price",
  operator_note: "Customer found the offer expensive.",
  callback_scheduled_at: null,
  transcript: "Legacy transcript text",
  created_at: "2026-09-07T10:00:00.000Z",
};

function maybeSingleQuery(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

function orderedQuery(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn().mockResolvedValue({ data, error }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

function profilesQuery(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(),
    in: vi.fn().mockResolvedValue({ data, error }),
  };
  query.select.mockReturnValue(query);
  return query;
}

function readClient(options: {
  call?: unknown;
  session?: unknown;
  revisions?: unknown[];
  profiles?: unknown[];
  lead?: unknown;
  transcript?: string | null;
} = {}) {
  const transcript = Object.prototype.hasOwnProperty.call(options, "transcript")
    ? options.transcript
    : call.transcript;
  const callQuery = maybeSingleQuery({ ...call, transcript, ...(options.call as object || {}) });
  const sessionQuery = maybeSingleQuery(options.session ?? null);
  const revisionsQuery = orderedQuery(options.revisions ?? []);
  const profileQuery = profilesQuery(options.profiles ?? [
    { id: "operator-1", full_name: "Olivia Operator" },
  ]);
  const leadQuery = maybeSingleQuery(options.lead ?? { id: "lead-1", full_name: "Customer One" });
  const client = {
    from: vi.fn((table: string) => {
      if (table === "calls") return callQuery;
      if (table === "telephony_call_sessions") return sessionQuery;
      if (table === "call_review_revisions") return revisionsQuery;
      if (table === "profiles") return profileQuery;
      if (table === "leads") return leadQuery;
      throw new Error(`Unexpected table ${table}`);
    }),
  };
  return { client, callQuery, sessionQuery, revisionsQuery };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireWorkspaceRole.mockResolvedValue(context);
});

describe("getCallReview", () => {
  it("checks the manager role before querying call evidence", async () => {
    mocks.requireWorkspaceRole.mockRejectedValue(new DataAccessError("FORBIDDEN", "Managers only"));

    await expect(getCallReview("call-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(["team_leader", "administrator"]);
    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });

  it("returns legacy source and script states without guessing", async () => {
    const harness = readClient();
    mocks.createDataClient.mockResolvedValue(harness.client);

    const review = await getCallReview("call-1");

    expect(harness.callQuery.eq).toHaveBeenCalledWith("workspace_id", context.workspaceId);
    expect(review.callSource).toBe("not_recorded");
    expect(review.script).toEqual({ kind: "not_recorded" });
    expect(review.transcript).toEqual({ kind: "plain_text", text: "Legacy transcript text" });
    expect(review.operator).toEqual({ id: "operator-1", name: "Olivia Operator" });
    expect(review.customer).toEqual({ id: "lead-1", name: "Customer One" });
  });

  it.each([
    [JSON.stringify([{ speaker: "operator", text: "Hello", timestamp: "00:01" }]), "structured"],
    ["Plain legacy words", "plain_text"],
    [null, "unavailable"],
  ])("preserves transcript evidence as %s", async (transcript, expectedKind) => {
    const harness = readClient({ transcript });
    mocks.createDataClient.mockResolvedValue(harness.client);

    const review = await getCallReview("call-1");

    expect(review.transcript.kind).toBe(expectedKind);
  });

  it("maps an exact published script snapshot and ordered immutable revisions", async () => {
    const harness = readClient({
      session: {
        provider: "telnyx",
        script_source: "published_version",
        script_product_id: "product-1",
        script_product_title: "Joint Support",
        script_version_id: "version-7",
        script_version_number: 7,
        script_snapshot_html: "<p>Approved v7</p>",
        script_captured_at: "2026-09-07T09:59:00.000Z",
      },
      revisions: [
        { id: "revision-1", revision_number: 1, verdict: "Needs coaching", coaching_note: "Slow down.", correction_reason: null, reviewer_id: "manager-1", supersedes_revision_id: null, created_at: "2026-09-07T11:00:00.000Z" },
        { id: "revision-2", revision_number: 2, verdict: "Acceptable", coaching_note: "Better on review.", correction_reason: "Transcript clarified the close.", reviewer_id: "admin-1", supersedes_revision_id: "revision-1", created_at: "2026-09-07T12:00:00.000Z" },
      ],
      profiles: [
        { id: "operator-1", full_name: "Olivia Operator" },
        { id: "manager-1", full_name: "Tara Team Leader" },
        { id: "admin-1", full_name: "Adam Admin" },
      ],
    });
    mocks.createDataClient.mockResolvedValue(harness.client);

    const review = await getCallReview("call-1");

    expect(harness.sessionQuery.eq).toHaveBeenCalledWith("completed_call_id", "call-1");
    expect(harness.sessionQuery.eq).toHaveBeenCalledWith("workspace_id", context.workspaceId);
    expect(harness.revisionsQuery.eq).toHaveBeenCalledWith("workspace_id", context.workspaceId);
    expect(harness.revisionsQuery.order).toHaveBeenCalledWith("revision_number", { ascending: true });
    expect(review.callSource).toBe("telnyx");
    expect(review.script).toEqual({
      kind: "published_version",
      productId: "product-1",
      productTitle: "Joint Support",
      versionId: "version-7",
      versionNumber: 7,
      html: "<p>Approved v7</p>",
      capturedAt: "2026-09-07T09:59:00.000Z",
    });
    expect(review.revisions.map((revision) => [revision.revisionNumber, revision.reviewer?.name])).toEqual([
      [1, "Tara Team Leader"],
      [2, "Adam Admin"],
    ]);
  });
});

describe("recordCallReview", () => {
  it("checks the manager role before validating or writing", async () => {
    mocks.requireWorkspaceRole.mockRejectedValue(new DataAccessError("FORBIDDEN", "Managers only"));

    await expect(recordCallReview({
      callId: "",
      expectedRevision: -1,
      verdict: "",
      coachingNote: "",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });

  it("requires a correction reason when correcting an existing review", async () => {
    await expect(recordCallReview({
      callId: "call-1",
      expectedRevision: 1,
      verdict: "Acceptable",
      coachingNote: "Keep the close concise.",
      correctionReason: "",
    })).rejects.toMatchObject({ code: "VALIDATION" });
    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });

  it("forwards the exact expected revision and maps the inserted row", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "revision-2",
        call_id: "call-1",
        revision_number: 2,
        verdict: "Acceptable",
        coaching_note: "Keep the close concise.",
        correction_reason: "Rechecked the transcript.",
        reviewer_id: "manager-1",
        supersedes_revision_id: "revision-1",
        created_at: "2026-09-07T12:00:00.000Z",
      },
      error: null,
    });
    const rpc = vi.fn().mockReturnValue({ single });
    mocks.createDataClient.mockResolvedValue({ rpc });

    const revision = await recordCallReview({
      callId: "call-1",
      expectedRevision: 1,
      verdict: "  Acceptable  ",
      coachingNote: "  Keep the close concise.  ",
      correctionReason: "  Rechecked the transcript.  ",
    });

    expect(rpc).toHaveBeenCalledWith("record_call_review_revision", {
      p_call_id: "call-1",
      p_expected_revision: 1,
      p_verdict: "Acceptable",
      p_coaching_note: "Keep the close concise.",
      p_correction_reason: "Rechecked the transcript.",
    });
    expect(revision).toMatchObject({ id: "revision-2", revisionNumber: 2 });
  });

  it("maps a stale expected revision to a reloadable conflict", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Review has changed; reload and try again" },
    });
    mocks.createDataClient.mockResolvedValue({ rpc: vi.fn().mockReturnValue({ single }) });

    await expect(recordCallReview({
      callId: "call-1",
      expectedRevision: 1,
      verdict: "Acceptable",
      coachingNote: "Keep the close concise.",
      correctionReason: "Rechecked the transcript.",
    })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
