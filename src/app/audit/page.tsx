"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Search,
  Download,
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
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

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
            <Button
              onClick={handleRefresh}
              aria-label="Obnovit auditní log"
              variant="secondary"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </Button>

            <Button
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 text-zinc-950" aria-hidden="true" />
              <span>{isExporting ? "Exportuji CSV..." : "Exportovat Audit Log (CSV)"}</span>
            </Button>
          </>
        }
      />

      {loadError ? (
        <StatusAlert tone="danger">{loadError}</StatusAlert>
      ) : null}

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Events */}
        <MetricCard label="Celkem událostí" value={logs.length} />

        {/* Critical Alerts */}
        <MetricCard label="Kritická varování" value={criticalCount} valueTone={criticalCount > 0 ? "danger" : "neutral"} />

        {/* Data Exports */}
        <MetricCard label="Exporty dat (24 h)" value={exportCount} />

        {/* Active Operators */}
        <MetricCard label="Sledovaní operátoři" value={activeOperatorsCount} />
      </div>

      {/* Filter and Search Bar */}
      <Surface variant="page"><div className="space-y-4 p-5">
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
              <Button
                key={sev.id}
                onClick={() => setSelectedSeverity(sev.id)}
                variant={selectedSeverity === sev.id ? "primary" : "secondary"}
              >
                {sev.label}
              </Button>
            ))}
          </div>
        </div>
      </div></Surface>

      {/* Audit Logs Table */}
      <Surface variant="table"><div className="space-y-3 p-6">
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
                      <StatusBadge tone={log.severity === "critical" ? "danger" : log.severity === "high" ? "warning" : "neutral"}>
                        {log.severity.toUpperCase()}
                      </StatusBadge>
                    </td>
                    <td className="py-3 px-3 text-zinc-500 text-[11px] whitespace-nowrap">{log.ipAddress}</td>
                    <td className="py-3 px-3 text-zinc-300 text-[11px] max-w-xl"><AuditDetailCell log={log} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div></Surface>
    </div>
  );
}
