"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, LoaderCircle, Package, Pencil, Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import {
  CARRIER_LIST,
  detectCarrierFromTrackingNumber,
  getCarrierMeta,
  getCarrierTrackingUrl,
  type SupportedCarrier,
} from "@/lib/tracking";

import type { UpdateOrderTrackingInput } from "@/lib/dal/orders";

interface OrderTrackingCardProps {
  orderId: string;
  trackingNumber: string | null;
  carrier: string | null;
  isManager: boolean;
  onUpdateTracking?: (
    input: UpdateOrderTrackingInput
  ) => Promise<{ id: string; status: string; tracking_number: string | null; carrier: string | null; revision: number }>;
}

export function OrderTrackingCard({
  orderId,
  trackingNumber: initialTrackingNumber,
  carrier: initialCarrier,
  isManager,
  onUpdateTracking,
}: OrderTrackingCardProps) {
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber || "");
  const [carrier, setCarrier] = useState(initialCarrier || "zasilkovna");
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentCarrierMeta = getCarrierMeta(carrier);
  const trackingUrl = getCarrierTrackingUrl(carrier, trackingNumber);

  function handleCopy() {
    if (!trackingNumber) return;
    navigator.clipboard.writeText(trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleTrackingNumberChange(value: string) {
    setTrackingNumber(value);
    const detected = detectCarrierFromTrackingNumber(value);
    if (detected && detected !== carrier) {
      setCarrier(detected);
    }
  }

  function handleSave() {
    if (!onUpdateTracking) return;
    setError(null);

    startTransition(async () => {
      try {
        await onUpdateTracking({
          orderId,
          trackingNumber: trackingNumber.trim() || null,
          carrier: trackingNumber.trim() ? carrier : null,
        });
        setIsEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba při ukládání sledovacího čísla.");
      }
    });
  }

  function handleCancel() {
    setTrackingNumber(initialTrackingNumber || "");
    setCarrier(initialCarrier || "zasilkovna");
    setIsEditing(false);
    setError(null);
  }

  return (
    <Surface variant="page" className="p-6" data-testid="order-tracking-card">
      <div className="mb-5 flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Zásilka & Sledování balíku</h2>
          <p className="mt-1 text-xs text-zinc-500">Kód balíku a proklik na kurýrní systém.</p>
        </div>
        <Truck className="h-4 w-4 text-zinc-500" />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300">Dopravce</label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value as SupportedCarrier)}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-600"
              data-testid="carrier-select"
            >
              {CARRIER_LIST.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300">
              Číslo zásilky (Tracking code)
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => handleTrackingNumberChange(e.target.value)}
              placeholder="Např. Z123456789 nebo kód ze čtečky čárových kódů"
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 font-mono text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
              data-testid="tracking-number-input"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="primary"
              disabled={isPending}
              onClick={handleSave}
              data-testid="save-tracking-button"
            >
              {isPending && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
              Uložit kód
            </Button>
            <Button
              type="button"
              variant="quiet"
              disabled={isPending}
              onClick={handleCancel}
            >
              Zrušit
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {trackingNumber ? (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                  {currentCarrierMeta.label}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 transition-colors hover:text-zinc-200"
                  title="Kopírovat kód balíku"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Zkopírováno</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Kopírovat kód</span>
                    </>
                  )}
                </button>
              </div>

              <p className="mt-2.5 font-mono text-base font-semibold tracking-wide text-zinc-100" data-testid="tracking-code-display">
                {trackingNumber}
              </p>

              {trackingUrl && (
                <div className="mt-3.5 border-t border-zinc-800/80 pt-3">
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300"
                    data-testid="external-tracking-link"
                  >
                    <span>Sledovat balíček online</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-4 text-center">
              <Package className="mx-auto h-5 w-5 text-zinc-600" />
              <p className="mt-1 text-xs text-zinc-500">Zatím nebylo zadáno žádné sledovací číslo.</p>
            </div>
          )}

          {isManager && (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setIsEditing(true)}
              data-testid="edit-tracking-button"
            >
              <Pencil className="h-3.5 w-3.5" />
              {trackingNumber ? "Upravit číslo zásilky" : "Zadat číslo zásilky"}
            </Button>
          )}
        </div>
      )}
    </Surface>
  );
}
