import { describe, expect, it } from "vitest";
import { buildDefaultScriptHtml, sanitizeScriptHtml } from "@/lib/scriptContent";

const product = {
  id: "product-1",
  title: "RoboClean Pro",
  category: "electronics" as const,
  price: 199,
  currency: "USD",
  description: "A robot vacuum.",
  image_url: "",
  in_stock: true,
  created_at: "2026-08-22T00:00:00.000Z",
};

describe("product script content", () => {
  it("keeps the approved text marks and removes executable or styled markup", () => {
    const sanitized = sanitizeScriptHtml(
      '<p onclick="alert(1)"><strong>Approved</strong> <mark style="background:red">line</mark></p><hr><script>alert(1)</script><a href="https://example.com">unsafe link</a>',
    );

    expect(sanitized).toContain("<strong>Approved</strong>");
    expect(sanitized).toContain("<mark>line</mark>");
    expect(sanitized).toContain("<hr>");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("script");
    expect(sanitized).not.toContain("href");
  });

  it("removes executable attributes even when they are unquoted", () => {
    const sanitized = sanitizeScriptHtml(
      "<p onmouseover=alert(1)>Safe text</p><img src=x onerror=alert(2)>",
    );

    expect(sanitized).toBe("<p>Safe text</p>");
    expect(sanitized).not.toMatch(/on(mouseover|error)/i);
    expect(sanitized).not.toContain("<img");
  });

  it("builds a continuous fallback script for a product", () => {
    const html = buildDefaultScriptHtml(product);

    expect(html).toContain("RoboClean Pro");
    expect(html).toContain("1. První pozitivní dojem");
    expect(html).toContain("2. Zjištění potřeb");
    expect(html).toContain("3. Představení řešení");
    expect(html).toContain("4. Závěrečný pozitivní dojem");
    expect(html).not.toContain("<details");
  });
});
