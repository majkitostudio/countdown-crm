import { createPublicKey, verify } from "node:crypto";

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

function publicKeyFromConfig(value: string): ReturnType<typeof createPublicKey> {
  const trimmed = value.trim();
  if (trimmed.includes("BEGIN PUBLIC KEY")) return createPublicKey(trimmed);
  const rawKey = Buffer.from(trimmed, "base64");
  const spki = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), rawKey]);
  return createPublicKey({ key: spki, format: "der", type: "spki" });
}

export function verifyTelnyxWebhookSignature(input: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  publicKey: string | undefined;
  nowSeconds?: number;
}): boolean {
  if (!input.signature || !input.timestamp || !input.publicKey) return false;
  const timestampSeconds = Number(input.timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > WEBHOOK_TOLERANCE_SECONDS) return false;
  try {
    return verify(null, Buffer.from(`${input.timestamp}|${input.rawBody}`), publicKeyFromConfig(input.publicKey), Buffer.from(input.signature, "base64"));
  } catch {
    return false;
  }
}

export function decodeTelnyxClientState(value: unknown): Record<string, unknown> {
  if (typeof value !== "string" || !value) return {};
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}
