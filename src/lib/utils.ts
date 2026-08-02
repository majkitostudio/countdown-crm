import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats numeric values to standard currency format ($USD)
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats seconds into mm:ss or Xm Ys string representation
 */
export function formatDuration(seconds: number, verbose: boolean = false): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (verbose) {
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
