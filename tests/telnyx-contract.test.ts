import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizePhoneNumber } from "@/lib/telephony/phoneNumber";
import { verifyTelnyxWebhookSignature } from "@/lib/telephony/telnyxSecurity";

describe("Telnyx integration contracts", () => {
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
});
