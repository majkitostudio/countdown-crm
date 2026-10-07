"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Coins,
  Download,
  FileCheck,
  FileSpreadsheet,
  LoaderCircle,
  PackageCheck,
  RotateCcw,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  finalizeWalletMonthlyCommissionAction,
  finalizeWorkspaceMonthlySettlementAction,
  getMonthlySettlementSummaryAction,
} from "@/app/actions/wallet";
import type { MonthlySettlementSummaryDTO } from "@/lib/dal/wallet";
import { exportPayrollToCsv } from "@/lib/payrollExport";
import { Button } from "@/components/ui/Button";
import { FieldLabel, SelectField } from "@/components/ui/Field";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

interface MonthOption {
  label: string;
  value: string;
  isPast: boolean;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: currency || "CZK",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function WalletSettlementPanel({
  initialSummary,
  availableMonths,
}: {
  initialSummary: MonthlySettlementSummaryDTO;
  availableMonths: MonthOption[];
}) {
  const router = useRouter();
  const [summary, setSummary] = useState<MonthlySettlementSummaryDTO>(initialSummary);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialSummary.periodStart);
  const [isPending, startTransition] = useTransition();
  const [finalizingUserId, setFinalizingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "danger" | "info";
    message: string;
  } | null>(null);

  const currency = summary.currency;
  const isMonthPast = summary.canFinalize;
  const unfinalizedCount = summary.operators.filter(
    (op) => !op.isFinalized && op.commissionAmount > 0
  ).length;

  function handleMonthChange(newMonth: string) {
    setSelectedMonth(newMonth);
    setFeedback(null);
    startTransition(async () => {
      try {
        const updated = await getMonthlySettlementSummaryAction(newMonth);
        setSummary(updated);
      } catch (err) {
        setFeedback({
          tone: "danger",
          message: err instanceof Error ? err.message : "Chyba při načítání měsíční uzávěrky.",
        });
      }
    });
  }

  function handleFinalizeOperator(userId: string, userName: string) {
    setFeedback(null);
    setFinalizingUserId(userId);
    startTransition(async () => {
      try {
        const result = await finalizeWalletMonthlyCommissionAction({
          userId,
          periodStart: selectedMonth,
        });
        if (result) {
          setFeedback({
            tone: "success",
            message: `Měsíční provize pro operátora ${userName} ve výši ${formatCurrency(result.amount, result.currency)} byla úspěšně vyplacena do peněženky.`,
          });
        } else {
          setFeedback({
            tone: "info",
            message: `Operátor ${userName} nemá za zvolený měsíc žádný čistý obrat po odečtení vratek k vyplacení provize.`,
          });
        }
        const updated = await getMonthlySettlementSummaryAction(selectedMonth);
        setSummary(updated);
        router.refresh();
      } catch (err) {
        setFeedback({
          tone: "danger",
          message: err instanceof Error ? err.message : "Uzávěrku se nepodařilo dokončit.",
        });
      } finally {
        setFinalizingUserId(null);
      }
    });
  }

  function handleFinalizeWorkspaceAll() {
    setFeedback(null);
    startTransition(async () => {
      try {
        const res = await finalizeWorkspaceMonthlySettlementAction({
          periodStart: selectedMonth,
        });
        setFeedback({
          tone: "success",
          message: `Hromadná uzávěrka měsíce dokončena: Vyplaceno ${res.finalized_count} operátorům v celkové výši ${formatCurrency(res.total_commission, currency)}.`,
        });
        const updated = await getMonthlySettlementSummaryAction(selectedMonth);
        setSummary(updated);
        router.refresh();
      } catch (err) {
        setFeedback({
          tone: "danger",
          message: err instanceof Error ? err.message : "Hromadnou uzávěrku se nepodařilo dokončit.",
        });
      }
    });
  }

  function handleExportPayrollCsv() {
    exportPayrollToCsv(summary);
  }

  return (
    <Surface variant="page">
      <div className="space-y-6 p-6">
        {/* Header / Month selection & Actions */}
        <div className="flex flex-col gap-4 border-b border-zinc-800/80 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-950/40 text-emerald-400">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-100">
                  Měsíční uzávěrka provizí týmu a podklady pro mzdy
                </h2>
                <StatusBadge tone={isMonthPast ? "info" : "warning"}>
                  {isMonthPast ? "Ukončený kalendářní měsíc" : "Probíhající měsíc (lze uzavřít až po skončení)"}
                </StatusBadge>
              </div>
              <p className="mt-0.5 text-xs text-zinc-400">
                Auditovaný přehled doručených objednávek, vratek a provizí s možností okamžitého exportu do mezd.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-52">
              <FieldLabel htmlFor="settlement-month-select">
                Období k uzávěrce:
                <SelectField
                  id="settlement-month-select"
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  disabled={isPending}
                >
                  {availableMonths.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} {m.isPast ? "✓" : "(probíhá)"}
                    </option>
                  ))}
                </SelectField>
              </FieldLabel>
            </div>

            <div className="pt-4 flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleExportPayrollCsv}
                disabled={summary.operators.length === 0}
                className="text-zinc-200 hover:text-white"
                title="Stáhnout podklady pro mzdy ve formátu CSV pro Microsoft Excel"
              >
                <Download className="h-4 w-4 text-emerald-400" />
                Exportovat mzdy (CSV)
              </Button>

              {isMonthPast && unfinalizedCount > 0 && (
                <Button
                  onClick={handleFinalizeWorkspaceAll}
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                >
                  {isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Schválit a uzavřít měsíc pro všechny ({unfinalizedCount})
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <StatusAlert tone={feedback.tone} role="alert">
            <p className="text-xs font-medium">{feedback.message}</p>
          </StatusAlert>
        )}

        {/* Summary Metric Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Surface variant="inset" className="p-4">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-medium">Doručené objednávky</span>
              <PackageCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-lg font-bold font-mono text-emerald-300">
              {formatCurrency(summary.totalDeliveredTotal, currency)}
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">
              Doručeno zákazníkům
            </p>
          </Surface>

          <Surface variant="inset" className="p-4">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-medium">Vrácené objednávky</span>
              <RotateCcw className="h-4 w-4 text-rose-400" />
            </div>
            <p className="mt-2 text-lg font-bold font-mono text-rose-300">
              − {formatCurrency(summary.totalReturnedTotal, currency)}
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">
              Snížení obratu
            </p>
          </Surface>

          <Surface variant="inset" className="p-4">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-medium">Čistý obrat k provizi</span>
              <Coins className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="mt-2 text-lg font-bold font-mono text-zinc-100">
              {formatCurrency(summary.totalNetTurnover, currency)}
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">
              Základ pro procentní provizi
            </p>
          </Surface>

          <Surface variant="inset" className="p-4">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-medium">Fixní bonusy z obj.</span>
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-2 text-lg font-bold font-mono text-amber-300">
              {formatCurrency(summary.totalFixedBonuses, currency)}
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">
              Pravidla odměn za zásilky
            </p>
          </Surface>

          <Surface variant="inset" className="p-4 border-emerald-500/30 bg-emerald-950/20">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="text-xs font-medium">K výplatě celkem</span>
              <Wallet className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-lg font-bold font-mono text-emerald-400">
              {formatCurrency(summary.totalPayout, currency)}
            </p>
            <p className="mt-1 text-[10px] text-emerald-500/80">
              Provize {formatCurrency(summary.totalCommission, currency)} + bonusy
            </p>
          </Surface>
        </div>

        {/* Operators Table — Mzdový přehled */}
        <div className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              Mzdový přehled operátorů ({summary.operators.length})
            </h3>
            <span className="text-[11px] text-zinc-500 font-mono">
              Období: {summary.periodStart} až {summary.periodEnd}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
            <table className="w-full min-w-[960px] text-left text-xs text-zinc-300">
              <thead className="border-b border-zinc-800 bg-zinc-950/80 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Operátor</th>
                  <th className="px-4 py-3 text-right">Počet objednávek</th>
                  <th className="px-4 py-3 text-right">Celkový obrat</th>
                  <th className="px-4 py-3 text-right">Fixní bonusy</th>
                  <th className="px-4 py-3 text-right">Procentuální provize ({summary.commissionRate} %)</th>
                  <th className="px-4 py-3 text-right font-bold text-emerald-400">K výplatě</th>
                  <th className="px-4 py-3 text-center">Stav</th>
                  <th className="px-4 py-3 text-right">Akce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                {summary.operators.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                      V tomto týmu nejsou registrováni žádní aktivní operátoři.
                    </td>
                  </tr>
                ) : (
                  summary.operators.map((op) => (
                    <tr key={op.userId} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-zinc-100">{op.userName}</div>
                        {op.userEmail && (
                          <div className="text-[10px] text-zinc-500 font-mono">{op.userEmail}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-zinc-300">
                        <div>
                          {Math.max(0, op.deliveredCount - op.returnedCount)} čistých
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {op.deliveredCount} doručeno {op.returnedCount > 0 ? `| ${op.returnedCount} vratka` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-zinc-200">
                        <div className="font-semibold">{formatCurrency(op.netTurnover, currency)}</div>
                        {op.returnedTotal > 0 && (
                          <div className="text-[10px] text-rose-400/80">
                            vratky: − {formatCurrency(op.returnedTotal, currency)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-amber-300">
                        {op.fixedBonuses > 0 ? formatCurrency(op.fixedBonuses, currency) : "0 Kč"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-cyan-300">
                        {formatCurrency(op.commissionAmount, currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-sm text-emerald-300">
                        {formatCurrency(op.totalPayout, currency)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {op.isFinalized ? (
                          <StatusBadge tone="success">
                            ✓ Uzavřeno & vyplaceno
                          </StatusBadge>
                        ) : op.commissionAmount > 0 ? (
                          <StatusBadge tone="warning">
                            K uzávěrce
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral">
                            Nulový nárok
                          </StatusBadge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {op.isFinalized ? (
                          <span className="text-[10px] font-mono text-zinc-500">
                            ID: {op.transactionId?.slice(0, 8)}…
                          </span>
                        ) : (
                          <Button
                            variant="secondary"
                            onClick={() => handleFinalizeOperator(op.userId, op.userName)}
                            disabled={!isMonthPast || isPending || op.commissionAmount <= 0}
                            className="px-2.5 py-1 text-[11px]"
                          >
                            {finalizingUserId === op.userId ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Uzavřít provizi"
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Explainability footnote for Team Leader / Mzdový audit */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-[11px] text-zinc-400 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
            <Coins className="h-3.5 w-3.5 text-amber-400" />
            Mzdová metodika a struktura exportu:
          </div>
          <p>
            1. <strong>Operátor & Objednávky:</strong> Export obsahuje jméno, email, počet doručených zásilek i odečtených vratek.
          </p>
          <p>
            2. <strong>Fixní bonusy vs. Procentuální provize:</strong> Fixní bonusy jsou odměny z pravidel za doručené objednávky (`order_bonus`). Procentuální provize je podíl ({summary.commissionRate} %) z čistého obratu po odečtení vratek (`monthly_commission`).
          </p>
          <p>
            3. <strong>K výplatě:</strong> Celková schválená odměna pro mzdy = Fixní bonusy + Procentuální provize + případné schválené manuální úpravy.
          </p>
          <p>
            4. <strong>Formát pro Excel:</strong> Tlačítko <em>Exportovat mzdy (CSV)</em> generuje soubor se středníkovým oddělovačem a UTF-8 BOM hlavičkou pro bezchybné zobrazení české diakritiky v Microsoft Excelu na Windows.
          </p>
        </div>
      </div>
    </Surface>
  );
}
