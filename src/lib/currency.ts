export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export function formatCurrencyAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("cs-CZ", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatCurrencyAmounts(amounts: CurrencyAmount[]): string {
  return amounts.length > 0
    ? amounts.map((entry) => formatCurrencyAmount(entry.amount, entry.currency)).join(" · ")
    : "Unavailable";
}

export function aggregateCurrencyAmounts<T>(
  entries: T[],
  getAmount: (entry: T) => number,
  getCurrency: (entry: T) => string | null | undefined,
): CurrencyAmount[] {
  const totals = new Map<string, number>();

  for (const entry of entries) {
    const currency = getCurrency(entry)?.trim().toUpperCase();
    if (!currency) continue;
    totals.set(currency, (totals.get(currency) || 0) + Number(getAmount(entry) || 0));
  }

  return Array.from(totals.entries())
    .map(([currency, amount]) => ({
      currency,
      amount: Math.round(amount * 100) / 100,
    }))
    .sort((left, right) => left.currency.localeCompare(right.currency));
}

export function singleCurrency(amounts: CurrencyAmount[]): string | null {
  return amounts.length === 1 ? amounts[0]?.currency || null : null;
}
