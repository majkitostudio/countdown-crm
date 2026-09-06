import "server-only";

import { createDataClient } from "./db";
import { DataAccessError } from "./errors";
import { requireWorkspaceRole } from "./workspace";

export type ExceptionPriority = "critical" | "high" | "medium";
export type ExceptionType =
  | "outcome_recovery"
  | "overdue_callback"
  | "expired_lease"
  | "workflow_failure"
  | "missing_script";

export interface ExceptionQueueItemDTO {
  id: string;
  type: ExceptionType;
  priority: ExceptionPriority;
  reason: string;
  owner: { id: string; name: string } | null;
  target: { kind: "lead" | "workflow" | "product"; id: string; label: string };
  source: { table: "lead_queue_items" | "workflow_executions" | "products"; id: string };
  occurred_at: string;
  due_at: string | null;
  next_action: { label: string; href: string };
}

export interface ExceptionQueueSourceStatus {
  state: "available" | "unavailable";
  message?: string;
}

export interface ExceptionQueueDTO {
  items: ExceptionQueueItemDTO[];
  history: Array<ExceptionQueueItemDTO & {
    status: "resolved" | "snoozed";
    resolution: string;
    snoozed_until: string | null;
    handled_at: string;
  }>;
  sources: {
    queue: ExceptionQueueSourceStatus;
    workflows: ExceptionQueueSourceStatus;
    scripts: ExceptionQueueSourceStatus;
    actions: ExceptionQueueSourceStatus;
  };
}

interface QueueSourceRow {
  id: string;
  lead_id: string;
  state: string;
  assigned_operator_id: string | null;
  preferred_operator_id: string | null;
  scheduled_at: string | null;
  lease_expires_at: string | null;
  recovery_required: boolean;
  updated_at: string;
  lead: { full_name: string };
  assigned_operator: { full_name: string } | null;
  preferred_operator: { full_name: string } | null;
}

interface WorkflowSourceRow {
  id: string;
  rule_id: string | null;
  status: string;
  created_at: string;
  logs: unknown;
  workflow: { name: string } | null;
}

interface ProductSourceRow {
  id: string;
  title: string;
  in_stock: boolean;
  created_at: string;
}

interface ProductScriptSourceRow {
  product_id: string;
}

export interface ExceptionActionSourceRow {
  id?: string;
  workspace_id?: string;
  exception_key: string;
  status: "resolved" | "snoozed";
  resolution: string;
  snoozed_until: string | null;
  actor_id?: string;
  previous_state?: unknown;
  new_state?: unknown;
  created_at?: string;
  updated_at: string;
}

export interface ExceptionQueueSourcesInput {
  queueItems: PromiseSettledResult<QueueSourceRow[]>;
  workflowExecutions: PromiseSettledResult<WorkflowSourceRow[]>;
  products: PromiseSettledResult<ProductSourceRow[]>;
  productScripts: PromiseSettledResult<ProductScriptSourceRow[]>;
  actions: PromiseSettledResult<ExceptionActionSourceRow[]>;
}

const PRIORITY_ORDER: Record<ExceptionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

const TYPE_ORDER: Record<ExceptionType, number> = {
  outcome_recovery: 0,
  overdue_callback: 1,
  expired_lease: 2,
  workflow_failure: 3,
  missing_script: 4,
};

const EXCEPTION_ID_PATTERN = /^(queue:(outcome_recovery|overdue_callback|expired_lease)|workflow:failure|script:missing):[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function available(): ExceptionQueueSourceStatus {
  return { state: "available" };
}

function unavailable(message: string): ExceptionQueueSourceStatus {
  return { state: "unavailable", message };
}

function isBefore(value: string | null, now: Date): value is string {
  return Boolean(value && Number.isFinite(Date.parse(value)) && Date.parse(value) < now.getTime());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHiddenByAction(
  action: ExceptionActionSourceRow | undefined,
  item: ExceptionQueueItemDTO,
  now: Date,
): boolean {
  if (!action) return false;
  const actionTimestamp = Date.parse(action.updated_at);
  const occurrenceTimestamp = Date.parse(item.occurred_at);
  if (!Number.isFinite(actionTimestamp)
    || !Number.isFinite(occurrenceTimestamp)
    || actionTimestamp < occurrenceTimestamp) {
    return false;
  }
  if (action.status === "resolved") return true;
  return Boolean(action.snoozed_until && Date.parse(action.snoozed_until) > now.getTime());
}

function queueOwner(row: QueueSourceRow): ExceptionQueueItemDTO["owner"] {
  if (row.assigned_operator_id) {
    return {
      id: row.assigned_operator_id,
      name: row.assigned_operator?.full_name || "Unknown operator",
    };
  }
  if (row.preferred_operator_id) {
    return {
      id: row.preferred_operator_id,
      name: row.preferred_operator?.full_name || "Unknown operator",
    };
  }
  return null;
}

function buildQueueExceptions(rows: QueueSourceRow[], now: Date): ExceptionQueueItemDTO[] {
  const items: ExceptionQueueItemDTO[] = [];

  for (const row of rows) {
    const owner = queueOwner(row);
    const target = { kind: "lead" as const, id: row.lead_id, label: row.lead.full_name };

    if (row.recovery_required || row.state === "awaiting_outcome") {
      items.push({
        id: `queue:outcome_recovery:${row.id}`,
        type: "outcome_recovery",
        priority: "critical",
        reason: "The call ended without a completed outcome and needs a manager check.",
        owner,
        target,
        source: { table: "lead_queue_items", id: row.id },
        occurred_at: row.updated_at,
        due_at: row.lease_expires_at,
        next_action: { label: "Open queue operations", href: "/team" },
      });
      continue;
    }

    if (row.state === "waiting_callback" && isBefore(row.scheduled_at, now)) {
      items.push({
        id: `queue:overdue_callback:${row.id}`,
        type: "overdue_callback",
        priority: "high",
        reason: "The promised callback time has passed and no newer queue state closed it.",
        owner,
        target,
        source: { table: "lead_queue_items", id: row.id },
        occurred_at: row.scheduled_at,
        due_at: row.scheduled_at,
        next_action: { label: "Open customer", href: `/leads/${row.lead_id}` },
      });
      continue;
    }

    if (row.state === "assigned" && isBefore(row.lease_expires_at, now)) {
      items.push({
        id: `queue:expired_lease:${row.id}`,
        type: "expired_lease",
        priority: "high",
        reason: "The operator assignment expired before the contact was completed.",
        owner,
        target,
        source: { table: "lead_queue_items", id: row.id },
        occurred_at: row.lease_expires_at,
        due_at: row.lease_expires_at,
        next_action: { label: "Open queue operations", href: "/team" },
      });
    }
  }

  return items;
}

function buildWorkflowExceptions(rows: WorkflowSourceRow[]): ExceptionQueueItemDTO[] {
  return rows.flatMap((row) => {
    if (row.status !== "failure") return [];
    const error = isRecord(row.logs) && typeof row.logs.error === "string"
      ? row.logs.error.trim()
      : "The workflow execution recorded a failure.";
    const workflowName = row.workflow?.name || "Workflow";

    return [{
      id: `workflow:failure:${row.id}`,
      type: "workflow_failure" as const,
      priority: "medium" as const,
      reason: error || "The workflow execution recorded a failure.",
      owner: null,
      target: { kind: "workflow" as const, id: row.rule_id || row.id, label: workflowName },
      source: { table: "workflow_executions" as const, id: row.id },
      occurred_at: row.created_at,
      due_at: null,
      next_action: { label: "Open workflows", href: "/workflows" },
    }];
  });
}

function buildScriptExceptions(
  products: ProductSourceRow[],
  scripts: ProductScriptSourceRow[],
): ExceptionQueueItemDTO[] {
  const scriptedProductIds = new Set(scripts.map((script) => script.product_id));
  return products.flatMap((product) => {
    if (!product.in_stock || scriptedProductIds.has(product.id)) return [];
    return [{
      id: `script:missing:${product.id}`,
      type: "missing_script" as const,
      priority: "medium" as const,
      reason: "This active product has no published operator script.",
      owner: null,
      target: { kind: "product" as const, id: product.id, label: product.title },
      source: { table: "products" as const, id: product.id },
      occurred_at: product.created_at,
      due_at: null,
      next_action: { label: "Open product scripts", href: "/settings/scripts" },
    }];
  });
}

export function buildTeamLeaderExceptionQueue(
  sources: ExceptionQueueSourcesInput,
  now = new Date(),
): ExceptionQueueDTO {
  const items: ExceptionQueueItemDTO[] = [];

  if (sources.queueItems.status === "fulfilled") {
    items.push(...buildQueueExceptions(sources.queueItems.value, now));
  }
  if (sources.workflowExecutions.status === "fulfilled") {
    items.push(...buildWorkflowExceptions(sources.workflowExecutions.value));
  }
  if (sources.products.status === "fulfilled" && sources.productScripts.status === "fulfilled") {
    items.push(...buildScriptExceptions(sources.products.value, sources.productScripts.value));
  }

  const actions = sources.actions.status === "fulfilled"
    ? new Map(sources.actions.value.map((action) => [action.exception_key, action]))
    : new Map<string, ExceptionActionSourceRow>();
  const visibleItems = items.filter((item) => !isHiddenByAction(actions.get(item.id), item, now));
  const history = items.flatMap((item) => {
    const action = actions.get(item.id);
    if (!action || !isHiddenByAction(action, item, now)) return [];
    return [{
      ...item,
      status: action.status,
      resolution: action.resolution,
      snoozed_until: action.snoozed_until,
      handled_at: action.updated_at,
    }];
  });

  return {
    items: visibleItems
      .sort((left, right) => {
        const priorityDifference = PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority];
        return priorityDifference || TYPE_ORDER[left.type] - TYPE_ORDER[right.type];
      }),
    history,
    sources: {
      queue: sources.queueItems.status === "fulfilled"
        ? available()
        : unavailable("Lead queue checks could not be loaded."),
      workflows: sources.workflowExecutions.status === "fulfilled"
        ? available()
        : unavailable("Workflow failure checks could not be loaded."),
      scripts: sources.products.status === "fulfilled" && sources.productScripts.status === "fulfilled"
        ? available()
        : unavailable("Published script checks could not be loaded."),
      actions: sources.actions.status === "fulfilled"
        ? available()
        : unavailable("Resolved and snoozed exception state could not be loaded."),
    },
  };
}

async function loadRows<T>(
  query: PromiseLike<{ data: unknown; error: { message?: string } | null }>,
  message: string,
): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new DataAccessError("DATABASE", message);
  return (data || []) as T[];
}

export async function listTeamLeaderExceptions(): Promise<ExceptionQueueDTO> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"]);
  const supabase = await createDataClient();

  const [queueItems, workflowExecutions, products, productScripts, actions] = await Promise.allSettled([
    loadRows<QueueSourceRow>(
      supabase
        .from("lead_queue_items")
        .select("id, lead_id, state, assigned_operator_id, preferred_operator_id, scheduled_at, lease_expires_at, recovery_required, updated_at, lead:leads(full_name), assigned_operator:profiles!lead_queue_items_assigned_operator_id_fkey(full_name), preferred_operator:profiles!lead_queue_items_preferred_operator_id_fkey(full_name)")
        .eq("workspace_id", context.workspaceId)
        .in("state", ["assigned", "awaiting_outcome", "waiting_callback"])
        .order("updated_at", { ascending: false }),
      "Lead queue checks could not be loaded.",
    ),
    loadRows<WorkflowSourceRow>(
      supabase
        .from("workflow_executions")
        .select("id, rule_id, status, created_at, logs, workflow:workflows(name)")
        .eq("workspace_id", context.workspaceId)
        .eq("status", "failure")
        .order("created_at", { ascending: false }),
      "Workflow failure checks could not be loaded.",
    ),
    loadRows<ProductSourceRow>(
      supabase
        .from("products")
        .select("id, title, in_stock, created_at")
        .eq("workspace_id", context.workspaceId)
        .eq("in_stock", true)
        .order("created_at", { ascending: false }),
      "Active products could not be loaded.",
    ),
    loadRows<ProductScriptSourceRow>(
      supabase
        .from("product_scripts")
        .select("product_id")
        .eq("workspace_id", context.workspaceId),
      "Published product scripts could not be loaded.",
    ),
    loadRows<ExceptionActionSourceRow>(
      supabase
        .from("team_leader_exception_actions")
        .select("id, workspace_id, exception_key, status, resolution, snoozed_until, actor_id, previous_state, new_state, created_at, updated_at")
        .eq("workspace_id", context.workspaceId)
        .order("updated_at", { ascending: false }),
      "Resolved and snoozed exception state could not be loaded.",
    ),
  ]);

  return buildTeamLeaderExceptionQueue({ queueItems, workflowExecutions, products, productScripts, actions });
}

function validateExceptionId(exceptionId: string): string {
  const normalized = typeof exceptionId === "string" ? exceptionId.trim() : "";
  if (!EXCEPTION_ID_PATTERN.test(normalized)) {
    throw new DataAccessError("VALIDATION", "Exception ID is invalid.");
  }
  return normalized;
}

function validateReason(reason: string, label: string): string {
  const normalized = typeof reason === "string" ? reason.trim() : "";
  if (normalized.length < 3 || normalized.length > 2000) {
    throw new DataAccessError("VALIDATION", `${label} must be between 3 and 2,000 characters.`);
  }
  return normalized;
}

function mapExceptionAction(data: unknown): ExceptionActionSourceRow {
  return data as ExceptionActionSourceRow;
}

export async function resolveException(
  exceptionId: string,
  resolution: string,
): Promise<ExceptionActionSourceRow> {
  const normalizedId = validateExceptionId(exceptionId);
  const normalizedResolution = validateReason(resolution, "Resolution");
  const context = await requireWorkspaceRole(["team_leader", "administrator"]);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .rpc("resolve_team_leader_exception", {
      p_workspace_id: context.workspaceId,
      p_exception_key: normalizedId,
      p_resolution: normalizedResolution,
    })
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Exception could not be marked as handled.");
  }
  return mapExceptionAction(data);
}

export async function snoozeException(
  exceptionId: string,
  until: string,
  reason: string,
  now = new Date(),
): Promise<ExceptionActionSourceRow> {
  const normalizedId = validateExceptionId(exceptionId);
  const normalizedReason = validateReason(reason, "Snooze reason");
  const untilTimestamp = Date.parse(until);
  const maximumTimestamp = now.getTime() + 90 * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(untilTimestamp) || untilTimestamp <= now.getTime() || untilTimestamp > maximumTimestamp) {
    throw new DataAccessError("VALIDATION", "Snooze time must be in the next 90 days.");
  }

  const context = await requireWorkspaceRole(["team_leader", "administrator"]);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .rpc("snooze_team_leader_exception", {
      p_workspace_id: context.workspaceId,
      p_exception_key: normalizedId,
      p_snoozed_until: new Date(untilTimestamp).toISOString(),
      p_reason: normalizedReason,
    })
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Exception could not be snoozed.");
  }
  return mapExceptionAction(data);
}
