export type TelephonyAdapter = "simulation" | "local_sip" | "telnyx";
export type SelectableTelephonyAdapter = Exclude<TelephonyAdapter, "simulation">;

export const TELEPHONY_ADAPTER_LABELS: Record<TelephonyAdapter, string> = {
  simulation: "Simulace",
  local_sip: "Místní SIP",
  telnyx: "Adaptér Telnyx",
};

export const TELNYX_BLOCKER_COPY = "Aktivace Telnyxu je zablokována, dokud nebude telefonní číslo externě ověřeno.";

export function isSelectableTelephonyAdapter(value: string): value is SelectableTelephonyAdapter {
  return value === "local_sip" || value === "telnyx";
}

export function isTelnyxActivationBlocked(adapter: TelephonyAdapter): boolean {
  return adapter === "telnyx";
}

export function isTelephonyAdapter(value: string): value is TelephonyAdapter {
  return value === "simulation" || isSelectableTelephonyAdapter(value);
}
