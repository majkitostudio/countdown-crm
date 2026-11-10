// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      getUser: mocks.getUser,
      updateUser: mocks.updateUser,
    },
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

import ForgotPasswordPage from "@/app/auth/forgot-password/page";
import UpdatePasswordPage from "@/app/auth/update-password/page";

let container: HTMLDivElement;
let root: Root;

async function render(element: React.ReactNode) {
  await act(async () => root.render(createElement(() => element)));
}

function setInput(id: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(`#${id}`);
  if (!input) throw new Error(`Expected input #${id}`);
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function submitForm() {
  const form = container.querySelector("form");
  if (!form) throw new Error("Expected a form");
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "user-1", email: "operator@example.test" } },
    error: null,
  });
  mocks.updateUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  window.history.replaceState(null, "", "/auth/forgot-password");
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
    .IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("forgot password page", () => {
  it("requests a reset using the same-origin PKCE confirmation route", async () => {
    await render(createElement(ForgotPasswordPage));
    setInput("recovery-email", "operator@example.test");
    await submitForm();

    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "operator@example.test",
      { redirectTo: "http://localhost:3000/auth/confirm" },
    );
    expect(container.textContent).toContain(
      "Pokud lze účet obnovit, přijde e-mail s odkazem.",
    );
  });

  it("shows a generic failure when Supabase returns an Auth error", async () => {
    mocks.resetPasswordForEmail.mockResolvedValueOnce({
      data: {},
      error: { message: "Email rate limit exceeded" },
    });
    await render(createElement(ForgotPasswordPage));
    setInput("recovery-email", "unknown@example.test");
    await submitForm();

    expect(container.textContent).toContain("Žádost se nepodařilo odeslat.");
    expect(container.textContent).not.toContain("Email rate limit exceeded");
    expect(container.textContent).not.toContain("Pokud lze účet obnovit");
  });
});

describe("update password page", () => {
  it("shows the invalid-link state without a verified Supabase user", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    window.history.replaceState(null, "", "/auth/update-password");
    await render(createElement(UpdatePasswordPage));

    expect(container.textContent).toContain("Odkaz je neplatný nebo vypršel.");
    expect(container.querySelector("form")).toBeNull();
  });

  it("keeps a bad recovery link invalid even when a user session exists", async () => {
    window.history.replaceState(null, "", "/auth/update-password?error=invalid_link");
    await render(createElement(UpdatePasswordPage));
    await act(async () => Promise.resolve());

    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Odkaz je neplatný nebo vypršel.");
    expect(container.querySelector("form")).toBeNull();
  });

  it("updates the password only after the user confirms both entries", async () => {
    window.history.replaceState(null, "", "/auth/update-password");
    await render(createElement(UpdatePasswordPage));
    await act(async () => Promise.resolve());
    setInput("new-password", "correct horse battery");
    setInput("confirm-password", "correct horse battery");
    await submitForm();

    expect(mocks.updateUser).toHaveBeenCalledWith({
      password: "correct horse battery",
    });
    expect(mocks.replace).toHaveBeenCalledWith("/");
  });

  it("rejects mismatched passwords without sending an update", async () => {
    window.history.replaceState(null, "", "/auth/update-password");
    await render(createElement(UpdatePasswordPage));
    await act(async () => Promise.resolve());
    setInput("new-password", "correct horse battery");
    setInput("confirm-password", "different password");
    await submitForm();

    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Hesla se neshodují.");
  });
});
