import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatCurrencyAmount } from "@/lib/currency";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats numeric values using the workspace currency (CZK) unless specified.
 */
export function formatCurrency(amount: number, currency = "CZK"): string {
  return formatCurrencyAmount(amount, currency);
}

/**
 * Formats a static duration using at most two useful units.
 * Live timers should keep their own mm:ss display.
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";

  const totalSeconds = Math.floor(seconds);
  if (totalSeconds < 60) return `${totalSeconds} s`;

  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) {
    const remainingSeconds = totalSeconds % 60;
    return remainingSeconds > 0
      ? `${totalMinutes} m ${remainingSeconds} s`
      : `${totalMinutes} m`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    const remainingMinutes = totalMinutes % 60;
    return remainingMinutes > 0
      ? `${totalHours} h ${remainingMinutes} m`
      : `${totalHours} h`;
  }

  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  if (remainingHours > 0) return `${days} d ${remainingHours} h`;

  const remainingMinutes = totalMinutes % 60;
  return remainingMinutes > 0 ? `${days} d ${remainingMinutes} m` : `${days} d`;
}
