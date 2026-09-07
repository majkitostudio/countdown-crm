"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Search,
  Download,
  AlertTriangle,
  UserCheck,
  FileSpreadsheet,
  Terminal,
  Activity,
  Filter,
  RefreshCw
} from "lucide-react";
import {
  auditActionLabel,
  AuditLogEntry,
  getAuditLogs,
  exportAuditLogsToCSV,
  parseCallReviewAuditDetails,
  type CallReviewAuditState,
} from "@/lib/audit";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";

function ReviewAuditState({ label, state }: { label: string; state: CallReviewAuditState | null }) {
  if (!state) {
    return <p className="text-[11px] text-zinc-500"><strong className="text-zinc-400">{label}:</strong> No previous review</p>;
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label} · Revision {state.revisionNumber}</p>
      <dl className="mt-2 space-y-2 text-[11px] text-zinc-300">
        <div><dt className="text-zinc-500">Verdict</dt><dd className="mt-0.5 whitespace-pre-wrap">{state.verdict}</dd></div>
        <div><dt className="text-zinc-500">Coaching</dt><dd className="mt-0.5 whitespace-pre-wrap">{state.coachingNote}</dd></div>
        <div><dt className="text-zinc-500">Reviewer ID</dt><dd className="mt-0.5 break-all font-mono text-zinc-400">{state.reviewerId}</dd></div>
      </dl>
    </div>
  );
}

export function AuditDetailCell({ log }: { log: AuditLogEntry }) {
  const isReviewAction = log.actionType === "CALL_REVIEW_COMPLETED" || log.actionType === "CALL_REVIEW_CORRECTED";
  const reviewDetails = isReviewAction ? parseCallReviewAuditDetails(log.details) : null;
  if (!reviewDetails) {
    return <span className="whitespace-pre-wrap break-words">{log.details}</span>;
  }

  return (
    <details className="min-w-[22rem] rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <summary className="cursor-pointer text-[11px] font-semibold text-zinc-200">{auditActionLabel(log.actionType)} · show exact change</summary>
      <div className="mt-3 space-y-3">
        <ReviewAuditState label="Previous review" state={reviewDetails.previous} />
        <ReviewAuditState label="New review" state={reviewDetails.next} />
        {reviewDetails.correctionReason && (
          <p className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-200/80"><strong>Correction reason:</strong> {reviewDetails.correctionReason}</p>
        )}
      </div>
    </details>
  );
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadLogs = () => {
    void getAuditLogs()
      .then(setLogs)
      .catch((error) => {
        setLogs([]);
        setLoadError(error instanceof Error ? error.message : "Audit log is unavailable.");
      });
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleRefresh = () => {
    setLoadError(null);
    loadLogs();
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
      <PageHeader
        icon={ShieldAlert}
        title="Security Audit Log & Activity Tracker"
        badge={{ label: loadError ? "Unavailable" : "System Audit", tone: loadError ? "unavailable" : "neutral" }}
        description="Kompletní protokol bezpečnostních událostí, exportů dat, změn v CRM a aktivních relací operátorů."
        actions={
          <>
            <button
              onClick={handleRefresh}
              aria-label="Obnovit auditní log"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-400 transition-colors hover:text-zinc-200"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-5 py-2.5 text-xs font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-zinc-200"
            >
              <Download className="h-4 w-4 text-zinc-950" aria-hidden="true" />
              <span>{isExporting ? "Exportuji CSV..." : "Exportovat Audit Log (CSV)"}</span>
            </button>
          </>
        }
      />

      {loadError ? (
        <p role="alert" className="rounded-xl border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-xs text-rose-300">
          {loadError}
        </p>
      ) : null}

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
                        {auditActionLabel(log.actionType)}
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
                    <td className="py-3 px-3 text-zinc-300 text-[11px] max-w-xl"><AuditDetailCell log={log} /></td>
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
