"use client";

import React, { useState } from "react";
import {
  X,
  Download,
  FileSpreadsheet,
  Printer,
  FileText,
  Calendar,
  Check,
  Eye,
  Sparkles,
  BarChart3,
  Users,
  GitBranch,
  ShieldCheck,
} from "lucide-react";
import {
  ReportType,
  DateRange,
  ExportFormat,
  getReportData,
  downloadAsCSV,
  downloadAsExcel,
  printPDFReport,
} from "@/lib/reports";
import { cn } from "@/lib/utils";

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportGeneratorModal({ isOpen, onClose }: ReportGeneratorModalProps) {
  const [selectedType, setSelectedType] = useState<ReportType>("sales");
  const [selectedRange, setSelectedRange] = useState<DateRange>("month");
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const report = getReportData(selectedType, selectedRange);

  const handleExport = (format: ExportFormat) => {
    const filename = `countdown_crm_${selectedType}_${selectedRange}_${Date.now()}`;
    if (format === "csv") {
      downloadAsCSV(report, filename);
      setDownloadSuccessToast("Report byl úspěšně stažen ve formátu CSV.");
    } else if (format === "excel") {
      downloadAsExcel(report, filename);
      setDownloadSuccessToast("Report byl úspěšně stažen ve formátu Excel (.xls).");
    } else if (format === "pdf") {
      printPDFReport(report);
      setDownloadSuccessToast("Otevřeno okno pro tisk / uložení do PDF.");
    }

    setTimeout(() => {
      setDownloadSuccessToast(null);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl relative text-zinc-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <FileText className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Generátor Manažerských Výkazů a Reportů
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
                  Multi-Format Export
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Vyberte požadovaný typ výkazu, časové období a stáhněte si data pro další analýzu.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {downloadSuccessToast && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{downloadSuccessToast}</span>
          </div>
        )}

        {/* 2-Column Grid: Left Controls / Right Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Report Selectors (5 cols) */}
          <div className="lg:col-span-5 space-y-4 text-xs">
            {/* Report Type Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Typ manažerského výkazu
              </label>

              <div className="space-y-1.5">
                {[
                  { id: "sales", label: "Výkaz Tržeb a Prodejů", icon: BarChart3, desc: "Tržby podle produktů a kategorií" },
                  { id: "operator_performance", label: "Výkon Operátorů & AHT", icon: Users, desc: "Hovory, doba odbavení a konverze" },
                  { id: "lead_pipeline", label: "Lead Pipeline & Konverze", icon: GitBranch, desc: "Stav obchodů ve trychtýři" },
                  { id: "audit_compliance", label: "Audit & Compliance Log", icon: ShieldCheck, desc: "Bezpečnostní záznamy a pravidla" },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedType(item.id as ReportType)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3",
                        isSelected
                          ? "bg-zinc-900 border-zinc-700 text-zinc-100 shadow-sm"
                          : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                        isSelected ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-zinc-900 border-zinc-800 text-zinc-400"
                      )}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-zinc-200">{item.label}</div>
                        <div className="text-[10px] text-zinc-500">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Range Selector */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-800">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-zinc-400" />
                Časové období výkazu
              </label>
              <select
                value={selectedRange}
                onChange={(e) => setSelectedRange(e.target.value as DateRange)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
              >
                <option value="today">Dnešní den (Today)</option>
                <option value="week">Tento týden (This Week)</option>
                <option value="month">Tento měsíc (This Month)</option>
                <option value="all">Všechna historická data (All Time)</option>
              </select>
            </div>
          </div>

          {/* Right Column: Live Data Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-zinc-400" />
                Živý Náhled Dat (Live Report Preview)
              </span>
              <span className="font-mono text-zinc-500">{report.data.length} záznamů</span>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="pb-2 border-b border-zinc-800 space-y-0.5">
                <h4 className="text-xs font-bold text-zinc-100">{report.title}</h4>
                <p className="text-[11px] text-zinc-400">{report.description}</p>
              </div>

              {/* Data Table Preview */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] font-mono text-zinc-400 uppercase">
                      {report.columns.map((col) => (
                        <th key={col.key} className="py-2 px-2.5 font-medium">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.map((row, idx) => (
                      <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-900/80 transition-colors">
                        {report.columns.map((col) => (
                          <td key={col.key} className="py-2 px-2.5 text-[11px] text-zinc-300 font-mono">
                            {row[col.key] ?? "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Export Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-500 font-mono">
            Formáty: CSV (Excel/Sheets), XLS (Excel), PDF (Tiskový protokoly)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span>Stáhnout CSV</span>
            </button>

            <button
              type="button"
              onClick={() => handleExport("excel")}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportovat Excel (.xls)</span>
            </button>

            <button
              type="button"
              onClick={() => handleExport("pdf")}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4 text-zinc-950" />
              <span>Vytisknout PDF Protokol</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
