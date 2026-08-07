// src/lib/callTranscriptsStore.ts

export interface CallTranscript {
  id: string;
  callId?: string;
  transcript: string;
  created_at: string;
}

let transcriptsStore: CallTranscript[] = [];

/** Retrieve all stored call transcripts */
export function getCallTranscripts(): CallTranscript[] {
  return transcriptsStore;
}

/** Add one or more call transcripts to the store */
export function addCallTranscripts(newTranscripts: Partial<CallTranscript>[]): void {
  const now = new Date().toISOString();
  const formatted = newTranscripts.map((t) => ({
    id: t.id ?? `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    callId: t.callId,
    transcript: t.transcript ?? "",
    created_at: t.created_at ?? now,
  }));
  transcriptsStore = [...formatted, ...transcriptsStore];
}
