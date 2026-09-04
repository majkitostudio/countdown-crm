import "server-only";

export { decodeTelnyxClientState, verifyTelnyxWebhookSignature } from "./telnyxSecurity";
import { normalizePhoneNumber } from "./phoneNumber";

const TELNYX_API_BASE = "https://api.telnyx.com/v2";

export class TelnyxConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelnyxConfigurationError";
  }
}

export function getTelnyxConfig() {
  const apiKey = process.env.TELNYX_API_KEY?.trim();
  const connectionId = process.env.TELNYX_CONNECTION_ID?.trim();
  const callerNumber = process.env.TELNYX_DEFAULT_CALLER_NUMBER?.trim();

  if (!apiKey || !connectionId || !callerNumber) {
    throw new TelnyxConfigurationError(
      "Telnyx is not configured. Set TELNYX_API_KEY, TELNYX_CONNECTION_ID and TELNYX_DEFAULT_CALLER_NUMBER.",
    );
  }

  if (normalizePhoneNumber(callerNumber) !== callerNumber) {
    throw new TelnyxConfigurationError("TELNYX_DEFAULT_CALLER_NUMBER must be an E.164 phone number.");
  }

  return { apiKey, connectionId, callerNumber };
}

async function telnyxRequest<T>(path: string, apiKey: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${TELNYX_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    await response.text();
    throw new Error(`Telnyx API request failed (${response.status}).`);
  }

  return (await response.json()) as T;
}

interface TelnyxCredentialResponse {
  data?: { id?: string };
}

export async function createTelnyxCredential(input: {
  name: string;
  workspaceId: string;
}): Promise<string> {
  const { apiKey, connectionId } = getTelnyxConfig();
  const result = await telnyxRequest<TelnyxCredentialResponse>("/telephony_credentials", apiKey, {
    method: "POST",
    body: JSON.stringify({
      connection_id: connectionId,
      name: input.name.slice(0, 80),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      tag: input.workspaceId,
    }),
  });
  const credentialId = result.data?.id;
  if (!credentialId) throw new Error("Telnyx did not return a telephony credential ID.");
  return credentialId;
}

export async function issueTelnyxToken(credentialId: string): Promise<string> {
  const { apiKey } = getTelnyxConfig();
  const response = await fetch(`${TELNYX_API_BASE}/telephony_credentials/${encodeURIComponent(credentialId)}/token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    await response.text();
    throw new Error(`Telnyx token request failed (${response.status}).`);
  }

  const raw = (await response.text()).trim();
  if (!raw) throw new Error("Telnyx returned an empty WebRTC token.");
  try {
    const parsed = JSON.parse(raw) as { token?: string; data?: { token?: string } };
    return parsed.token || parsed.data?.token || raw.replace(/^"|"$/g, "");
  } catch {
    return raw.replace(/^"|"$/g, "");
  }
}
