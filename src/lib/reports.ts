// src/lib/reports.ts

export type ReportType = "sales" | "operator_performance" | "lead_pipeline" | "audit_compliance";
export type ExportFormat = "csv" | "excel" | "pdf";
export type DateRange = "today" | "week" | "month" | "all";

export interface ReportRow {
  [key: string]: string | number;
}

export interface ReportDefinition {
  title: string;
  description: string;
  columns: { key: string; label: string }[];
  data: ReportRow[];
}

export function getReportData(type: ReportType, _range: DateRange): ReportDefinition {
  switch (type) {
    case "sales":
      return {
        title: "Výkaz Tržeb a Prodejů (Sales & Revenue Report)",
        description: "Přehled generovaných tržeb, prodaných kusů a průměrné hodnoty objednávky podle produktů.",
        columns: [
          { key: "product", label: "Produkt" },
          { key: "category", label: "Kategorie" },
          { key: "unitsSold", label: "Prodané kusy" },
          { key: "unitPrice", label: "Jednotková cena ($)" },
          { key: "totalRevenue", label: "Celková tržba ($)" },
          { key: "conversionRate", label: "Konverze (%)" },
        ],
        data: [
          { product: "Bio-Boost Anti-Aging Collagen Stack", category: "Doplňky stravy", unitsSold: 142, unitPrice: 129, totalRevenue: 18318, conversionRate: "24.5%" },
          { product: "Liposomal Vitamin C Supercharge", category: "Doplňky stravy", unitsSold: 98, unitPrice: 49, totalRevenue: 4802, conversionRate: "19.2%" },
          { product: "Collagen Glow Facial Serum", category: "Kosmetika", unitsSold: 76, unitPrice: 89, totalRevenue: 6764, conversionRate: "16.8%" },
          { product: "RoboClean Pro LiDAR V8", category: "Elektronika", unitsSold: 34, unitPrice: 499, totalRevenue: 16966, conversionRate: "11.4%" },
          { product: "Hyaluronic Acid Moisture Booster", category: "Kosmetika", unitsSold: 112, unitPrice: 65, totalRevenue: 7280, conversionRate: "21.0%" },
        ],
      };

    case "operator_performance":
      return {
        title: "Výkon Operátorů a AHT Metriky (Operator Performance)",
        description: "Přehled počtu vyřízených hovorů, průměrné doby odbavení (AHT), konverzního poměru a získaných tržeb.",
        columns: [
          { key: "operatorName", label: "Jméno Operátora" },
          { key: "callsHandled", label: "Hovory" },
          { key: "aht", label: "AHT (Trvání)" },
          { key: "conversions", label: "Konverze" },
          { key: "conversionPct", label: "Úspěšnost (%)" },
          { key: "revenue", label: "Tržby ($)" },
        ],
        data: [
          { operatorName: "Jan Novák", callsHandled: 128, aht: "02:45", conversions: 31, conversionPct: "24.2%", revenue: 14250 },
          { operatorName: "Marie Kovářová", callsHandled: 145, aht: "02:18", conversions: 42, conversionPct: "28.9%", revenue: 19800 },
          { operatorName: "Petr Svoboda", callsHandled: 110, aht: "03:12", conversions: 22, conversionPct: "20.0%", revenue: 9800 },
          { operatorName: "Eva Dvořáková", callsHandled: 136, aht: "02:30", conversions: 35, conversionPct: "25.7%", revenue: 16400 },
          { operatorName: "Tomáš Černý", callsHandled: 94, aht: "02:55", conversions: 18, conversionPct: "19.1%", revenue: 7900 },
        ],
      };

    case "lead_pipeline":
      return {
        title: "Stav Leadů a Konverzní Ftrychtýř (Lead Pipeline Report)",
        description: "Přehled distribuovaných leadů podle fází prodávaného cyklu a jejich hodnota.",
        columns: [
          { key: "stage", label: "Fáze Pipeline" },
          { key: "count", label: "Počet Leadů" },
          { key: "totalValue", label: "Celková Hodnota ($)" },
          { key: "avgProbability", label: "Průměrná Pravděpodobnost" },
        ],
        data: [
          { stage: "Nový Lead (New)", count: 320, totalValue: 41600, avgProbability: "15%" },
          { stage: "Kontaktován (Contacted)", count: 184, totalValue: 27600, avgProbability: "35%" },
          { stage: "Kvalifikován (Qualified)", count: 96, totalValue: 19200, avgProbability: "60%" },
          { stage: "Získaný Obchod (Won)", count: 64, totalValue: 16640, avgProbability: "100%" },
          { stage: "Ztracený (Lost)", count: 48, totalValue: 9600, avgProbability: "0%" },
        ],
      };

    case "audit_compliance":
      return {
        title: "Bezpečnostní Audit a Compliance Protokol (Audit & Compliance)",
        description: "Výkaz detekovaných legislativních upozornění a bezpečnostních úkonů operátorů.",
        columns: [
          { key: "timestamp", label: "Čas Záznamu" },
          { key: "operator", label: "Operátor" },
          { key: "ruleTitle", label: "Pravidlo / Akce" },
          { key: "severity", label: "Závažnost" },
          { key: "details", label: "Detail" },
        ],
        data: [
          { timestamp: "2026-08-07 02:14", operator: "Jan Novák", ruleTitle: "Absolutní Tvrzení (Medical Claim)", severity: "Vysoká", details: "Použito slovo 'vyléčí' u doplňku stravy" },
          { timestamp: "2026-08-07 01:45", operator: "Petr Svoboda", ruleTitle: "Neuvádění Garance", severity: "Střední", details: "Neodprezentována 30denní garance vrácení" },
          { timestamp: "2026-08-06 22:10", operator: "Marie Kovářová", ruleTitle: "Export Dat", severity: "Nízká", details: "Exportovaný seznam kontaktů (CSV)" },
          { timestamp: "2026-08-06 18:30", operator: "Tomáš Černý", ruleTitle: "Zrušení Objednávky", severity: "Střední", details: "Ruční zrušení objednávky #ORD-8492" },
        ],
      };
  }
}

export function downloadAsCSV(report: ReportDefinition, filename: string): void {
  if (typeof window === "undefined") return;

  const headers = report.columns.map((c) => `"${c.label}"`).join(",");
  const rows = report.data.map((row) =>
    report.columns.map((col) => `"${row[col.key] ?? ""}"`).join(",")
  );

  const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadAsExcel(report: ReportDefinition, filename: string): void {
  // Excel compatible Tab-Separated XML/Text format with UTF-8 BOM
  if (typeof window === "undefined") return;

  const headers = report.columns.map((c) => c.label).join("\t");
  const rows = report.data.map((row) =>
    report.columns.map((col) => row[col.key] ?? "").join("\t")
  );

  const excelContent = "\uFEFF" + [headers, ...rows].join("\n");
  const blob = new Blob([excelContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printPDFReport(report: ReportDefinition): void {
  if (typeof window === "undefined") return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const headersHtml = report.columns.map((c) => `<th style="padding:10px;border-bottom:2px solid #27272a;text-align:left;font-size:11px;text-transform:uppercase;color:#a1a1aa;">${c.label}</th>`).join("");
  const rowsHtml = report.data
    .map(
      (row) =>
        `<tr style="border-bottom:1px solid #18181b;">${report.columns
          .map((col) => `<td style="padding:10px;font-size:12px;color:#f4f4f5;">${row[col.key] ?? ""}</td>`)
          .join("")}</tr>`
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${report.title}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #f4f4f5; padding: 30px; margin: 0; }
          .header { margin-bottom: 24px; border-bottom: 1px solid #27272a; padding-bottom: 16px; }
          h1 { font-size: 20px; margin: 0 0 6px 0; color: #ffffff; }
          p { font-size: 12px; color: #a1a1aa; margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          .footer { margin-top: 30px; font-size: 10px; color: #71717a; text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Countdown CRM — ${report.title}</h1>
          <p>${report.description} | Vygenerováno: ${new Date().toLocaleString("cs-CZ")}</p>
        </div>
        <table>
          <thead><tr>${headersHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="footer">Countdown CRM Official Managerial Report</div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
