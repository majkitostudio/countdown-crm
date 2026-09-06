import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    replace: mocks.replace,
  }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
    },
  }),
}));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: <T,>(initialValue: T) => [initialValue, vi.fn()] as const,
  };
});

import LoginPage from "@/app/login/page";

type TestElement = ReactElement<{
  children?: ReactNode;
  onSubmit?: (event: { preventDefault(): void }) => Promise<void>;
}>;

function findElement(node: ReactNode, type: string): TestElement | null {
  if (!node || typeof node !== "object" || !("type" in node)) return null;
  const element = node as TestElement;
  if (element.type === type) return element;

  const children = element.props.children;
  const childList = Array.isArray(children) ? children : [children];
  for (const child of childList) {
    const match = findElement(child, type);
    if (match) return match;
  }
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signInWithPassword.mockResolvedValue({ error: null });
});

describe("login role-aware entry", () => {
  it("enters through the server role router after successful authentication", async () => {
    const form = findElement(LoginPage(), "form");
    expect(form).not.toBeNull();

    await form?.props.onSubmit?.({ preventDefault: vi.fn() });

    expect(mocks.replace).toHaveBeenCalledWith("/");
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
