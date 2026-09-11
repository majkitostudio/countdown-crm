"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateOrderStatusAction } from "@/app/actions/crm";
import { Button } from "@/components/ui/Button";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

type OrderStatus = "completed" | "pending" | "in_progress" | "sent" | "cancelled" | "delivered" | "returned";

const allStatuses: OrderStatus[] = ["pending", "in_progress", "sent", "cancelled", "completed"];
const operatorTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["in_progress", "cancelled"],
  in_progress: ["sent", "cancelled"],
  sent: ["cancelled"],
  delivered: [],
  returned: [],
  cancelled: [],
  completed: ["in_progress", "cancelled"],
};

function statusLabel(status: OrderStatus): string {
  if (status === "in_progress") return "In progress";
  return status.charAt(0).toUpperCase() + status.slice(1);
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
    () => (isManager ? allStatuses : operatorTransitions[currentStatus]),
    [currentStatus, isManager],
  );

  if (!canEdit) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    if (selectedStatus === currentStatus) {
      setErrorMessage("Choose a different status.");
      return;
    }

    startTransition(async () => {
      try {
        await updateOrderStatusAction(orderId, selectedStatus, note);
        setNote("");
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Status update failed.");
      }
    });
  }

  return (
    <Surface variant="page">
      <div className="p-6">
      <div className="mb-5 flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Update status</h2>
          <p className="mt-1 text-xs text-zinc-500">Only valid next steps are available for your role.</p>
        </div>
        <RefreshCw className="h-4 w-4 text-zinc-500" />
      </div>
      {options.length > 0 ? (
        <form className="space-y-3" onSubmit={submit}>
          <label className="block text-xs text-zinc-400">
            New status
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as OrderStatus)}
              disabled={isPending}
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-200 outline-none transition-colors focus:border-zinc-600"
            >
              <option value={currentStatus}>{statusLabel(currentStatus)} (current)</option>
              {options.filter((status) => status !== currentStatus).map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-zinc-400">
            Note <span className="text-zinc-600">(optional)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              rows={3}
              disabled={isPending}
              placeholder="Why is the status changing?"
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
            {isPending ? "Saving…" : "Save status"}
          </Button>
        </form>
      ) : (
        <p className="text-xs leading-relaxed text-zinc-500">{currentStatus === "sent" || currentStatus === "delivered" ? "Delivery and return states are controlled by the fulfillment system." : `There are no further status changes available from ${statusLabel(currentStatus).toLowerCase()}.`}</p>
      )}
      </div>
    </Surface>
  );
}
