import { describe, expect, it } from "vitest";
import { formatCurrencyAmount, formatCurrencyAmounts } from "@/lib/currency";

describe("currency display formatting", () => {
  it("shows CZK unless the surrounding context makes it redundant", () => {
    const amount = 1234.5;
    const expected = new Intl.NumberFormat("cs-CZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    expect(formatCurrencyAmount(amount, "CZK")).toBe(`${expected} CZK`);
    expect(formatCurrencyAmount(amount, "CZK", { omitCzk: true })).toBe(expected);
  });

  it("keeps the actual symbol for another stored currency", () => {
    const amount = 1234.5;

    expect(formatCurrencyAmount(amount, "EUR")).toBe(
      new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "EUR" }).format(amount),
    );
    expect(formatCurrencyAmount(amount, "EUR", { omitCzk: true })).toBe(
      new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "EUR" }).format(amount),
    );
  });

  it("displays a missing currency as CZK but identifies an invalid stored code", () => {
    const amount = 1234.5;
    const formattedAmount = new Intl.NumberFormat("cs-CZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    expect(formatCurrencyAmount(amount, null)).toBe(
      `${formattedAmount} CZK`,
    );
    expect(formatCurrencyAmount(amount, "not-a-currency")).toBe(
      `${formattedAmount} (neplatný kód měny: not-a-currency)`,
    );
  });

  it("uses an em dash for an empty aggregate", () => {
    expect(formatCurrencyAmounts([])).toBe("—");
    expect(formatCurrencyAmount(null, "CZK")).toBe("—");
    expect(formatCurrencyAmount(NaN, "CZK")).toBe("—");
  });
});
