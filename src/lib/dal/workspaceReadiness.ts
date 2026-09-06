import "server-only";

import { DataAccessError } from "@/lib/dal/errors";
import { listAuditLogsForWorkspace, type AuditLogDTO } from "@/lib/dal/audit";
import {
  listOperatorCalendarEntriesForWorkspace,
  type CalendarLoadResult,
} from "@/lib/dal/calendar";
import { getWalletOverview, type WalletOverviewDTO, type WalletSectionState } from "@/lib/dal/wallet";
import { listQueueItemsForWorkspace, type QueueItemDTO } from "@/lib/dal/leadQueue";
import { listProductsForWorkspace, type ProductDTO } from "@/lib/dal/products";
import {
  listProductScriptVersionsForWorkspace,
  type ProductScriptVersionDTO,
} from "@/lib/dal/productScripts";
import { getWorkspaceTelephonySettings, type WorkspaceTelephonySettings } from "@/lib/dal/telephonySettings";
import { listWorkflowsForWorkspace } from "@/lib/dal/workflows";
import { requireWorkspaceRole } from "@/lib/dal/workspace";
import { TRIGGER_REGISTRY, type WorkflowRule } from "@/lib/workflows/types";
import { TELNYX_BLOCKER_COPY } from "@/lib/telephony/telephonyAdapterShared";

export type ReadinessStatus = "ready" | "needs_attention" | "blocked";

export type WorkspaceReadinessCheckKey =
  | "calendar"
  | "wallet"
  | "lead_queue"
  | "published_scripts"
  | "local_sip"
  | "telnyx"
  | "migration_history"
  | "workflows"
  | "role_boundaries"
  | "critical_errors";

export interface WorkspaceReadinessCheck {
  key: WorkspaceReadinessCheckKey;
  label: string;
  status: ReadinessStatus;
  summary: string;
  details: string;
  checkedAt: string;
  actionHref: string | null;
}

export interface WorkspaceReadinessDTO {
  workspaceId: string;
  checkedAt: string;
  overallStatus: ReadinessStatus;
  checks: WorkspaceReadinessCheck[];
}

export type ReadinessProbe<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export interface MigrationReadinessEvidence {
  status: "verified" | "mismatch" | "unavailable";
  summary: string;
  details: string;
}

export interface RoleBoundaryReadinessEvidence {
  status: ReadinessStatus;
  summary: string;
  details: string;
}

export interface TelnyxReadinessEvidence {
  status: ReadinessStatus;
  summary: string;
  details: string;
}

export interface WorkspaceReadinessInputs {
  workspaceId: string;
  checkedAt: string;
  calendar: ReadinessProbe<CalendarLoadResult>;
  wallet: ReadinessProbe<WalletOverviewDTO>;
  queue: ReadinessProbe<QueueItemDTO[]>;
  productsAndScripts: ReadinessProbe<WorkspaceProductsAndScripts>;
  workflows: ReadinessProbe<WorkflowRule[]>;
  telephony: ReadinessProbe<WorkspaceTelephonySettings>;
  migration: MigrationReadinessEvidence;
  roleBoundaries: RoleBoundaryReadinessEvidence;
  criticalErrors: ReadinessProbe<AuditLogDTO[]>;
  telnyx: TelnyxReadinessEvidence;
}

export interface WorkspaceProductsAndScripts {
  products: ProductDTO[];
  versions: ProductScriptVersionDTO[];
}

function createCheck(
  key: WorkspaceReadinessCheckKey,
  label: string,
  status: ReadinessStatus,
  summary: string,
  details: string,
  checkedAt: string,
  actionHref: string | null,
): WorkspaceReadinessCheck {
  return { key, label, status, summary, details, checkedAt, actionHref };
}

function buildCalendarCheck(
  probe: ReadinessProbe<CalendarLoadResult>,
  checkedAt: string,
): WorkspaceReadinessCheck {
  if (!probe.ok) {
    return createCheck(
      "calendar",
      "Calendar",
      "needs_attention",
      "Calendar is unavailable.",
      probe.message,
      checkedAt,
      "/calendar",
    );
  }

  const unavailableSources = Object.entries(probe.value.sources)
    .filter(([, source]) => source.state === "unavailable")
    .map(([name, source]) => `${name}: ${source.state === "unavailable" ? source.message : "unavailable"}`);

  if (unavailableSources.length > 0) {
    return createCheck(
      "calendar",
      "Calendar",
      "needs_attention",
      "Calendar is only partially available.",
      unavailableSources.join(" "),
      checkedAt,
      "/calendar",
    );
  }

  return createCheck(
    "calendar",
    "Calendar",
    "ready",
    "Calendar sources are available.",
    `${probe.value.entries.length} calendar entries were returned by callbacks and reminders.`,
    checkedAt,
    "/calendar",
  );
}

function buildWalletCheck(
  probe: ReadinessProbe<WalletOverviewDTO>,
  checkedAt: string,
): WorkspaceReadinessCheck {
  if (!probe.ok) {
    return createCheck(
      "wallet",
      "Wallet",
      "needs_attention",
      "Wallet is unavailable.",
      probe.message,
      checkedAt,
      "/wallet",
    );
  }

  const sectionEntries = Object.entries(probe.value.sections) as Array<[string, WalletSectionState]>;
  const unavailableSections = sectionEntries
    .filter(([, section]) => section.state === "unavailable")
    .map(([name, section]) => `${name}: ${section.state === "unavailable" ? section.message : "unavailable"}`);
  const notApplicableSections = sectionEntries
    .filter(([, section]) => section.state === "not_applicable")
    .map(([name]) => name);

  if (unavailableSections.length > 0 || notApplicableSections.length > 0) {
    const details = [
      unavailableSections.join(" "),
      notApplicableSections.length > 0
        ? `Not applicable sections: ${notApplicableSections.join(", ")}.`
        : "",
    ].filter(Boolean).join(" ");

    return createCheck(
      "wallet",
      "Wallet",
      "needs_attention",
      "Wallet is only partially available.",
      details,
      checkedAt,
      "/wallet",
    );
  }

  return createCheck(
    "wallet",
    "Wallet",
    "ready",
    "Wallet sections are available.",
    `${probe.value.transactions.length} transactions and ${probe.value.balances.length} balances were returned.`,
    checkedAt,
    "/wallet",
  );
}

function buildQueueCheck(
  probe: ReadinessProbe<QueueItemDTO[]>,
  checkedAt: string,
): WorkspaceReadinessCheck {
  if (!probe.ok) {
    return createCheck(
      "lead_queue",
      "Lead queue",
      "needs_attention",
      "Lead queue is unavailable.",
      probe.message,
      checkedAt,
      "/workspace",
    );
  }

  const queueLabel = probe.value.length === 0
    ? "Lead queue is available but empty."
    : `Lead queue is available with ${probe.value.length} item${probe.value.length === 1 ? "" : "s"}.`;

  return createCheck(
    "lead_queue",
    "Lead queue",
    "ready",
    queueLabel,
    "The server returned the current workspace queue without fabricating assignments.",
    checkedAt,
    "/workspace",
  );
}

function buildPublishedScriptsCheck(
  probe: ReadinessProbe<WorkspaceProductsAndScripts>,
  checkedAt: string,
): WorkspaceReadinessCheck {
  if (!probe.ok) {
    return createCheck(
      "published_scripts",
      "Published scripts",
      "needs_attention",
      "Published scripts are unavailable.",
      probe.message,
      checkedAt,
      "/settings/scripts",
    );
  }

  if (probe.value.products.length === 0) {
    return createCheck(
      "published_scripts",
      "Published scripts",
      "needs_attention",
      "No products are available to verify.",
      "The catalog returned no products, so the system cannot prove that operator scripts are ready.",
      checkedAt,
      "/products",
    );
  }

  const publishedProductIds = new Set(
    probe.value.versions
      .filter((version) => version.status === "published")
      .map((version) => version.product_id),
  );
  const missingProducts = probe.value.products.filter((product) => !publishedProductIds.has(product.id));

  if (missingProducts.length > 0) {
    const productNames = missingProducts.slice(0, 5).map((product) => product.title).join(", ");
    const suffix = missingProducts.length > 5 ? " and more" : "";
    return createCheck(
      "published_scripts",
      "Published scripts",
      "needs_attention",
      `${missingProducts.length} product${missingProducts.length === 1 ? " lacks" : "s lack"} a published script.`,
      `Products needing a published version: ${productNames}${suffix}.`,
      checkedAt,
      "/settings/scripts",
    );
  }

  return createCheck(
    "published_scripts",
    "Published scripts",
    "ready",
    "Every catalog product has a published script.",
    `${probe.value.products.length} product${probe.value.products.length === 1 ? "" : "s"} has a published version available to operators.`,
    checkedAt,
    "/settings/scripts",
  );
}

function buildLocalSipCheck(
  probe: ReadinessProbe<WorkspaceTelephonySettings>,
  checkedAt: string,
): WorkspaceReadinessCheck {
  if (!probe.ok) {
    return createCheck(
      "local_sip",
      "Local SIP",
      "needs_attention",
      "Local SIP settings are unavailable.",
      probe.message,
      checkedAt,
      "/settings#telephony-adapter",
    );
  }

  if (probe.value.active_adapter !== "local_sip") {
    return createCheck(
      "local_sip",
      "Local SIP",
      "needs_attention",
      "Local SIP is not active.",
      `The active telephony adapter is ${probe.value.active_adapter}. Local SIP can be enabled in Admin Settings.`,
      checkedAt,
      "/settings#telephony-adapter",
    );
  }

  return createCheck(
    "local_sip",
    "Local SIP",
    "ready",
    "Local SIP is selected for this workspace.",
    "The workspace configuration points to the local SIP adapter. A live audio call remains a separate pilot check.",
    checkedAt,
    "/telephony",
  );
}

function buildWorkflowsCheck(
  probe: ReadinessProbe<WorkflowRule[]>,
  checkedAt: string,
): WorkspaceReadinessCheck {
  if (!probe.ok) {
    return createCheck(
      "workflows",
      "Workflows",
      "needs_attention",
      "Workflows are unavailable.",
      probe.message,
      checkedAt,
      "/workflows",
    );
  }

  const unavailableTriggers = probe.value
    .filter((rule) => rule.enabled)
    .map((rule) => TRIGGER_REGISTRY.find((definition) => definition.type === rule.trigger))
    .filter((definition) => definition?.serverDispatch === "unavailable")
    .map((definition) => definition?.label)
    .filter((label): label is string => Boolean(label));

  if (unavailableTriggers.length > 0) {
    return createCheck(
      "workflows",
      "Workflows",
      "needs_attention",
      "Some active workflow triggers are unavailable.",
      `Unavailable active triggers: ${Array.from(new Set(unavailableTriggers)).join(", ")}.`,
      checkedAt,
      "/workflows",
    );
  }

  return createCheck(
    "workflows",
    "Workflows",
    "ready",
    "Workflow rules are readable.",
    `${probe.value.length} workflow rule${probe.value.length === 1 ? "" : "s"} were returned from the workspace.`,
    checkedAt,
    "/workflows",
  );
}

function buildMigrationCheck(
  evidence: MigrationReadinessEvidence,
  checkedAt: string,
): WorkspaceReadinessCheck {
  const status: ReadinessStatus = evidence.status === "verified"
    ? "ready"
    : evidence.status === "mismatch"
      ? "blocked"
      : "needs_attention";

  return createCheck(
    "migration_history",
    "Migration history",
    status,
    evidence.summary,
    evidence.details,
    checkedAt,
    null,
  );
}

function buildRoleBoundaryCheck(
  evidence: RoleBoundaryReadinessEvidence,
  checkedAt: string,
): WorkspaceReadinessCheck {
  return createCheck(
    "role_boundaries",
    "RLS and role boundaries",
    evidence.status,
    evidence.summary,
    evidence.details,
    checkedAt,
    null,
  );
}

function buildCriticalErrorsCheck(
  probe: ReadinessProbe<AuditLogDTO[]>,
  checkedAt: string,
): WorkspaceReadinessCheck {
  if (!probe.ok) {
    return createCheck(
      "critical_errors",
      "Recent critical errors",
      "needs_attention",
      "Recent critical errors could not be checked.",
      probe.message,
      checkedAt,
      "/audit",
    );
  }

  const checkedTime = Date.parse(checkedAt);
  const cutoff = Number.isFinite(checkedTime)
    ? checkedTime - 24 * 60 * 60 * 1000
    : Number.NEGATIVE_INFINITY;
  const recentCriticalErrors = probe.value.filter((entry) => {
    const timestamp = Date.parse(entry.timestamp);
    return (entry.severity === "critical" || entry.severity === "high")
      && Number.isFinite(timestamp)
      && timestamp >= cutoff
      && timestamp <= checkedTime;
  });

  if (recentCriticalErrors.length > 0) {
    const details = recentCriticalErrors
      .slice(0, 3)
      .map((entry) => `${entry.action}: ${entry.details}`)
      .join(" ");
    return createCheck(
      "critical_errors",
      "Recent critical errors",
      "needs_attention",
      `${recentCriticalErrors.length} high or critical audit event${recentCriticalErrors.length === 1 ? "" : "s"} needs review.`,
      details,
      checkedAt,
      "/audit",
    );
  }

  return createCheck(
    "critical_errors",
    "Recent critical errors",
    "ready",
    "No recent high or critical audit events were found.",
    "The last 24 hours of workspace audit events contain no high or critical severity entries.",
    checkedAt,
    "/audit",
  );
}

function overallStatus(checks: WorkspaceReadinessCheck[]): ReadinessStatus {
  if (checks.some((check) => check.status === "blocked")) return "blocked";
  if (checks.some((check) => check.status === "needs_attention")) return "needs_attention";
  return "ready";
}

export function buildWorkspaceReadiness(inputs: WorkspaceReadinessInputs): WorkspaceReadinessDTO {
  const checks = [
    buildCalendarCheck(inputs.calendar, inputs.checkedAt),
    buildWalletCheck(inputs.wallet, inputs.checkedAt),
    buildQueueCheck(inputs.queue, inputs.checkedAt),
    buildPublishedScriptsCheck(inputs.productsAndScripts, inputs.checkedAt),
    buildLocalSipCheck(inputs.telephony, inputs.checkedAt),
    createCheck(
      "telnyx",
      "Telnyx adapter",
      inputs.telnyx.status,
      inputs.telnyx.summary,
      inputs.telnyx.details,
      inputs.checkedAt,
      "/settings#telephony-adapter",
    ),
    buildMigrationCheck(inputs.migration, inputs.checkedAt),
    buildRoleBoundaryCheck(inputs.roleBoundaries, inputs.checkedAt),
    buildCriticalErrorsCheck(inputs.criticalErrors, inputs.checkedAt),
    buildWorkflowsCheck(inputs.workflows, inputs.checkedAt),
  ];

  return {
    workspaceId: inputs.workspaceId,
    checkedAt: inputs.checkedAt,
    overallStatus: overallStatus(checks),
    checks,
  };
}

function toProbe<T>(result: PromiseSettledResult<T>, fallbackMessage: string): ReadinessProbe<T> {
  if (result.status === "fulfilled") return { ok: true, value: result.value };

  if (result.reason instanceof DataAccessError) {
    return { ok: false, message: result.reason.message };
  }

  return { ok: false, message: fallbackMessage };
}

function hasConfiguredValue(name: string): boolean {
  const value = process.env[name]?.trim();
  if (!value) return false;
  return !/^your[-_]/i.test(value) && !value.includes("000000000000");
}

function getTelnyxReadinessEvidence(): TelnyxReadinessEvidence {
  if (process.env.NEXT_PUBLIC_TELNYX_ENABLED !== "true") {
    return {
      status: "blocked",
      summary: "Telnyx pilot is blocked.",
      details: TELNYX_BLOCKER_COPY,
    };
  }

  if (process.env.TELNYX_NUMBER_VERIFIED !== "true") {
    return {
      status: "blocked",
      summary: "Telnyx number verification is missing.",
      details: "The Telnyx adapter cannot be treated as ready until the assigned number is externally verified.",
    };
  }

  const requiredVariables = [
    "TELNYX_API_KEY",
    "TELNYX_CONNECTION_ID",
    "TELNYX_DEFAULT_CALLER_NUMBER",
    "TELNYX_PUBLIC_KEY",
  ];
  const missingVariables = requiredVariables.filter((name) => !hasConfiguredValue(name));

  if (missingVariables.length > 0) {
    return {
      status: "needs_attention",
      summary: "Telnyx number is verified but configuration is incomplete.",
      details: `Missing required server configuration: ${missingVariables.join(", ")}.`,
    };
  }

  return {
    status: "ready",
    summary: "Telnyx configuration is present.",
    details: "The required server configuration and external number verification are present. A live browser/audio call remains a separate pilot proof.",
  };
}

function getMigrationReadinessEvidence(): MigrationReadinessEvidence {
  const status = process.env.WORKSPACE_MIGRATION_STATUS?.trim().toLowerCase();
  const verifiedAt = process.env.WORKSPACE_MIGRATION_VERIFIED_AT?.trim();

  if (status === "mismatch") {
    return {
      status: "mismatch",
      summary: "Migration history does not match the recorded deployment evidence.",
      details: "Stop rollout and reconcile migration/schema evidence before relying on this workspace.",
    };
  }

  if (status === "verified" && verifiedAt && Number.isFinite(Date.parse(verifiedAt))) {
    return {
      status: "verified",
      summary: "Migration history is verified.",
      details: `Recorded migration evidence timestamp: ${verifiedAt}.`,
    };
  }

  return {
    status: "unavailable",
    summary: "Migration history evidence is unavailable at runtime.",
    details: "The application does not shell out to run migrations during a request. Record a verified deployment checkpoint before reporting migration history as ready.",
  };
}

function getRoleBoundaryReadinessEvidence(): RoleBoundaryReadinessEvidence {
  const status = process.env.WORKSPACE_ROLE_BOUNDARY_STATUS?.trim().toLowerCase();
  const verifiedAt = process.env.WORKSPACE_ROLE_BOUNDARY_VERIFIED_AT?.trim();

  if (status === "mismatch") {
    return {
      status: "blocked",
      summary: "Role boundary evidence reports a mismatch.",
      details: "Stop rollout and reconcile the server role matrix with the workspace RLS policies before relying on access boundaries.",
    };
  }

  if (status === "verified" && verifiedAt && Number.isFinite(Date.parse(verifiedAt))) {
    return {
      status: "ready",
      summary: "RLS and role boundary evidence is verified.",
      details: `Recorded role/RLS matrix evidence timestamp: ${verifiedAt}.`,
    };
  }

  return {
    status: "needs_attention",
    summary: "RLS and role boundary evidence is not recorded.",
    details: "The server-side administrator guard is active, but this runtime has no recorded negative role/RLS matrix evidence to claim full readiness.",
  };
}

export async function getWorkspaceReadinessForWorkspace(): Promise<WorkspaceReadinessDTO> {
  const { workspaceId } = await requireWorkspaceRole(["administrator"]);
  const [calendar, wallet, queue, productsAndScripts, workflows, telephony, criticalErrors] = await Promise.allSettled([
    listOperatorCalendarEntriesForWorkspace(undefined, undefined, workspaceId),
    getWalletOverview(),
    listQueueItemsForWorkspace(workspaceId),
    Promise.all([
      listProductsForWorkspace({ workspaceId }),
      listProductScriptVersionsForWorkspace(workspaceId),
    ]).then(([products, versions]) => ({ products, versions })),
    listWorkflowsForWorkspace(),
    getWorkspaceTelephonySettings(),
    listAuditLogsForWorkspace(),
  ]);

  return buildWorkspaceReadiness({
    workspaceId,
    checkedAt: new Date().toISOString(),
    calendar: toProbe(calendar, "Calendar could not be loaded."),
    wallet: toProbe(wallet, "Wallet could not be loaded."),
    queue: toProbe(queue, "Lead queue could not be loaded."),
    productsAndScripts: toProbe(productsAndScripts, "Products and published scripts could not be loaded."),
    workflows: toProbe(workflows, "Workflows could not be loaded."),
    telephony: toProbe(telephony, "Telephony settings could not be loaded."),
    migration: getMigrationReadinessEvidence(),
    roleBoundaries: getRoleBoundaryReadinessEvidence(),
    criticalErrors: toProbe(criticalErrors, "Recent critical errors could not be checked."),
    telnyx: getTelnyxReadinessEvidence(),
  });
}
