import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { join } from "node:path";
import { normalizePhoneNumber } from "@/lib/telephony/phoneNumber";
import { verifyTelnyxWebhookSignature } from "@/lib/telephony/telnyxSecurity";
import { getTelnyxConfig, issueTelnyxToken, TelnyxConfigurationError } from "@/lib/telephony/telnyxServer";

vi.mock("server-only", () => ({}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Telnyx integration contracts", () => {
  it("keeps telephony RLS policies on the private workspace helper", () => {
    const migration = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260903090000_telnyx_telephony_foundation.sql"),
      "utf8",
    );

    expect(migration).toContain("private.is_workspace_member(workspace_id)");
    expect(migration).not.toContain("public.is_workspace_member(workspace_id)");
  });

  it("normalizes Czech and international numbers to E.164", () => {
    expect(normalizePhoneNumber("777 123 456")).toBe("+420777123456");
    expect(normalizePhoneNumber("00 420 777 123 456")).toBe("+420777123456");
    expect(normalizePhoneNumber("+421 901 123 456")).toBe("+421901123456");
    expect(normalizePhoneNumber("123")).toBeNull();
  });

  it("verifies Telnyx timestamped Ed25519 payloads and rejects replay/tampering", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const timestamp = "1799000000";
    const rawBody = JSON.stringify({ data: { event_type: "call.answered" } });
    const signature = sign(null, Buffer.from(`${timestamp}|${rawBody}`), privateKey).toString("base64");
    const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();

    expect(verifyTelnyxWebhookSignature({ rawBody, signature, timestamp, publicKey: publicKeyPem, nowSeconds: 1799000000 })).toBe(true);
    expect(verifyTelnyxWebhookSignature({ rawBody: `${rawBody} `, signature, timestamp, publicKey: publicKeyPem, nowSeconds: 1799000000 })).toBe(false);
    expect(verifyTelnyxWebhookSignature({ rawBody, signature, timestamp, publicKey: publicKeyPem, nowSeconds: 1799000000 + 301 })).toBe(false);
  });

  it("requires an E.164 caller number in the server configuration", () => {
    vi.stubEnv("TELNYX_API_KEY", "test-api-key");
    vi.stubEnv("TELNYX_CONNECTION_ID", "connection-1");
    vi.stubEnv("TELNYX_DEFAULT_CALLER_NUMBER", "777 123 456");

    expect(() => getTelnyxConfig()).toThrow(TelnyxConfigurationError);
  });

  it("does not expose the provider error body when issuing a token fails", async () => {
    vi.stubEnv("TELNYX_API_KEY", "test-api-key");
    vi.stubEnv("TELNYX_CONNECTION_ID", "connection-1");
    vi.stubEnv("TELNYX_DEFAULT_CALLER_NUMBER", "+420777123456");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("secret-provider-body", { status: 500 }));

    await expect(issueTelnyxToken("credential-1")).rejects.toThrow("Telnyx token request failed (500).");
    await expect(issueTelnyxToken("credential-1")).rejects.not.toThrow("secret-provider-body");
  });
});
