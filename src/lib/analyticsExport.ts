import type { AnalyticsOverview } from "./analytics";
import { formatCurrencyAmount, formatCurrencyAmounts } from "./currency";

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
    ["Ukazatel", "Hodnota"],
    ["Rozsah přehledu", data.scopeLabel],
    ...(data.scope === "team" ? [["Zahrnuté týmy", data.accessibleTeams.map((team) => team.name).join("; ")]] : []),
    ["Tržby podle měny", data.sources.orders !== "ready"
      ? "—"
        : data.completedOrdersCount === 0
          ? formatCurrencyAmount(0, "CZK")
          : data.completedOrdersWithoutCurrencyCount > 0 || data.completedOrdersWithoutAmountCount > 0
            ? "—"
            : formatCurrencyAmounts(data.revenueByCurrency)],
    ["AI odhad tržeb (příštích 30 dní)", "Nedostupné"],
    ["Průměrná hodnota objednávky podle měny", data.sources.orders !== "ready"
      ? "—"
        : data.completedOrdersCount === 0
          ? formatCurrencyAmount(0, "CZK")
          : data.completedOrdersWithoutCurrencyCount > 0 || data.completedOrdersWithoutAmountCount > 0
            ? "—"
            : formatCurrencyAmounts(data.avgOrderValueByCurrency)],
    ["Konverze", data.conversionAvailable ? `${data.conversionRate}%` : "Nedostupné"],
    [
      "Úspěšnost řešení námitek",
      data.objectionResolutionRate === null ? "Nedostupné" : `${data.objectionResolutionRate}%`,
    ],
    [],
    ["Operátor", "Hovory", "Objednávky", "Objednávky bez částky", "Objednávky bez měny", "Tržby", "Konverze %"],
    ...data.teamLeaderboard.map((agent) => [
      agent.agentName,
      String(agent.callsCount),
      String(agent.ordersCount),
      String(agent.ordersWithoutAmountCount),
      String(agent.ordersWithoutCurrencyCount),
      agent.ordersCount === 0
        ? formatCurrencyAmount(0, "CZK")
        : agent.ordersWithoutCurrencyCount > 0 || agent.ordersWithoutAmountCount > 0
          ? "—"
          : formatCurrencyAmounts(agent.revenueByCurrency),
      `${agent.conversionRate}%`,
    ]),
  ];

  const csvContent = `data:text/csv;charset=utf-8,${rows.map(csvRow).join("\n")}\n`;

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `countdown_analytics_${data.scope}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
