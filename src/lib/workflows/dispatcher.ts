import "server-only";

import {
  createWorkflowExecutionForWorkspace,
  findWorkflowExecutionForEvent,
  listWorkflowsForWorkspace,
} from "@/lib/dal/workflows";
import type {
  TriggerType,
  WorkflowDispatchResult,
} from "./types";
import { evaluateWorkflowEvent } from "./evaluator";

export interface WorkflowDispatchInput {
  trigger: TriggerType;
  eventId: string;
  payload: Record<string, unknown>;
}

const SERVER_SUPPORTED_TRIGGERS: TriggerType[] = ["on_call_ended"];
// This closes duplicate requests within one server process. The durable lookup
// below covers retries after a completed request; a DB claim key is still
// required for strict cross-instance exactly-once delivery.
const inFlightEvents = new Map<string, Promise<WorkflowDispatchResult>>();

function unavailableResult(input: WorkflowDispatchInput, reason: string): WorkflowDispatchResult {
  return {
    trigger: input.trigger,
    eventId: input.eventId,
    status: "unavailable",
    reason,
    durableEffect: false,
    entries: [],
  };
}

function failureResult(input: WorkflowDispatchInput, reason: string): WorkflowDispatchResult {
  return {
    trigger: input.trigger,
    eventId: input.eventId,
    status: "failure",
    reason,
    durableEffect: false,
    entries: [],
  };
}

async function dispatchServerEvent(input: WorkflowDispatchInput): Promise<WorkflowDispatchResult> {
  if (!input.eventId.trim()) return failureResult(input, "Workflow event ID is required.");
  if (!SERVER_SUPPORTED_TRIGGERS.includes(input.trigger)) {
    return unavailableResult(
      input,
      `Server dispatch for ${input.trigger} is unavailable; no production event source is wired yet.`,
    );
  }

  try {
    const rules = await listWorkflowsForWorkspace();
    return evaluateWorkflowEvent(rules, input.trigger, input.payload, {
      mode: "server",
      eventId: input.eventId,
      findExisting: (rule, eventId) => findWorkflowExecutionForEvent(rule, eventId),
      persist: (entry) => createWorkflowExecutionForWorkspace(entry),
    });
  } catch (error) {
    return failureResult(
      input,
      error instanceof Error ? `Server workflow dispatch failed: ${error.message}` : "Server workflow dispatch failed.",
    );
  }
}

/** Production-only boundary. Business mutations call this after durable completion. */
export async function dispatchWorkflowEventForWorkspace(
  input: WorkflowDispatchInput,
): Promise<WorkflowDispatchResult> {
  const key = `${input.trigger}:${input.eventId}`;
  const existing = inFlightEvents.get(key);
  if (existing) return existing;

  const current = dispatchServerEvent(input);
  inFlightEvents.set(key, current);
  try {
    return await current;
  } finally {
    inFlightEvents.delete(key);
  }
}

/** Explicit test-only path. It never invokes a provider or mutates business data. */
export async function simulateWorkflowEventForWorkspace(
  input: WorkflowDispatchInput,
): Promise<WorkflowDispatchResult> {
  if (!input.eventId.trim()) return failureResult(input, "Workflow simulation event ID is required.");
  try {
    const rules = await listWorkflowsForWorkspace();
    return evaluateWorkflowEvent(rules, input.trigger, input.payload, {
      mode: "simulation",
      eventId: input.eventId,
      persist: (entry) => createWorkflowExecutionForWorkspace(entry),
    });
  } catch (error) {
    return failureResult(
      input,
      error instanceof Error ? `Workflow simulation failed: ${error.message}` : "Workflow simulation failed.",
    );
  }
}
