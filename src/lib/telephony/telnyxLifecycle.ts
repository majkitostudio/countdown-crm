export const TELEPHONY_CALL_STATUSES = [
  "initiated",
  "ringing",
  "connected",
  "held",
  "ended",
  "failed",
] as const;

export type TelephonyCallStatus = (typeof TELEPHONY_CALL_STATUSES)[number];

const BROWSER_STATE_MAP: Readonly<Record<string, TelephonyCallStatus>> = {
  trying: "ringing",
  requesting: "ringing",
  ringing: "ringing",
  active: "connected",
  held: "held",
  hangup: "ended",
  done: "ended",
};

const EVENT_TYPE_MAP: Readonly<Record<string, TelephonyCallStatus>> = {
  "call.initiated": "initiated",
  "call.answered": "connected",
  "call.hold": "held",
  "call.unhold": "connected",
  "call.hangup": "ended",
};

const ALLOWED_PREVIOUS_STATUSES: Readonly<Record<TelephonyCallStatus, readonly TelephonyCallStatus[]>> = {
  initiated: ["initiated"],
  ringing: ["initiated", "ringing"],
  connected: ["initiated", "ringing", "connected", "held"],
  held: ["connected", "held"],
  ended: ["initiated", "ringing", "connected", "held", "ended"],
  failed: ["initiated", "ringing", "connected", "held", "failed"],
};

export function mapTelnyxCallState(state: string): TelephonyCallStatus | null {
  return BROWSER_STATE_MAP[state] || null;
}

export function mapTelnyxEventType(eventType: string): TelephonyCallStatus | null {
  return EVENT_TYPE_MAP[eventType] || null;
}

export function canTransitionCallStatus(from: TelephonyCallStatus, to: TelephonyCallStatus): boolean {
  return ALLOWED_PREVIOUS_STATUSES[to].includes(from);
}

export function getAllowedPreviousStatuses(next: TelephonyCallStatus): readonly TelephonyCallStatus[] {
  return ALLOWED_PREVIOUS_STATUSES[next];
}

export function isTerminalCallStatus(status: TelephonyCallStatus): boolean {
  return status === "ended" || status === "failed";
}

export function isTelephonyCallStatus(value: unknown): value is TelephonyCallStatus {
  return typeof value === "string" && TELEPHONY_CALL_STATUSES.includes(value as TelephonyCallStatus);
}
