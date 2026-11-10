import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  setAll: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: never[]) => void } }) => {
    mocks.setAll.mockImplementation(options.cookies.setAll);
    return { auth: { exchangeCodeForSession: mocks.exchangeCodeForSession } };
  },
}));
vi.mock("@/lib/supabase/config", () => ({
  getSupabasePublicConfig: () => ({
    url: "https://example.supabase.co",
    anonKey: "public-test-key",
  }),
}));

import { GET } from "@/app/auth/confirm/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
});

describe("password recovery PKCE confirmation", () => {
  it("exchanges a supplied code and redirects to the password form", async () => {
    mocks.exchangeCodeForSession.mockImplementationOnce(async () => {
      mocks.setAll([
        {
          name: "sb-auth-token",
          value: "issued-session-cookie",
          options: { path: "/", httpOnly: true, secure: true, sameSite: "lax" },
        },
      ]);
      return { error: null };
    });

    const response = await GET(
      new NextRequest("https://crm.example/auth/confirm?code=pkce-code"),
    );

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(response.headers.get("location")).toBe(
      "https://crm.example/auth/update-password",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.cookies.get("sb-auth-token")?.value).toBe("issued-session-cookie");
  });

  it("rejects a missing code without attempting an exchange", async () => {
    const response = await GET(
      new NextRequest("https://crm.example/auth/confirm"),
    );

    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://crm.example/auth/update-password?error=invalid_link",
    );
  });

  it("rejects an expired or reused code without exposing the provider error", async () => {
    mocks.exchangeCodeForSession.mockResolvedValueOnce({
      error: { message: "Auth code already used" },
    });

    const response = await GET(
      new NextRequest("https://crm.example/auth/confirm?code=expired-code"),
    );

    expect(response.headers.get("location")).toBe(
      "https://crm.example/auth/update-password?error=invalid_link",
    );
    expect(response.headers.get("location")).not.toContain("Auth code");
  });

  it("does not accept an external redirect destination", async () => {
    const response = await GET(
      new NextRequest(
        "https://crm.example/auth/confirm?code=pkce-code&next=https%3A%2F%2Fevil.example",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://crm.example/auth/update-password",
    );
  });
});
