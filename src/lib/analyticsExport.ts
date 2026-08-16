import type { AnalyticsOverview } from "./analytics";

export function exportAnalyticsToCSV(data: AnalyticsOverview): void {
  if (typeof window === "undefined") return;

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Metric,Value\n";
  csvContent += `Total Revenue,$${data.totalRevenue}\n`;
  csvContent += `AI Forecast Revenue (Next 30d),${data.forecastAvailable ? `$${data.projectedRevenue}` : "Unavailable"}\n`;
  csvContent += `Average Order Value (AOV),$${data.avgOrderValue}\n`;
  csvContent += `Conversion Rate,${data.conversionRate}%\n`;
  csvContent += `Objection Resolution Rate,${data.objectionResolutionRate === null ? "Unavailable" : `${data.objectionResolutionRate}%`}\n\n`;

  csvContent += "Agent,Calls,Orders,Revenue,Conversion Rate%\n";
  data.teamLeaderboard.forEach((agent) => {
    csvContent += `"${agent.agentName}",${agent.callsCount},${agent.ordersCount},$${agent.revenueGenerated},${agent.conversionRate}%\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `countdown_analytics_report_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
