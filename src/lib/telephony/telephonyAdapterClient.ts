import type { TelephonyAdapter } from "./telephonyAdapter";

export async function getActiveTelephonyAdapterClient(): Promise<TelephonyAdapter> {
  const response = await fetch("/api/telephony/adapter", { cache: "no-store" });
  if (!response.ok) throw new Error("Telephony adapter could not be loaded.");

  const body = (await response.json()) as { activeAdapter?: string };
  if (body.activeAdapter !== "simulation" && body.activeAdapter !== "local_sip" && body.activeAdapter !== "telnyx") {
    throw new Error("Telephony adapter response is invalid.");
  }
  return body.activeAdapter;
}
