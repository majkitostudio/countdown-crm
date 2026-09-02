import type { AnalyticsOverview } from "./analytics";
import { formatCurrencyAmounts } from "./currency";

export function escapeCsvField(value: string): string {
  const escapedValue = value.replace(/"/g, '""');

  return /[",\r\n]/.test(value) ? `"${escapedValue}"` : escapedValue;
}

function csvRow(fields: string[]): string {
  return fields.map(escapeCsvField).join(",");
}

export function exportAnalyticsToCSV(data: AnalyticsOverview): void {
  if (typeof window === "undefined") return;

  const rows = [
    ["Metric", "Value"],
    ["Revenue by currency", formatCurrencyAmounts(data.revenueByCurrency)],
    ["AI Forecast Revenue (Next 30d)", "Unavailable"],
    ["Average Order Value by currency", formatCurrencyAmounts(data.avgOrderValueByCurrency)],
    ["Conversion Rate", `${data.conversionRate}%`],
    [
      "Objection Resolution Rate",
      data.objectionResolutionRate === null ? "Unavailable" : `${data.objectionResolutionRate}%`,
    ],
    [],
    ["Operator", "Calls", "Orders", "Revenue", "Conversion Rate%"],
    ...data.teamLeaderboard.map((agent) => [
      agent.agentName,
      String(agent.callsCount),
      String(agent.ordersCount),
      formatCurrencyAmounts(agent.revenueByCurrency),
      `${agent.conversionRate}%`,
    ]),
  ];

  const csvContent = `data:text/csv;charset=utf-8,${rows.map(csvRow).join("\n")}\n`;

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `countdown_analytics_report_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
