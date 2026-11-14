import { describe, expect, it, vi } from "vitest";
import {
  isPublicWebhookAddress,
  sendSecureWebhook,
  type SecureWebhookTransport,
} from "@/lib/workflows/secureWebhook";

function transport(
  addresses: Array<{ address: string; family: number }> = [{ address: "93.184.216.34", family: 4 }],
  status = 204,
): SecureWebhookTransport {
  return {
    lookup: vi.fn().mockResolvedValue(addresses),
    request: vi.fn().mockResolvedValue(status),
  };
}

describe("outbound workflow webhook security", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.20.10.4",
    "192.168.1.5",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "240.0.0.1",
    "168.63.129.16",
    "::",
    "::1",
    "fc00::1",
    "fe80::1",
    "2002::1",
    "2001:db8::1",
    "3fff::1",
  ])("rejects non-public IP address %s", (address) => {
    expect(isPublicWebhookAddress(address)).toBe(false);
  });

  it.each([
    "8.8.8.8",
    "93.184.216.34",
    "2606:4700:4700::1111",
  ])("allows public IP address %s", (address) => {
    expect(isPublicWebhookAddress(address)).toBe(true);
  });

  it.each([
    "http://hooks.example.net/path",
    "https://localhost/path",
    "https://127.0.0.1/path",
    "https://internal/path",
    "https://service.internal/path",
    "https://service.local/path",
    "https://user:password@hooks.example.net/path",
    "https://hooks.example.net:8443/path",
  ])("rejects unsafe URL %s before DNS lookup or request", async (url) => {
    const mockedTransport = transport();

    await expect(sendSecureWebhook(url, "POST", {}, mockedTransport)).rejects.toThrow();
    expect(mockedTransport.lookup).not.toHaveBeenCalled();
    expect(mockedTransport.request).not.toHaveBeenCalled();
  });

  it("rejects a hostname when DNS resolves only to private or reserved addresses", async () => {
    const mockedTransport = transport([
      { address: "10.0.0.8", family: 4 },
      { address: "fd00::1", family: 6 },
    ]);

    await expect(
      sendSecureWebhook("https://hooks.example.net/path", "POST", {}, mockedTransport),
    ).rejects.toThrow("veřejnou internetovou IP");
    expect(mockedTransport.lookup).toHaveBeenCalledWith("hooks.example.net");
    expect(mockedTransport.request).not.toHaveBeenCalled();
  });

  it("pins a public DNS result and preserves the original TLS hostname", async () => {
    const mockedTransport = transport([
      { address: "192.168.1.10", family: 4 },
      { address: "93.184.216.34", family: 4 },
    ]);

    const status = await sendSecureWebhook(
      "https://hooks.example.net:443/callback?source=crm",
      "POST",
      { callId: "synthetic-call" },
      mockedTransport,
    );

    expect(status).toBe(204);
    expect(mockedTransport.request).toHaveBeenCalledWith(expect.objectContaining({
      address: "93.184.216.34",
      hostname: "hooks.example.net",
      hostHeader: "hooks.example.net",
      path: "/callback?source=crm",
      method: "POST",
      body: JSON.stringify({ callId: "synthetic-call" }),
      signal: expect.any(AbortSignal),
    }));
  });

  it("treats a redirect response as-is instead of following it", async () => {
    const mockedTransport = transport(undefined, 302);

    const status = await sendSecureWebhook(
      "https://hooks.example.net/path",
      "POST",
      {},
      mockedTransport,
    );

    expect(status).toBe(302);
    expect(mockedTransport.request).toHaveBeenCalledTimes(1);
  });

  it("uses a single finite deadline for DNS and the HTTPS request", async () => {
    const mockedTransport = transport();
    mockedTransport.lookup = vi.fn().mockImplementation(() => new Promise(() => {}));

    await expect(
      sendSecureWebhook("https://hooks.example.net/path", "POST", {}, mockedTransport, 5),
    ).rejects.toMatchObject({ name: "TimeoutError" });
    expect(mockedTransport.request).not.toHaveBeenCalled();
  });
});
