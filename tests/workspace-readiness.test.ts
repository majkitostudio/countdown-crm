import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/dal/errors";

const mocks = vi.hoisted(() => ({
  requireWorkspaceRole: vi.fn(),
  listOperatorCalendarEntriesForWorkspace: vi.fn(),
  getWalletOverview: vi.fn(),
  listQueueItemsForWorkspace: vi.fn(),
  listProductsForWorkspace: vi.fn(),
  listProductScriptVersionsForWorkspace: vi.fn(),
  listWorkflowsForWorkspace: vi.fn(),
  getWorkspaceTelephonySettings: vi.fn(),
  listAuditLogsForWorkspace: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/workspace", () => ({
  requireWorkspaceRole: mocks.requireWorkspaceRole,
}));
vi.mock("@/lib/dal/calendar", () => ({
  listOperatorCalendarEntriesForWorkspace: mocks.listOperatorCalendarEntriesForWorkspace,
}));
vi.mock("@/lib/dal/wallet", () => ({
  getWalletOverview: mocks.getWalletOverview,
}));
vi.mock("@/lib/dal/leadQueue", () => ({
  listQueueItemsForWorkspace: mocks.listQueueItemsForWorkspace,
}));
vi.mock("@/lib/dal/products", () => ({
  listProductsForWorkspace: mocks.listProductsForWorkspace,
}));
vi.mock("@/lib/dal/productScripts", () => ({
  listProductScriptVersionsForWorkspace: mocks.listProductScriptVersionsForWorkspace,
}));
vi.mock("@/lib/dal/workflows", () => ({
  listWorkflowsForWorkspace: mocks.listWorkflowsForWorkspace,
}));
vi.mock("@/lib/dal/telephonySettings", () => ({
  getWorkspaceTelephonySettings: mocks.getWorkspaceTelephonySettings,
}));
vi.mock("@/lib/dal/audit", () => ({
  listAuditLogsForWorkspace: mocks.listAuditLogsForWorkspace,
}));

import {
  buildWorkspaceReadiness,
  getWorkspaceReadinessForWorkspace,
  type WorkspaceReadinessInputs,
} from "@/lib/dal/workspaceReadiness";

const workspaceId = "workspace-1";
const checkedAt = "2026-09-06T20:00:00.000Z";

const availableCalendar = {
  entries: [],
  sources: {
    callbacks: { state: "available" as const },
    reminders: { state: "available" as const },
  },
};

const availableWallet = {
  settings: null,
  rules: [],
  transactions: [],
  balances: [],
  members: [],
  sections: {
    settings: { state: "available" as const },
    rules: { state: "available" as const },
    transactions: { state: "available" as const },
    balances: { state: "available" as const },
    members: { state: "available" as const },
    profiles: { state: "available" as const },
  },
  currentUserId: "admin-1",
  canManage: true,
};

const availableProduct = {
  id: "product-1",
  workspace_id: workspaceId,
  title: "Product One",
  category: "supplements" as const,
  price: 100,
  currency: "CZK",
  description: null,
  image_url: null,
  in_stock: true,
  created_at: checkedAt,
};

const publishedScript = {
  id: "version-1",
  workspace_id: workspaceId,
  product_id: "product-1",
  version_number: 1,
  status: "published" as const,
  content_html: "<p>Approved script</p>",
  created_by: "admin-1",
  published_by: "admin-1",
  created_at: checkedAt,
  published_at: checkedAt,
};

const localSipSettings = {
  workspace_id: workspaceId,
  active_adapter: "local_sip" as const,
  updated_by: "admin-1",
  created_at: checkedAt,
  updated_at: checkedAt,
};

function fulfilled<T>(value: T) {
  return { ok: true as const, value };
}

function rejected(message: string) {
  return { ok: false as const, message };
}

function healthyInputs(overrides: Partial<WorkspaceReadinessInputs> = {}): WorkspaceReadinessInputs {
  return {
    workspaceId,
    checkedAt,
    calendar: fulfilled(availableCalendar),
    wallet: fulfilled(availableWallet),
    queue: fulfilled([]),
    productsAndScripts: fulfilled({ products: [availableProduct], versions: [publishedScript] }),
    workflows: fulfilled([]),
    telephony: fulfilled(localSipSettings),
    migration: {
      status: "verified",
      summary: "Migration history verified.",
      details: "Linked migration evidence was recorded at the deployment checkpoint.",
    },
    roleBoundaries: {
      status: "ready",
      summary: "Role boundary evidence verified.",
      details: "The authenticated role matrix and workspace RLS evidence were recorded at the deployment checkpoint.",
    },
    criticalErrors: fulfilled([]),
    telnyx: {
      status: "ready",
      summary: "Telnyx pilot evidence verified.",
      details: "External number and integration evidence are complete.",
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireWorkspaceRole.mockResolvedValue({
    userId: "admin-1",
    workspaceId,
    role: "administrator",
  });
  mocks.listOperatorCalendarEntriesForWorkspace.mockResolvedValue(availableCalendar);
  mocks.getWalletOverview.mockResolvedValue(availableWallet);
  mocks.listQueueItemsForWorkspace.mockResolvedValue([]);
  mocks.listProductsForWorkspace.mockResolvedValue([availableProduct]);
  mocks.listProductScriptVersionsForWorkspace.mockResolvedValue([publishedScript]);
  mocks.listWorkflowsForWorkspace.mockResolvedValue([]);
  mocks.getWorkspaceTelephonySettings.mockResolvedValue(localSipSettings);
  mocks.listAuditLogsForWorkspace.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("workspace readiness read model", () => {
  it("marks healthy available sources and an empty queue as ready", () => {
    const result = buildWorkspaceReadiness(healthyInputs());

    expect(result.overallStatus).toBe("ready");
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "calendar", status: "ready" }),
      expect.objectContaining({ key: "wallet", status: "ready" }),
      expect.objectContaining({ key: "lead_queue", status: "ready", summary: expect.stringContaining("empty") }),
      expect.objectContaining({ key: "published_scripts", status: "ready" }),
    ]));
  });

  it("marks an unavailable calendar source without hiding other healthy checks", () => {
    const result = buildWorkspaceReadiness(healthyInputs({
      calendar: fulfilled({
        ...availableCalendar,
        sources: {
          callbacks: { state: "unavailable", message: "Scheduled callbacks could not be loaded." },
          reminders: { state: "available" },
        },
      }),
    }));

    expect(result.overallStatus).toBe("needs_attention");
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "calendar", status: "needs_attention" }),
      expect.objectContaining({ key: "wallet", status: "ready" }),
      expect.objectContaining({ key: "lead_queue", status: "ready" }),
    ]));
  });

  it("marks a missing published script as needs attention", () => {
    const result = buildWorkspaceReadiness(healthyInputs({
      productsAndScripts: fulfilled({ products: [availableProduct], versions: [] }),
    }));

    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "published_scripts", status: "needs_attention" }),
    ]));
  });

  it("keeps disabled Telnyx explicitly blocked by external number verification", () => {
    const result = buildWorkspaceReadiness(healthyInputs({
      telnyx: {
        status: "blocked",
        summary: "Telnyx is blocked.",
        details: "Activation remains blocked until the phone number is externally verified.",
      },
    }));

    expect(result.overallStatus).toBe("blocked");
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "telnyx",
        status: "blocked",
        details: expect.stringContaining("externally verified"),
      }),
    ]));
  });

  it("treats an explicit migration mismatch as a blocker", () => {
    const result = buildWorkspaceReadiness(healthyInputs({
      migration: {
        status: "mismatch",
        summary: "Migration history mismatch.",
        details: "The recorded deployment evidence does not match the expected migration set.",
      },
    }));

    expect(result.overallStatus).toBe("blocked");
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "migration_history", status: "blocked" }),
    ]));
  });

  it("isolates a wallet failure from available telephony and queue checks", () => {
    const result = buildWorkspaceReadiness(healthyInputs({
      wallet: rejected("Wallet settings could not be loaded."),
    }));

    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "wallet", status: "needs_attention" }),
      expect.objectContaining({ key: "local_sip", status: "ready" }),
      expect.objectContaining({ key: "lead_queue", status: "ready" }),
    ]));
  });

  it("reports recent critical audit events without hiding the rest of readiness", () => {
    const result = buildWorkspaceReadiness(healthyInputs({
      criticalErrors: fulfilled([{
        id: "audit-1",
        workspace_id: workspaceId,
        timestamp: checkedAt,
        actor_id: "admin-1",
        actor_name: "Admin",
        action: "COMPLIANCE_VIOLATION",
        severity: "critical",
        details: "A critical compliance event requires review.",
        ip_address: "127.0.0.1",
      }]),
    }));

    expect(result.overallStatus).toBe("needs_attention");
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "critical_errors", status: "needs_attention" }),
      expect.objectContaining({ key: "calendar", status: "ready" }),
    ]));
  });

  it("does not claim role boundary evidence without an explicit recorded proof", () => {
    const result = buildWorkspaceReadiness(healthyInputs({
      roleBoundaries: {
        status: "needs_attention",
        summary: "Role boundary evidence is unavailable.",
        details: "The application guard is active, but no recorded negative role/RLS matrix is available.",
      },
    }));

    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "role_boundaries", status: "needs_attention" }),
    ]));
  });

  it("requires an administrator before loading any readiness source", async () => {
    mocks.requireWorkspaceRole.mockRejectedValue(
      new DataAccessError("FORBIDDEN", "Insufficient workspace permissions"),
    );

    await expect(getWorkspaceReadinessForWorkspace()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(mocks.listOperatorCalendarEntriesForWorkspace).not.toHaveBeenCalled();
    expect(mocks.getWalletOverview).not.toHaveBeenCalled();
    expect(mocks.listQueueItemsForWorkspace).not.toHaveBeenCalled();
  });

  it("requests the workspace role boundary before parallel readiness loads", async () => {
    await getWorkspaceReadinessForWorkspace();

    expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(["administrator"]);
    expect(mocks.listOperatorCalendarEntriesForWorkspace).toHaveBeenCalledWith(undefined, undefined, workspaceId);
    expect(mocks.listQueueItemsForWorkspace).toHaveBeenCalledWith(workspaceId);
    expect(mocks.listAuditLogsForWorkspace).toHaveBeenCalledOnce();
  });

  it("reports blocked Telnyx and missing migration evidence from the live configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_TELNYX_ENABLED", "false");
    vi.stubEnv("WORKSPACE_MIGRATION_STATUS", "");
    vi.stubEnv("WORKSPACE_MIGRATION_VERIFIED_AT", "");

    const result = await getWorkspaceReadinessForWorkspace();

    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "telnyx", status: "blocked" }),
      expect.objectContaining({ key: "migration_history", status: "needs_attention" }),
    ]));
  });
});
