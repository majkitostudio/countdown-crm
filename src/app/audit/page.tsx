"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Search,
  Download,
  AlertTriangle,
  CheckCircle2,
  Lock,
  UserCheck,
  FileSpreadsheet,
  Terminal,
  Activity,
  Filter,
  RefreshCw
} from "lucide-react";
import { AuditLogEntry, AuditSeverity, getAuditLogs, exportAuditLogsToCSV } from "@/lib/audit";
import { cn } from "@/lib/utils";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    void getAuditLogs().then(setLogs).catch(() => setLogs([]));
  }, []);

  const handleRefresh = () => {
    void getAuditLogs().then(setLogs).catch(() => setLogs([]));
  };

  const handleExport = () => {
    setIsExporting(true);
    exportAuditLogsToCSV(filteredLogs);
    setTimeout(() => setIsExporting(false), 1200);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.operatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actionType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.includes(searchQuery);

    const matchesSeverity =
      selectedSeverity === "all" || log.severity === selectedSeverity;

    return matchesSearch && matchesSeverity;
  });

  const criticalCount = logs.filter((l) => l.severity === "critical" || l.severity === "high").length;
  const exportCount = logs.filter((l) => l.actionType === "EXPORT_DATA").length;
  const activeOperatorsCount = new Set(logs.map((l) => l.operatorName)).size;

  return (
    <div className="space-y-8 max-w-screen-2xl mx-auto">
      {/* Header Banner */}
      <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2.5">
              Security Audit Log & Activity Tracker
              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                System Audit
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Kompletní protokol bezpečnostních událostí, exportů dat, změn v CRM a aktivních relací operátorů.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Obnovit auditní log"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-zinc-950" />
            <span>{isExporting ? "Exportuji CSV..." : "Exportovat Audit Log (CSV)"}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Events */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">Celkem událostí</span>
            <span className="text-2xl font-bold font-mono text-zinc-100">{logs.length}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <Terminal className="w-4 h-4" />
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">Kritická Varování</span>
            <span className="text-2xl font-bold font-mono text-zinc-100">{criticalCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
        </div>

        {/* Data Exports */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">Exporty Dat (24h)</span>
            <span className="text-2xl font-bold font-mono text-zinc-100">{exportCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <FileSpreadsheet className="w-4 h-4 text-zinc-300" />
          </div>
        </div>

        {/* Active Operators */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-400 block">Sledovaní Operátoři</span>
            <span className="text-2xl font-bold font-mono text-zinc-100">{activeOperatorsCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Vyhledat v auditním logu podle operátora, akce, IP adresy..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          {/* Severity Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-[11px] font-mono text-zinc-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Závažnost:
            </span>
            {[
              { id: "all", label: "Vše" },
              { id: "critical", label: "Kritická" },
              { id: "high", label: "Vysoká" },
              { id: "medium", label: "Střední" },
              { id: "low", label: "Nízká" },
            ].map((sev) => (
              <button
                key={sev.id}
                onClick={() => setSelectedSeverity(sev.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer",
                  selectedSeverity === sev.id
                    ? "bg-zinc-100 text-zinc-950 font-semibold"
                    : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                )}
              >
                {sev.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden space-y-3 p-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-400" />
            Auditní Protokol Událostí ({filteredLogs.length})
          </h2>
          <span className="text-[11px] font-mono text-zinc-500">Formát: UTF-8 Log Table</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs font-mono">
            Žádné auditní záznamy neodpovídají zadanému filtru.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  <th className="py-3 px-3">Čas Záznamu</th>
                  <th className="py-3 px-3">Operátor</th>
                  <th className="py-3 px-3">Typ Akce</th>
                  <th className="py-3 px-3">Závažnost</th>
                  <th className="py-3 px-3">IP Adresa</th>
                  <th className="py-3 px-3">Detail Události</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 font-mono">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-900/80 transition-colors">
                    <td className="py-3 px-3 text-[11px] text-zinc-400 whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-3 px-3 text-zinc-200 font-medium whitespace-nowrap">{log.operatorName}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 text-[10px]">
                        {log.actionType}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-semibold border inline-flex items-center gap-1",
                          log.severity === "critical"
                            ? "bg-rose-950/80 text-rose-300 border-rose-800/80"
                            : log.severity === "high"
                            ? "bg-amber-950/80 text-amber-300 border-amber-800/80"
                            : log.severity === "medium"
                            ? "bg-zinc-900 text-zinc-300 border-zinc-800"
                            : "bg-zinc-950 text-zinc-400 border-zinc-800"
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            log.severity === "critical"
                              ? "bg-rose-400"
                              : log.severity === "high"
                              ? "bg-amber-400"
                              : "bg-zinc-500"
                          )}
                        />
                        {log.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-zinc-500 text-[11px] whitespace-nowrap">{log.ipAddress}</td>
                    <td className="py-3 px-3 text-zinc-300 text-[11px] max-w-md truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
