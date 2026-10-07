import type { MonthlySettlementSummaryDTO } from "@/lib/dal/wallet";

export interface PayrollExportOptions {
  delimiter?: ";" | ",";
  filenamePrefix?: string;
}

export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  const escaped = stringValue.replace(/"/g, '""');
  return /[",\r\n;]/.test(stringValue) ? `"${escaped}"` : escaped;
}

function formatNumber(num: number): string {
  return Number.isFinite(num) ? String(Math.round(num * 100) / 100) : "0";
}

/**
 * Builds standard CSV content for payroll export.
 * Default delimiter is semicolon (;) for native Czech Excel compatibility.
 */
export function buildPayrollCsv(
  summary: MonthlySettlementSummaryDTO,
  options: PayrollExportOptions = {}
): string {
  const delimiter = options.delimiter || ";";
  const period = summary.periodStart.slice(0, 7);

  const headers = [
    "Operátor",
    "Email",
    "Období",
    "Doručené objednávky (ks)",
    "Vratky (ks)",
    "Čisté objednávky (ks)",
    "Hrubý doručený obrat",
    "Vratky (částka)",
    "Čistý obrat",
    "Fixní bonusy",
    "Sazba provize (%)",
    "Procentuální provize",
    "Manuální úpravy",
    "K výplatě",
    "Měna",
    "Stav uzávěrky",
    "ID transakce",
  ];

  const rows: string[] = [headers.map(escapeCsvField).join(delimiter)];

  let totalDeliveredCount = 0;
  let totalReturnedCount = 0;
  let totalNetOrders = 0;

  for (const op of summary.operators) {
    const netOrders = Math.max(0, op.deliveredCount - op.returnedCount);
    totalDeliveredCount += op.deliveredCount;
    totalReturnedCount += op.returnedCount;
    totalNetOrders += netOrders;

    const statusText = op.isFinalized
      ? "Uzavřeno a vyplaceno"
      : op.commissionAmount > 0
      ? "K uzávěrce"
      : "Nulový nárok";

    const row = [
      op.userName,
      op.userEmail || "",
      period,
      formatNumber(op.deliveredCount),
      formatNumber(op.returnedCount),
      formatNumber(netOrders),
      formatNumber(op.deliveredTotal),
      formatNumber(op.returnedTotal),
      formatNumber(op.netTurnover),
      formatNumber(op.fixedBonuses),
      formatNumber(op.commissionRate),
      formatNumber(op.commissionAmount),
      formatNumber(op.manualAdjustments),
      formatNumber(op.totalPayout),
      summary.currency,
      statusText,
      op.transactionId || "",
    ];

    rows.push(row.map(escapeCsvField).join(delimiter));
  }

  // Summary row at the bottom
  const summaryRow = [
    "CELKEM TÝM",
    "",
    period,
    formatNumber(totalDeliveredCount),
    formatNumber(totalReturnedCount),
    formatNumber(totalNetOrders),
    formatNumber(summary.totalDeliveredTotal),
    formatNumber(summary.totalReturnedTotal),
    formatNumber(summary.totalNetTurnover),
    formatNumber(summary.totalFixedBonuses),
    formatNumber(summary.commissionRate),
    formatNumber(summary.totalCommission),
    formatNumber(summary.totalManualAdjustments),
    formatNumber(summary.totalPayout),
    summary.currency,
    "",
    "",
  ];

  rows.push(summaryRow.map(escapeCsvField).join(delimiter));

  return rows.join("\r\n") + "\r\n";
}

/**
 * Triggers a browser download of the payroll export CSV.
 * Automatically adds the UTF-8 BOM (\uFEFF) to guarantee that Microsoft Excel
 * on Windows opens Czech characters (č, ř, ž, š, etc.) with correct encoding.
 */
export function exportPayrollToCsv(
  summary: MonthlySettlementSummaryDTO,
  options: PayrollExportOptions = {}
): void {
  if (typeof window === "undefined" || !summary) return;

  const prefix = options.filenamePrefix || "podklady_pro_mzdy";
  const period = summary.periodStart.slice(0, 7);
  const csvContent = buildPayrollCsv(summary, options);

  // UTF-8 BOM ensures proper display of Czech diacritics in Microsoft Excel
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const blob = new Blob([bom, csvContent], { type: "text/csv;charset=utf-8;" });

  const filename = `${prefix}_${period}_${summary.currency.toLowerCase()}.csv`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
