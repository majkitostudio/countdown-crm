import { describe, expect, it } from "vitest";
import { formatCurrency } from "@/lib/utils";
import { formatCurrencyAmount } from "@/lib/currency";

describe("legacy formatCurrency helper", () => {
  it("uses CZK by default and preserves an explicitly requested currency", () => {
    expect(formatCurrency(125)).toBe(formatCurrencyAmount(125, "CZK"));
    expect(formatCurrency(12.5, "EUR")).toBe(formatCurrencyAmount(12.5, "EUR"));
  });
});
