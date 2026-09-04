export type OperatorNextActionState =
  | "waiting_assignment"
  | "ready"
  | "dialing"
  | "in_call"
  | "awaiting_outcome"
  | "callback_modal"
  | "completion_pending"
  | "recovery_required"
  | "post_call_summary";

export interface OperatorCallbackSignal {
  id: string;
  leadName: string;
  scheduledAt: string;
}

export interface OperatorNextAction {
  kind:
    | "recover_call"
    | "start_call"
    | "end_call"
    | "complete_outcome"
    | "wait_for_connection"
    | "claim_callback"
    | "continue"
    | "wait_for_assignment";
  title: string;
  description: string;
  urgency: "neutral" | "attention" | "critical";
  callback?: OperatorCallbackSignal;
}

export interface OperatorNextActionInput {
  state: OperatorNextActionState;
  leadName?: string | null;
  callbacks?: OperatorCallbackSignal[];
  now?: Date;
}

function validCallback(callback: OperatorCallbackSignal): boolean {
  return Boolean(callback.id && callback.leadName && Number.isFinite(Date.parse(callback.scheduledAt)));
}

function selectDueCallback(callbacks: OperatorCallbackSignal[], now: Date): OperatorCallbackSignal | undefined {
  return callbacks
    .filter(validCallback)
    .sort((left, right) => Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt))
    .find((callback) => Date.parse(callback.scheduledAt) <= now.getTime());
}

export function getOperatorNextAction(input: OperatorNextActionInput): OperatorNextAction {
  const now = input.now ?? new Date();
  const dueCallback = selectDueCallback(input.callbacks ?? [], now);

  if (input.state === "recovery_required") {
    return {
      kind: "recover_call",
      title: "Recover interrupted call",
      description: input.leadName
        ? `${input.leadName} remains assigned to you until the call is safely recovered.`
        : "The interrupted assignment must be recovered before another call can start.",
      urgency: "critical",
    };
  }

  if (input.state === "awaiting_outcome" || input.state === "callback_modal") {
    return {
      kind: "complete_outcome",
      title: "Complete call outcome",
      description: "Choose the explicit outcome before continuing to another contact.",
      urgency: "attention",
    };
  }

  if (input.state === "completion_pending") {
    return {
      kind: "complete_outcome",
      title: "Saving call outcome",
      description: "The server is recording the outcome and the next assignment.",
      urgency: "attention",
    };
  }

  if (input.state === "in_call") {
    return {
      kind: "end_call",
      title: "Finish the active call",
      description: input.leadName ? `When ready, end the call with ${input.leadName}.` : "When ready, end the active call.",
      urgency: "attention",
    };
  }

  if (input.state === "dialing") {
    return {
      kind: "wait_for_connection",
      title: "Waiting for connection",
      description: "The call is being connected. Cancel only if the customer cannot be reached.",
      urgency: "attention",
    };
  }

  if (input.state === "ready" && input.leadName) {
    return {
      kind: "start_call",
      title: "Start the next call",
      description: `Call ${input.leadName} using the approved product information.`,
      urgency: "neutral",
    };
  }

  if (input.state === "post_call_summary") {
    return {
      kind: "continue",
      title: "Continue to the next lead",
      description: "The previous call is saved. Continue when you are ready for the next assignment.",
      urgency: "neutral",
    };
  }

  if (input.state === "waiting_assignment" && dueCallback) {
    return {
      kind: "claim_callback",
      title: "Check the due callback",
      description: `${dueCallback.leadName} has a callback due at ${new Date(dueCallback.scheduledAt).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}. Refresh the queue to claim it when available.`,
      urgency: "critical",
      callback: dueCallback,
    };
  }

  return {
    kind: "wait_for_assignment",
    title: "Waiting for assignment",
    description: "No callable contact is currently assigned. The routing service will place one here when available.",
    urgency: "neutral",
  };
}
