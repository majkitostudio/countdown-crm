import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/dal/errors";
import {
  buildDepartmentQueueOverview,
  type DepartmentQueueItemInput,
  type DepartmentQueueTeamInput,
} from "@/lib/departmentQueues";

const mocks = vi.hoisted(() => ({
  createDataClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/db", () => ({ createDataClient: mocks.createDataClient }));

import { loadDepartmentQueueOverview } from "@/lib/dal/departmentQueues";

const now = new Date("2026-10-15T10:00:00.000Z");

function item(overrides: Partial<DepartmentQueueItemInput> = {}): DepartmentQueueItemInput {
  return { team_id: null, state: "available", scheduled_at: null, ...overrides };
}

function team(id: string, slug: string, name: string): DepartmentQueueTeamInput {
  return { id, slug, name };
}

function departmentByKey(overview: ReturnType<typeof buildDepartmentQueueOverview>, key: string) {
  const department = overview.departments.find((entry) => entry.key === key);
  if (!department) throw new Error(`Department ${key} is missing from the overview`);
  return department;
}

describe("buildDepartmentQueueOverview", () => {
  it("always returns the four departments in P1–P4 order, even with no data", () => {
    const overview = buildDepartmentQueueOverview([], [], now);

    expect(overview.departments.map((department) => department.key)).toEqual(["P1", "P2", "P3", "P4"]);
    expect(overview.departments.map((department) => department.slug)).toEqual(["p1", "p2", "p3", "p4"]);
    for (const department of overview.departments) {
      expect(department.total).toBe(0);
      expect(department.open).toBe(0);
      expect(department.waiting).toBe(0);
      expect(department.inProgress).toBe(0);
      expect(department.callbacks).toBe(0);
      expect(department.overdueCallbacks).toBe(0);
      expect(department.teams).toEqual([]);
      expect(department.purpose.length).toBeGreaterThan(0);
    }
    expect(overview.unattributed.total).toBe(0);
    expect(overview.generatedAt).toBe(now.toISOString());
  });

  it("attributes queue items to a department through the team slug", () => {
    const overview = buildDepartmentQueueOverview(
      [
        item({ team_id: "t-p1", state: "available" }),
        item({ team_id: "t-p1", state: "available" }),
        item({ team_id: "t-p1", state: "assigned" }),
        item({ team_id: "t-p1", state: "closed" }),
      ],
      [team("t-p1", "p1", "Department P1")],
      now,
    );

    const p1 = departmentByKey(overview, "P1");
    expect(p1.total).toBe(4);
    expect(p1.waiting).toBe(2);
    expect(p1.inProgress).toBe(1);
    expect(p1.closed).toBe(1);
    expect(p1.open).toBe(3);
    expect(departmentByKey(overview, "P2").total).toBe(0);
  });

  it("recognises a department from the team name when the slug is not canonical", () => {
    const overview = buildDepartmentQueueOverview(
      [item({ team_id: "t-p4", state: "available" })],
      [team("t-p4", "oddeleni-p4", "Oddělení P4 (Retargeting)")],
      now,
    );

    expect(departmentByKey(overview, "P4").total).toBe(1);
  });

  it("groups every team under its department", () => {
    const overview = buildDepartmentQueueOverview(
      [],
      [
        { id: "t-1", slug: "p1k", name: "P1K" },
        { id: "t-2", slug: "p1s", name: "P1S" },
        team("t-3", "p3", "Department P3"),
      ],
      now,
    );

    expect(departmentByKey(overview, "P1").teams).toEqual([
      { id: "t-1", name: "P1K" },
      { id: "t-2", name: "P1S" },
    ]);
    expect(departmentByKey(overview, "P3").teams).toEqual([{ id: "t-3", name: "Department P3" }]);
  });

  it("keeps items without a recognised department in the unattributed bucket", () => {
    const overview = buildDepartmentQueueOverview(
      [
        item({ team_id: null, state: "available" }),
        item({ team_id: "t-unknown", state: "assigned" }),
      ],
      [team("t-unknown", "ranni-smena", "Ranní směna")],
      now,
    );

    expect(overview.unattributed.total).toBe(2);
    expect(overview.unattributed.waiting).toBe(1);
    expect(overview.unattributed.inProgress).toBe(1);
    expect(overview.departments.every((department) => department.total === 0)).toBe(true);
  });

  it("counts callbacks and overdue callbacks against the supplied clock", () => {
    const overview = buildDepartmentQueueOverview(
      [
        item({ team_id: "t-p2", state: "waiting_callback", scheduled_at: "2026-10-15T09:00:00.000Z" }),
        item({ team_id: "t-p2", state: "waiting_callback", scheduled_at: "2026-10-15T11:00:00.000Z" }),
      ],
      [team("t-p2", "p2", "Department P2")],
      now,
    );

    const p2 = departmentByKey(overview, "P2");
    expect(p2.callbacks).toBe(2);
    expect(p2.overdueCallbacks).toBe(1);
  });

  it("ignores a callback with an invalid schedule rather than counting it overdue", () => {
    const overview = buildDepartmentQueueOverview(
      [item({ team_id: "t-p2", state: "waiting_callback", scheduled_at: "not-a-date" })],
      [team("t-p2", "p2", "Department P2")],
      now,
    );

    const p2 = departmentByKey(overview, "P2");
    expect(p2.callbacks).toBe(1);
    expect(p2.overdueCallbacks).toBe(0);
  });
});

function queryResult(data: unknown, error: unknown = null) {
  const promise = Promise.resolve({ data, error });
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    then: promise.then.bind(promise),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  return query;
}

const teamLeaderContext = {
  userId: "leader-1",
  workspaceId: "workspace-1",
  role: "team_leader" as const,
};

function createClient(queueRows: unknown[], teamRows: unknown[]) {
  const queueQuery = queryResult(queueRows);
  const teamQuery = queryResult(teamRows);
  const from = vi.fn((table: string) => {
    if (table === "lead_queue_items") return queueQuery;
    if (table === "teams") return teamQuery;
    return queryResult([]);
  });
  return { from, queueQuery, teamQuery };
}

describe("loadDepartmentQueueOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes the queue and teams to the workspace and aggregates them", async () => {
    const client = createClient(
      [
        { team_id: "t-p3", state: "available", scheduled_at: null },
        { team_id: "t-p3", state: "in_progress", scheduled_at: null },
      ],
      [{ id: "t-p3", slug: "p3", name: "Department P3" }],
    );
    mocks.createDataClient.mockResolvedValue({ from: client.from });

    const overview = await loadDepartmentQueueOverview(teamLeaderContext, { now });

    expect(client.from).toHaveBeenCalledWith("lead_queue_items");
    expect(client.from).toHaveBeenCalledWith("teams");
    expect(client.queueQuery.eq).toHaveBeenCalledWith("workspace_id", "workspace-1");
    expect(client.teamQuery.eq).toHaveBeenCalledWith("workspace_id", "workspace-1");
    expect(client.queueQuery.in).not.toHaveBeenCalled();
    expect(departmentByKey(overview, "P3").total).toBe(2);
    expect(departmentByKey(overview, "P3").waiting).toBe(1);
    expect(departmentByKey(overview, "P3").inProgress).toBe(1);
  });

  it("applies a strict team filter to the queue and the team list", async () => {
    const client = createClient(
      [{ team_id: "t-a", state: "available", scheduled_at: null }],
      [
        { id: "t-a", slug: "p1a", name: "P1A" },
        { id: "t-b", slug: "p2b", name: "P2B" },
      ],
    );
    mocks.createDataClient.mockResolvedValue({ from: client.from });

    const overview = await loadDepartmentQueueOverview(teamLeaderContext, { teamIds: ["t-a"], now });

    expect(client.queueQuery.in).toHaveBeenCalledWith("team_id", ["t-a"]);
    expect(departmentByKey(overview, "P1").teams).toEqual([{ id: "t-a", name: "P1A" }]);
    expect(departmentByKey(overview, "P2").teams).toEqual([]);
  });

  it("rejects an operator before touching the database", async () => {
    await expect(
      loadDepartmentQueueOverview({ ...teamLeaderContext, role: "operator" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.createDataClient).not.toHaveBeenCalled();
  });

  it("reports a database failure as a DataAccessError", async () => {
    const failingFrom = vi.fn((table: string) => {
      if (table === "lead_queue_items") return queryResult([], { message: "boom" });
      return queryResult([]);
    });
    mocks.createDataClient.mockResolvedValue({ from: failingFrom });

    await expect(loadDepartmentQueueOverview(teamLeaderContext)).rejects.toBeInstanceOf(DataAccessError);
    await expect(loadDepartmentQueueOverview(teamLeaderContext)).rejects.toMatchObject({
      code: "DATABASE",
    });
  });
});
