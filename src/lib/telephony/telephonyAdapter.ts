import "server-only";

export type TelephonyAdapter = "simulation" | "local_sip" | "telnyx";
export type SelectableTelephonyAdapter = Exclude<TelephonyAdapter, "simulation">;

export const TELEPHONY_ADAPTER_LABELS: Record<TelephonyAdapter, string> = {
  simulation: "Simulation",
  local_sip: "Local SIP",
  telnyx: "Telnyx adapter",
};

export const TELNYX_BLOCKER_COPY = "Telnyx activation is currently blocked until the phone number is externally verified.";

export function isSelectableTelephonyAdapter(value: string): value is SelectableTelephonyAdapter {
  return value === "local_sip" || value === "telnyx";
}

export function isTelnyxActivationBlocked(adapter: TelephonyAdapter): boolean {
  return adapter === "telnyx";
}

export function isTelephonyAdapter(value: string): value is TelephonyAdapter {
  return value === "simulation" || isSelectableTelephonyAdapter(value);
}
