import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: mocks.getUser },
  }),
}));
vi.mock("@/lib/auth/config", () => ({
  isDemoAuthEnabled: () => false,
}));
vi.mock("@/lib/supabase/config", () => ({
  getSupabasePublicConfig: () => ({
    url: "https://example.supabase.co",
    anonKey: "public-test-key",
  }),
}));

import { proxy } from "@/proxy";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

describe("authenticated login route", () => {
  it("enters through the role-aware server home", async () => {
    const response = await proxy(new NextRequest("http://localhost/login"));

    expect(response.headers.get("location")).toBe("http://localhost/");
  });
});
