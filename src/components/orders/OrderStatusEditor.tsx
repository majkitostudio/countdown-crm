"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateOrderStatusAction } from "@/app/actions/crm";
import { Button } from "@/components/ui/Button";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

type OrderStatus = "completed" | "pending" | "in_progress" | "sent" | "cancelled" | "delivered" | "returned";

const managerStatuses: OrderStatus[] = [
  "pending",
  "in_progress",
  "sent",
  "delivered",
  "returned",
  "cancelled",
  "completed",
];
const operatorTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["in_progress", "cancelled"],
  in_progress: ["sent", "cancelled"],
  sent: ["cancelled"],
  delivered: [],
  returned: ["pending"],
  cancelled: [],
  completed: ["in_progress", "cancelled"],
};

function statusLabel(status: OrderStatus): string {
  return ({ pending: "Čeká na zpracování", in_progress: "Zpracovává se", sent: "Odesláno", delivered: "Doručeno", returned: "Vráceno", cancelled: "Zrušeno", completed: "Dokončeno" } as Record<string, string>)[status] || status;
}

interface OrderStatusEditorProps {
  orderId: string;
  currentStatus: OrderStatus;
  canEdit: boolean;
  isManager: boolean;
}

export function OrderStatusEditor({ orderId, currentStatus, canEdit, isManager }: OrderStatusEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(currentStatus);
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const options = useMemo(
    () => (isManager ? managerStatuses : (operatorTransitions[currentStatus] || [])),
    [currentStatus, isManager],
  );

  if (!canEdit) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    if (selectedStatus === currentStatus) {
      setErrorMessage("Vyberte jiný stav.");
      return;
    }

    startTransition(async () => {
      try {
        await updateOrderStatusAction(orderId, selectedStatus, note);
        setNote("");
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Stav se nepodařilo uložit. Zkuste to znovu.");
      }
    });
  }

  return (
    <Surface variant="page">
      <div className="p-6">
      <div className="mb-5 flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Změnit stav</h2>
          <p className="mt-1 text-xs text-zinc-500">Dostupné jsou pouze další kroky povolené pro vaši roli.</p>
        </div>
        <RefreshCw className="h-4 w-4 text-zinc-500" />
      </div>

      {currentStatus === "returned" && (
        <div className="mb-4 rounded-xl border border-sky-900/60 bg-sky-950/20 p-3">
          <p className="text-[11px] font-semibold text-sky-200">Znovu odeslat balíček (P4)</p>
          <p className="mt-1 text-[10px] text-sky-300/80">Klient souhlasil s opětovným doručením. Objednávka se vrátí do expedice.</p>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await updateOrderStatusAction(
                    orderId,
                    "pending",
                    "Přebalení zásilky a opětovné odeslání po domluvě s klientem (P4)",
                  );
                  router.refresh();
                } catch (error) {
                  setErrorMessage(error instanceof Error ? error.message : "Stav se nepodařilo uložit. Zkuste to znovu.");
                }
              });
            }}
            className="mt-2.5 w-full text-xs text-sky-200 border-sky-800 hover:bg-sky-950/50"
          >
            {isPending ? "Odesílám…" : "↻ Znovu odeslat balíček"}
          </Button>
        </div>
      )}
      {options.length > 0 ? (
        <form className="space-y-3" onSubmit={submit}>
          <label className="block text-xs text-zinc-400">
            Nový stav
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as OrderStatus)}
              disabled={isPending}
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-200 outline-none transition-colors duration-150 ease-interface focus:border-zinc-600"
            >
              <option value={currentStatus}>{statusLabel(currentStatus)} (aktuální)</option>
              {options.filter((status) => status !== currentStatus).map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-zinc-400">
            Poznámka <span className="text-zinc-600">(nepovinné)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              rows={3}
              disabled={isPending}
              placeholder="Např. zásilka předána dopravci."
              className="mt-2 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-zinc-600"
            />
          </label>
          {errorMessage && <StatusAlert tone="danger">{errorMessage}</StatusAlert>}
          <Button
            type="submit"
            disabled={isPending || selectedStatus === currentStatus}
            className="w-full"
          >
            {isPending && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            {isPending ? "Ukládám…" : "Uložit stav"}
          </Button>
        </form>
      ) : (
        <p className="text-xs leading-relaxed text-zinc-500">{currentStatus === "sent" || currentStatus === "delivered" ? "Stavy doručení a vrácení spravuje vedoucí týmu a expedice." : `Ze stavu „${statusLabel(currentStatus)}“ už nejsou dostupné další změny.`}</p>
      )}
      </div>
    </Surface>
  );
}
