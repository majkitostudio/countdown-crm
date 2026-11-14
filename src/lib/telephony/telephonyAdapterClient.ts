import type { TelephonyAdapter } from "./telephonyAdapterShared";

export async function getActiveTelephonyAdapterClient(): Promise<TelephonyAdapter> {
  const response = await fetch("/api/telephony/adapter", { cache: "no-store" });
  if (!response.ok) throw new Error("Adaptér telefonie se nepodařilo načíst. Zkuste to znovu.");

  const body = (await response.json()) as { activeAdapter?: string };
  if (body.activeAdapter !== "simulation" && body.activeAdapter !== "local_sip" && body.activeAdapter !== "telnyx") {
    throw new Error("Odpověď s nastavením adaptéru telefonie je neplatná. Zkuste to znovu.");
  }
  return body.activeAdapter;
}
