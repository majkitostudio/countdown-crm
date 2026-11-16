export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export function isRecordedAmount(amount: number | string | null | undefined): boolean {
  if (amount == null || (typeof amount === "string" && !amount.trim())) return false;
  return Number.isFinite(Number(amount));
}

export function formatCurrencyAmount(
  amount: number | null | undefined,
  currency: string | null | undefined,
  options?: { omitCzk?: boolean },
): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const normalizedCurrency = currency?.trim().toUpperCase() || "CZK";
  if (normalizedCurrency === "CZK") {
    const formattedAmount = new Intl.NumberFormat("cs-CZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return options?.omitCzk ? formattedAmount : `${formattedAmount} CZK`;
  }

  try {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: normalizedCurrency,
    }).format(amount);
  } catch {
    const formattedAmount = new Intl.NumberFormat("cs-CZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${formattedAmount} (neplatný kód měny: ${currency?.trim()})`;
  }
}

export function formatCurrencyAmounts(amounts: CurrencyAmount[]): string {
  return amounts.length > 0
    ? amounts.map((entry) => formatCurrencyAmount(entry.amount, entry.currency)).join(" · ")
    : "—";
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
