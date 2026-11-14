export type OperatorNextActionState =
  | "waiting_assignment"
  | "ready"
  | "dialing"
  | "in_call"
  | "awaiting_outcome"
  | "schedule_modal"
  | "completion_pending"
  | "recovery_required"
  | "post_call_summary";

export interface OperatorScheduledCallSignal {
  id: string;
  leadName: string;
  scheduledAt: string;
  phone?: string | null;
  leadId?: string;
}

export interface OperatorNextAction {
  kind:
    | "recover_call"
    | "start_call"
    | "end_call"
    | "complete_outcome"
    | "wait_for_connection"
    | "claim_scheduled_call"
    | "continue"
    | "wait_for_assignment";
  title: string;
  description: string;
  urgency: "neutral" | "attention" | "critical";
  scheduledCall?: OperatorScheduledCallSignal;
}

export interface OperatorNextActionInput {
  state: OperatorNextActionState;
  leadName?: string | null;
  scheduledCalls?: OperatorScheduledCallSignal[];
  now?: Date;
}

function validScheduledCall(scheduledCall: OperatorScheduledCallSignal): boolean {
  return Boolean(scheduledCall.id && scheduledCall.leadName && Number.isFinite(Date.parse(scheduledCall.scheduledAt)));
}

function selectDueScheduledCall(scheduledCalls: OperatorScheduledCallSignal[], now: Date): OperatorScheduledCallSignal | undefined {
  return scheduledCalls
    .filter(validScheduledCall)
    .sort((left, right) => Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt))
    .find((scheduledCall) => Date.parse(scheduledCall.scheduledAt) <= now.getTime());
}

export function getOperatorNextAction(input: OperatorNextActionInput): OperatorNextAction {
  const now = input.now ?? new Date();
  const dueScheduledCall = selectDueScheduledCall(input.scheduledCalls ?? [], now);

  if (input.state === "recovery_required") {
    return {
      kind: "recover_call",
      title: "Obnovit přerušený hovor",
      description: input.leadName
        ? `Zákazník ${input.leadName} vám zůstává přiřazen, dokud nebude hovor bezpečně obnoven.`
        : "Před zahájením dalšího hovoru je nutné obnovit přerušené přiřazení.",
      urgency: "critical",
    };
  }

  if (input.state === "awaiting_outcome" || input.state === "schedule_modal") {
    return {
      kind: "complete_outcome",
      title: "Dokončit výsledek hovoru",
      description: "Než přejdete na další kontakt, zvolte výsledek hovoru.",
      urgency: "attention",
    };
  }

  if (input.state === "completion_pending") {
    return {
      kind: "complete_outcome",
      title: "Ukládání výsledku hovoru",
      description: "Server ukládá výsledek a další přiřazení.",
      urgency: "attention",
    };
  }

  if (input.state === "in_call") {
    return {
      kind: "end_call",
      title: "Dokončit aktivní hovor",
      description: input.leadName ? `Až budete připraveni, ukončete hovor se zákazníkem ${input.leadName}.` : "Až budete připraveni, ukončete aktivní hovor.",
      urgency: "attention",
    };
  }

  if (input.state === "dialing") {
    return {
      kind: "wait_for_connection",
      title: "Čekání na spojení",
      description: "Hovor se spojuje. Zrušte jej pouze tehdy, pokud zákazník není dostupný.",
      urgency: "attention",
    };
  }

  if (input.state === "ready" && input.leadName) {
    return {
      kind: "start_call",
      title: "Zahájit další hovor",
      description: `Zavolejte zákazníkovi ${input.leadName} a použijte schválené informace o produktu.`,
      urgency: "neutral",
    };
  }

  if (input.state === "post_call_summary") {
    return {
      kind: "continue",
      title: "Pokračovat na další lead",
      description: "Předchozí hovor je uložen. Pokračujte, až budete připraveni na další přiřazení.",
      urgency: "neutral",
    };
  }

  if (input.state === "waiting_assignment" && dueScheduledCall) {
    return {
      kind: "claim_scheduled_call",
      title: "Zkontrolovat naplánovaný hovor v termínu",
      description: `Zákazník ${dueScheduledCall.leadName} má naplánovaný hovor na ${new Date(dueScheduledCall.scheduledAt).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}. Obnovte frontu a převezměte jej, jakmile bude dostupný.`,
      urgency: "critical",
      scheduledCall: dueScheduledCall,
    };
  }

  return {
    kind: "wait_for_assignment",
    title: "Čekání na přiřazení",
    description: "Momentálně nemáte přiřazený kontakt k volání. Jakmile bude dostupný, služba směrování jej sem přiřadí.",
    urgency: "neutral",
  };
}
