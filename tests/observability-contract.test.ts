import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { sanitizeLogData, sanitizeString } from "@/lib/observability";

describe("Observability & Error Boundaries Contract", () => {
  it("verifies existence of critical Next.js error boundary files", () => {
    const errorPage = resolve(process.cwd(), "src/app/error.tsx");
    const notFoundPage = resolve(process.cwd(), "src/app/not-found.tsx");
    const globalErrorPage = resolve(process.cwd(), "src/app/global-error.tsx");

    expect(existsSync(errorPage)).toBe(true);
    expect(existsSync(notFoundPage)).toBe(true);
    expect(existsSync(globalErrorPage)).toBe(true);
  });

  it("ensures error boundaries conform to CRM design system without raw unstyled elements", () => {
    const errorContent = readFileSync(resolve(process.cwd(), "src/app/error.tsx"), "utf8");
    const notFoundContent = readFileSync(resolve(process.cwd(), "src/app/not-found.tsx"), "utf8");

    expect(errorContent).toContain('tone="danger"');
    expect(errorContent).toContain('Surface');
    expect(notFoundContent).toContain('Surface');
  });

  it("sanitizes customer emails and phone numbers from logs", () => {
    const rawText = "Client jan.novak@example.cz called from +420 777 123 456";
    const sanitized = sanitizeString(rawText);

    expect(sanitized).not.toContain("jan.novak@example.cz");
    expect(sanitized).toContain("j***@example.cz");
    expect(sanitized).not.toContain("777 123 456");
    expect(sanitized).toContain("***-***-3456");
  });

  it("redacts sensitive credential keys in structured objects", () => {
    const payload = {
      user: "operator-1",
      password: "SuperSecretPassword123",
      token: "jwt-token-abc-xyz",
      details: {
        apiKey: "sk-live-12345",
        leadPhone: "+420 608 999 888",
      },
    };

    const sanitized = sanitizeLogData(payload);

    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.token).toBe("[REDACTED]");
    expect(sanitized.details.apiKey).toBe("[REDACTED]");
    expect(sanitized.details.leadPhone).toContain("***-***-9888");
  });
});
