export function isTelnyxEnabled(): boolean {
  return process.env.NEXT_PUBLIC_TELNYX_ENABLED === "true";
}

export function encodeTelnyxClientState(value: Record<string, string>): string {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
