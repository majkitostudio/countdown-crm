import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createDataClient } from "./db";
import { DataAccessError } from "./errors";
import { getCurrentLeadForWorkspace, type LeadQueueSnapshot } from "./leadQueue";
import { listLeadNotesForWorkspace } from "./leadNotes";
import { listProductScriptsForWorkspace } from "./productScripts";
import { requireWorkspaceRole } from "./workspace";

type CallRow = Database["public"]["Tables"]["calls"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

export type ConversationBriefSourceState =
  | { state: "available" }
  | { state: "unavailable"; message: string };

export interface ConversationBriefCallSource {
  id: string;
  created_at: string;
  duration_seconds: number;
  outcome: CallRow["outcome"];
  fail_reason: CallRow["fail_reason"];
  operator_note: string | null;
  callback_scheduled_at: string | null;
}

export interface ConversationBriefNoteSource {
  id: string;
  body: string;
  author_name: string;
  created_at: string;
}

export interface ConversationBriefOrderSource {
  id: string;
  total_amount: number;
  currency: string;
  status: OrderRow["status"];
  created_at: string;
}

export interface ConversationBriefSourcesInput {
  call: PromiseSettledResult<ConversationBriefCallSource | null>;
  note: PromiseSettledResult<ConversationBriefNoteSource | null>;
  order: PromiseSettledResult<ConversationBriefOrderSource | null>;
  queueReason: PromiseSettledResult<string | null>;
  productScripts: PromiseSettledResult<Array<{ id: string }>>;
}

export interface ConversationBriefDTO {
  lead: {
    id: string;
    full_name: string;
    company: string | null;
    city: string | null;
    status: LeadQueueSnapshot["lead"]["status"];
    problem: string | null;
  };
  queue_reason: string | null;
  last_contact: {
    id: string;
    occurred_at: string;
    duration_seconds: number;
  } | null;
  last_outcome: {
    outcome: CallRow["outcome"];
    fail_reason: CallRow["fail_reason"];
    operator_note: string | null;
  } | null;
  last_note: ConversationBriefNoteSource | null;
  callback: {
    scheduled_at: string;
    source: "assignment" | "last_call";
  } | null;
  last_order: ConversationBriefOrderSource | null;
  product_context: {
    approved_script_available: boolean | null;
    approved_script_count: number | null;
  };
  next_safe_step: {
    kind:
      | "recover_assignment"
      | "complete_outcome"
      | "continue_call"
      | "review_script_then_call"
      | "verify_script_before_call";
    label: string;
  };
  sources: {
    call: ConversationBriefSourceState;
    callback: ConversationBriefSourceState;
    note: ConversationBriefSourceState;
    order: ConversationBriefSourceState;
    queue_reason: ConversationBriefSourceState;
    product_scripts: ConversationBriefSourceState;
  };
}

const CALL_FIELDS = "id, created_at, duration_seconds, outcome, fail_reason, operator_note, callback_scheduled_at";
const ORDER_FIELDS = "id, total_amount, currency, status, created_at";

function cleanOptionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sourceState<T>(
  result: PromiseSettledResult<T>,
  unavailableMessage: string,
): ConversationBriefSourceState {
  if (result.status === "fulfilled") return { state: "available" };

  if (result.reason instanceof DataAccessError && result.reason.code !== "DATABASE") {
    throw result.reason;
  }

  return { state: "unavailable", message: unavailableMessage };
}

function nextSafeStep(
  assignment: LeadQueueSnapshot,
  productScripts: PromiseSettledResult<Array<{ id: string }>>,
): ConversationBriefDTO["next_safe_step"] {
  if (assignment.recovery_required) {
    return {
      kind: "recover_assignment",
      label: "Recover the interrupted assignment before taking another action.",
    };
  }

  if (assignment.assignment_state === "awaiting_outcome") {
    return {
      kind: "complete_outcome",
      label: "Complete the pending call outcome before continuing.",
    };
  }

  if (assignment.assignment_state === "in_progress") {
    return {
      kind: "continue_call",
      label: "Continue the active call using only the product guidance shown below.",
    };
  }

  if (productScripts.status === "fulfilled" && productScripts.value.length > 0) {
    return {
      kind: "review_script_then_call",
      label: "Review the approved script, then start the call.",
    };
  }

  return {
    kind: "verify_script_before_call",
    label: "Check the Product Script panel before calling and do not improvise product claims.",
  };
}

export function buildConversationBrief(
  assignment: LeadQueueSnapshot,
  input: ConversationBriefSourcesInput,
): ConversationBriefDTO {
  const callState = sourceState(input.call, "Call history is unavailable.");
  const noteState = sourceState(input.note, "Customer notes are unavailable.");
  const orderState = sourceState(input.order, "Order history is unavailable.");
  const queueReasonState = sourceState(input.queueReason, "Routing reason is unavailable.");
  const productScriptState = sourceState(input.productScripts, "Approved product guidance is unavailable.");
  const call = input.call.status === "fulfilled" ? input.call.value : null;
  const callbackFromAssignment = cleanOptionalText(assignment.scheduled_at);
  const callbackFromCall = call ? cleanOptionalText(call.callback_scheduled_at) : null;
  const callbackState = callbackFromAssignment || input.call.status === "fulfilled"
    ? { state: "available" } as const
    : { state: "unavailable", message: "Callback history is unavailable." } as const;
  const note = input.note.status === "fulfilled" ? input.note.value : null;
  const order = input.order.status === "fulfilled" ? input.order.value : null;
  const productScripts = input.productScripts.status === "fulfilled" ? input.productScripts.value : null;

  return {
    lead: {
      id: assignment.lead.id,
      full_name: assignment.lead.full_name,
      company: cleanOptionalText(assignment.lead.company),
      city: cleanOptionalText(assignment.lead.city),
      status: assignment.lead.status,
      problem: cleanOptionalText(assignment.lead.notes),
    },
    queue_reason: input.queueReason.status === "fulfilled"
      ? cleanOptionalText(input.queueReason.value)
      : null,
    last_contact: call
      ? {
          id: call.id,
          occurred_at: call.created_at,
          duration_seconds: call.duration_seconds,
        }
      : null,
    last_outcome: call
      ? {
          outcome: call.outcome,
          fail_reason: call.fail_reason,
          operator_note: cleanOptionalText(call.operator_note),
        }
      : null,
    last_note: note
      ? { ...note, body: note.body.trim(), author_name: note.author_name.trim() || "Unknown operator" }
      : null,
    callback: callbackFromAssignment
      ? { scheduled_at: callbackFromAssignment, source: "assignment" }
      : callbackFromCall
        ? { scheduled_at: callbackFromCall, source: "last_call" }
        : null,
    last_order: order,
    product_context: productScripts
      ? {
          approved_script_available: productScripts.length > 0,
          approved_script_count: productScripts.length,
        }
      : {
          approved_script_available: null,
          approved_script_count: null,
        },
    next_safe_step: nextSafeStep(assignment, input.productScripts),
    sources: {
      call: callState,
      callback: callbackState,
      note: noteState,
      order: orderState,
      queue_reason: queueReasonState,
      product_scripts: productScriptState,
    },
  };
}

async function loadLatestCall(
  supabase: SupabaseClient,
  workspaceId: string,
  leadId: string,
): Promise<ConversationBriefCallSource | null> {
  const { data, error } = await supabase
    .from("calls")
    .select(CALL_FIELDS)
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new DataAccessError("DATABASE", "Call history could not be loaded.");
  return data ? data as ConversationBriefCallSource : null;
}

async function loadLatestOrder(
  supabase: SupabaseClient,
  workspaceId: string,
  leadId: string,
): Promise<ConversationBriefOrderSource | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new DataAccessError("DATABASE", "Order history could not be loaded.");
  return data ? { ...(data as ConversationBriefOrderSource), total_amount: Number(data.total_amount) } : null;
}

function routingContextFromAssignment(assignment: LeadQueueSnapshot): string {
  if (assignment.scheduled_at) return "Scheduled callback";
  if (assignment.attempt_count > 1) return "Follow-up attempt";
  return "New queue assignment";
}

export async function getConversationBriefForWorkspace(
  leadId: string,
  requestedWorkspaceId?: string,
): Promise<ConversationBriefDTO> {
  const context = await requireWorkspaceRole(["operator"], requestedWorkspaceId);
  if (typeof leadId !== "string" || !leadId.trim()) {
    throw new DataAccessError("VALIDATION", "Lead ID is required.");
  }

  const assignment = await getCurrentLeadForWorkspace(context.workspaceId);
  if (!assignment || assignment.lead_id !== leadId) {
    throw new DataAccessError("NOT_FOUND", "Contact unavailable");
  }

  const supabase = await createDataClient();
  const [call, note, order, productScripts] = await Promise.allSettled([
    loadLatestCall(supabase, context.workspaceId, leadId),
    listLeadNotesForWorkspace(leadId, context.workspaceId).then((notes) => notes[0]
      ? {
          id: notes[0].id,
          body: notes[0].body,
          author_name: notes[0].author_name,
          created_at: notes[0].created_at,
        }
      : null),
    loadLatestOrder(supabase, context.workspaceId, leadId),
    listProductScriptsForWorkspace(context.workspaceId).then((scripts) => scripts.map(({ id }) => ({ id }))),
  ]);

  return buildConversationBrief(assignment, {
    call,
    note,
    order,
    queueReason: { status: "fulfilled", value: routingContextFromAssignment(assignment) },
    productScripts,
  });
}
