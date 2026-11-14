"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { CheckCircle2, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateOrderDetailsAction } from "@/app/actions/crm";
import type { WorkspaceOrderDTO } from "@/lib/dal/activity";
import { StatusAlert } from "@/components/ui/Status";

type OrderSource = WorkspaceOrderDTO["order_source"];
type ProductOption = {
  id: string;
  title: string;
  category: string;
  price: number;
  currency: string;
  in_stock: boolean;
};
type DraftItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  minimumUnitPrice: number;
};

interface OrderEditFormProps {
  order: WorkspaceOrderDTO;
  products: ProductOption[];
  initialOrigin: "workspace" | "orders";
  requiresReason: boolean;
}

const sourceLabels: Record<OrderSource, string> = {
  manual: "Ruční zadání",
  previous_call: "Předchozí hovor",
  email: "E-mail",
  web_form: "Webový formulář",
  other: "Jiné",
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function statusLabel(status: WorkspaceOrderDTO["status"]): string {
  return ({ pending: "Čeká na zpracování", in_progress: "Zpracovává se", sent: "Odesláno", delivered: "Doručeno", returned: "Vráceno", cancelled: "Zrušeno", completed: "Dokončeno" } as Record<string, string>)[status] || status;
}

export function OrderEditForm({ order, products, initialOrigin, requiresReason }: OrderEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draftItems, setDraftItems] = useState<DraftItem[]>(
    order.items.map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      minimumUnitPrice: item.minimum_unit_price,
    })),
  );
  const [productToAdd, setProductToAdd] = useState("");
  const [orderSource, setOrderSource] = useState<OrderSource>(order.order_source);
  const [sourceNote, setSourceNote] = useState(order.source_note || "");
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resolvedItems = useMemo(
    () =>
      draftItems.flatMap((item) => {
        const product = products.find((candidate) => candidate.id === item.productId);
        return product
          ? [{
              ...item,
              product,
              lineTotal: roundMoney(item.unitPrice * item.quantity),
              minimumLineTotal: roundMoney(item.minimumUnitPrice * item.quantity),
            }]
          : [];
      }),
    [draftItems, products],
  );
  const selectedProductIds = new Set(draftItems.map((item) => item.productId));
  const orderCurrency = resolvedItems[0]?.product.currency || order.currency;
  const orderTotal = roundMoney(resolvedItems.reduce((total, item) => total + item.lineTotal, 0));
  const minimumOrderTotal = roundMoney(
    resolvedItems.reduce((total, item) => total + item.minimumLineTotal, 0),
  );
  const isBelowMinimum = resolvedItems.length > 0 && orderTotal < minimumOrderTotal;
  const addableProducts = products.filter(
    (product) =>
      product.in_stock &&
      !selectedProductIds.has(product.id) &&
      (resolvedItems.length === 0 || product.currency === orderCurrency),
  );
  const backHref = initialOrigin === "workspace" ? "/console" : `/orders/${order.id}`;

  const addItem = () => {
    const product = products.find((candidate) => candidate.id === productToAdd);
    if (!product || selectedProductIds.has(product.id)) return;
    if (resolvedItems.length > 0 && product.currency !== orderCurrency) {
      setErrorMessage("Vyberte produkty se stejnou měnou pro všechny položky objednávky.");
      return;
    }
    setDraftItems((items) => [
      ...items,
      {
        productId: product.id,
        quantity: 1,
        unitPrice: product.price,
        minimumUnitPrice: product.price,
      },
    ]);
    setProductToAdd("");
    setErrorMessage(null);
  };

  const updateItem = (productId: string, patch: Partial<Omit<DraftItem, "productId">>) => {
    setDraftItems((items) =>
      items.map((item) => (item.productId === productId ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (productId: string) => {
    if (draftItems.length <= 1) {
      setErrorMessage("V objednávce ponechte alespoň jednu položku.");
      return;
    }
    setDraftItems((items) => items.filter((item) => item.productId !== productId));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draftItems.length === 0 || resolvedItems.length !== draftItems.length) {
      setErrorMessage("V objednávce ponechte alespoň jeden dostupný produkt.");
      return;
    }
    if (requiresReason && !reason.trim()) {
      setErrorMessage("U již odeslané objednávky musí administrátor vyplnit důvod změny.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      try {
        await updateOrderDetailsAction({
          orderId: order.id,
          expectedRevision: order.revision,
          items: resolvedItems.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.unitPrice,
          })),
          order_source: orderSource,
          source_note: sourceNote.trim() || null,
          reason: reason.trim() || null,
        });
        router.push(`/orders/${order.id}${initialOrigin === "workspace" ? "?origin=workspace" : ""}`);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Údaje objednávky se nepodařilo uložit. Nic nebylo změněno. Zkuste to znovu.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-screen-xl space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-sm">
            <div className="mb-5 border-b border-zinc-800/80 pb-4">
              <h2 className="text-sm font-semibold text-zinc-100">Údaje objednávky pouze pro čtení</h2>
              <p className="mt-1 text-xs text-zinc-500">Přiřazení a stav objednávky se spravují odděleně od úprav podrobností.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Zákazník</span>
                <span className="mt-1 block text-sm text-zinc-200">{order.lead_name}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Přiřazený operátor</span>
                <span className="mt-1 block text-sm text-zinc-200">{order.agent_name}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Aktuální stav</span>
                <span className="mt-1 block text-sm text-zinc-200">{statusLabel(order.status)}</span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-sm">
            <div className="mb-5 border-b border-zinc-800/80 pb-4">
              <h2 className="text-sm font-semibold text-zinc-100">Položky objednávky</h2>
              <p className="mt-1 text-xs text-zinc-500">Minimální referenční ceny zůstávají uložené u položek objednávky.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={productToAdd}
                onChange={(event) => setProductToAdd(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                aria-label="Produkt k přidání"
                disabled={isPending}
              >
                <option value="">Vyberte produkt k přidání</option>
                {addableProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title} · {product.currency} {product.price.toFixed(2)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addItem}
                disabled={isPending || !productToAdd}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-3 text-xs font-semibold text-zinc-200 transition-colors duration-150 ease-interface hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                Přidat produkt
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {resolvedItems.map((item) => (
                <div key={item.product.id} className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-100">{item.product.title}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
                        {({ supplements: "Doplňky stravy", cosmetics: "Kosmetika", electronics: "Elektronika" } as Record<string, string>)[item.product.category] || item.product.category} · minimum {item.product.currency} {item.minimumUnitPrice.toFixed(2)} za kus
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.product.id)}
                      disabled={isPending || draftItems.length <= 1}
                      className="rounded-lg p-1.5 text-zinc-600 transition-colors duration-150 ease-interface hover:bg-zinc-800 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label={`Odebrat ${item.product.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <label className="space-y-1 text-[10px] uppercase tracking-wider text-zinc-500">
                      <span>Množství</span>
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        step={1}
                        value={item.quantity}
                        disabled={isPending}
                        onChange={(event) => updateItem(item.product.id, { quantity: Math.max(1, Math.min(1000, Number(event.target.value) || 1)) })}
                        className="block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-mono normal-case tracking-normal text-zinc-100 outline-none focus:border-zinc-600"
                      />
                    </label>
                    <label className="space-y-1 text-[10px] uppercase tracking-wider text-zinc-500">
                      <span>Cena za kus</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice}
                        disabled={isPending}
                        onChange={(event) => updateItem(item.product.id, { unitPrice: Math.max(0, Number(event.target.value) || 0) })}
                        className="block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-mono normal-case tracking-normal text-zinc-100 outline-none focus:border-zinc-600"
                      />
                    </label>
                    <div className="space-y-1 text-[10px] uppercase tracking-wider text-zinc-500">
                      <span>Celkem za položku</span>
                      <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-mono normal-case tracking-normal text-zinc-100">
                        {item.product.currency} {item.lineTotal.toFixed(2)}
                      </p>
                      {item.unitPrice < item.minimumUnitPrice && (
                        <p className="mt-1 text-[10px] normal-case tracking-normal text-amber-300">
                          Pod minimem {item.product.currency} {item.minimumUnitPrice.toFixed(2)} / kus
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-sm">
            <div className="mb-5 border-b border-zinc-800/80 pb-4">
              <h2 className="text-sm font-semibold text-zinc-100">Poznámka a zdroj objednávky</h2>
              <p className="mt-1 text-xs text-zinc-500">Kontext pro předání této objednávky, oddělený od historie leadu.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block space-y-2 text-xs text-zinc-400">
                <span className="font-medium text-zinc-300">Zdroj objednávky</span>
                <select
                  value={orderSource}
                  disabled={isPending}
                  onChange={(event) => setOrderSource(event.target.value as OrderSource)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                >
                  {Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block space-y-2 text-xs text-zinc-400 md:col-span-2">
                <span className="font-medium text-zinc-300">Poznámka k objednávce <span className="text-zinc-600">(nepovinné)</span></span>
                <textarea
                  value={sourceNote}
                  onChange={(event) => setSourceNote(event.target.value)}
                  maxLength={1000}
                  rows={4}
                  disabled={isPending}
                  placeholder="Např. při balení přiložit návod k použití."
                  className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                />
              </label>
            </div>
          </section>

          {requiresReason && (
            <StatusAlert tone="warning">
              <h2 className="text-sm font-semibold text-amber-100">Administrátor musí uvést důvod změny</h2>
              <p className="mt-1 text-xs leading-relaxed text-amber-200/70">Tato objednávka už opustila fázi přípravy. Důvod se uloží spolu s původními a novými hodnotami do historie změn a auditního záznamu.</p>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                rows={3}
                disabled={isPending}
                placeholder="Např. oprava množství na žádost zákazníka."
                className="mt-4 w-full resize-y rounded-xl border border-amber-900/80 bg-zinc-950/70 px-3.5 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-amber-700"
                required
              />
            </StatusAlert>
          )}
        </div>

        <aside className="h-fit space-y-6 lg:sticky lg:top-0">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Uložit změny</h2>
                <p className="mt-1 text-xs text-zinc-500">Celá objednávka se uloží v jednom kroku.</p>
              </div>
              <Save className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between gap-4 text-zinc-400"><span>Položky</span><span className="text-zinc-200">{resolvedItems.length}</span></div>
              <div className="flex justify-between gap-4 text-zinc-400"><span>Měna</span><span className="font-mono text-zinc-200">{orderCurrency}</span></div>
              <div className="flex justify-between gap-4 border-t border-zinc-800/80 pt-3 text-zinc-400"><span>Celkem</span><span className="font-mono text-base font-semibold text-zinc-100">{orderCurrency} {orderTotal.toFixed(2)}</span></div>
              <div className="flex justify-between gap-4 text-zinc-500"><span>Minimální referenční součet</span><span className="font-mono">{orderCurrency} {minimumOrderTotal.toFixed(2)}</span></div>
            </div>
            {isBelowMinimum && (
              <StatusAlert tone="warning" role="status">
                <p className="font-semibold">Objednávka je pod minimální referenční cenou.</p>
                <p className="mt-1 text-amber-200/80">Je to povoleno, ale upozornění zůstane zachováno pro kontrolu.</p>
              </StatusAlert>
            )}
            {errorMessage && <StatusAlert tone="danger">{errorMessage}</StatusAlert>}
            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-[11px] leading-relaxed text-zinc-400">
              <CheckCircle2 className="mb-1.5 h-4 w-4 text-zinc-300" />
              Kontrola verze zabrání přepsání změn, které mezitím uložil jiný operátor.
            </div>
            <button
              type="submit"
              disabled={isPending || resolvedItems.length === 0 || (requiresReason && !reason.trim())}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-3 text-xs font-semibold text-zinc-950 transition-colors duration-150 ease-interface hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isPending ? "Ukládám změny…" : "Uložit změny"}
            </button>
            <button
              type="button"
              onClick={() => router.push(backHref)}
              disabled={isPending}
              className="mt-2 w-full rounded-xl px-4 py-2.5 text-xs text-zinc-500 transition-colors duration-150 ease-interface hover:bg-zinc-800/60 hover:text-zinc-200 disabled:opacity-50"
            >
              Zrušit
            </button>
          </div>
        </aside>
      </div>
    </form>
  );
}
