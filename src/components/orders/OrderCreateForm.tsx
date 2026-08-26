"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { createOrderAction } from "@/app/actions/crm";
import { listLeadNotesAction } from "@/app/actions/leadNotes";
import type { LeadNoteDTO } from "@/lib/dal/leadNotes";

type OrderSource = "previous_call" | "email" | "web_form" | "manual" | "other";
type OrderOrigin = "workspace" | "orders";

interface LeadOption {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  city: string | null;
  notes?: string | null;
}

interface ProductOption {
  id: string;
  title: string;
  category: string;
  price: number;
  currency: string;
  in_stock: boolean;
}

interface OrderCreateFormProps {
  leads: LeadOption[];
  products: ProductOption[];
  initialLeadId?: string;
  initialOrigin?: OrderOrigin;
}

type DraftItem = { productId: string; quantity: number; unitPrice: number };

const sourceLabels: Record<OrderSource, string> = {
  manual: "Manual entry",
  previous_call: "Previous call",
  email: "Email",
  web_form: "Web form",
  other: "Other",
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function OrderCreateForm({
  leads,
  products,
  initialLeadId = "",
  initialOrigin = "orders",
}: OrderCreateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [leadId, setLeadId] = useState(initialLeadId);
  const [draftItems, setDraftItems] = useState<DraftItem[]>(
    products[0] ? [{ productId: products[0].id, quantity: 1, unitPrice: products[0].price }] : [],
  );
  const [productToAdd, setProductToAdd] = useState("");
  const [orderSource, setOrderSource] = useState<OrderSource>("previous_call");
  const [sourceNote, setSourceNote] = useState(
    () => leads.find((lead) => lead.id === initialLeadId)?.notes?.trim() || "",
  );
  const [leadNotes, setLeadNotes] = useState<LeadNoteDTO[]>([]);
  const [leadNotesError, setLeadNotesError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === leadId) || null,
    [leadId, leads],
  );
  const backHref = initialOrigin === "workspace" ? "/workspace" : "/orders";
  const resolvedItems = useMemo(
    () =>
      draftItems.flatMap((item) => {
        const product = products.find((candidate) => candidate.id === item.productId);
        return product
          ? [
              {
                ...item,
                product,
                lineTotal: roundMoney(item.unitPrice * item.quantity),
                minimumLineTotal: roundMoney(product.price * item.quantity),
              },
            ]
          : [];
      }),
    [draftItems, products],
  );
  const orderCurrency = resolvedItems[0]?.product.currency || "USD";
  const orderTotal = roundMoney(resolvedItems.reduce((total, item) => total + item.lineTotal, 0));
  const minimumOrderTotal = roundMoney(
    resolvedItems.reduce((total, item) => total + item.minimumLineTotal, 0),
  );
  const isBelowMinimum = resolvedItems.length > 0 && orderTotal < minimumOrderTotal;
  const selectedProductIds = new Set(draftItems.map((item) => item.productId));
  const addableProducts = products.filter(
    (product) =>
      !selectedProductIds.has(product.id) &&
      (resolvedItems.length === 0 || product.currency === orderCurrency),
  );

  useEffect(() => {
    if (!selectedLead) return;

    let cancelled = false;
    void listLeadNotesAction(selectedLead.id)
      .then((notes) => {
        if (!cancelled) setLeadNotes(notes);
      })
      .catch(() => {
        if (!cancelled) setLeadNotesError("Lead note history is unavailable right now.");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedLead]);

  const addItem = () => {
    const product = products.find((candidate) => candidate.id === productToAdd);
    if (!product || selectedProductIds.has(product.id)) return;
    if (resolvedItems.length > 0 && product.currency !== orderCurrency) {
      setErrorMessage("All order items must use the same currency.");
      return;
    }
    setDraftItems((items) => [...items, { productId: product.id, quantity: 1, unitPrice: product.price }]);
    setProductToAdd("");
    setErrorMessage(null);
  };

  const updateItem = (
    productId: string,
    patch: Partial<Omit<DraftItem, "productId">>,
  ) => {
    setDraftItems((items) =>
      items.map((item) => (item.productId === productId ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (productId: string) => {
    setDraftItems((items) => items.filter((item) => item.productId !== productId));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLead || resolvedItems.length === 0) {
      setErrorMessage("Select a customer and at least one product before creating the order.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      try {
        const order = await createOrderAction({
          lead_id: selectedLead.id,
          items: resolvedItems.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.unitPrice,
          })),
          order_source: orderSource,
          source_note: sourceNote.trim() || null,
          status: "in_progress",
        });
        router.push(`/orders/${order.id}?origin=${initialOrigin}`);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Order creation failed. Nothing was recorded.",
        );
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {errorMessage && (
        <div
          className="rounded-xl border border-rose-800/60 bg-rose-950/30 p-4 text-xs text-rose-200"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Customer</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  The order must be attached to a lead in this workspace.
                </p>
              </div>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-500">
                Required
              </span>
            </div>
            <label className="block space-y-2 text-xs text-zinc-400">
              <span className="font-medium text-zinc-300">Lead</span>
              <select
                value={leadId}
                onChange={(event) => {
                  const nextLeadId = event.target.value;
                  const nextLead = leads.find((lead) => lead.id === nextLeadId);
                  setLeadId(nextLeadId);
                  setSourceNote(nextLead?.notes?.trim() || "");
                  setLeadNotes([]);
                  setLeadNotesError(null);
                }}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-600"
                required
              >
                <option value="">Select a customer</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.full_name} · {lead.phone}
                  </option>
                ))}
              </select>
            </label>
            {selectedLead && (
              <div className="mt-4 grid gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 sm:grid-cols-3">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Name</span>
                  <span className="mt-1 block text-xs font-medium text-zinc-200">{selectedLead.full_name}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Phone</span>
                  <span className="mt-1 block text-xs font-mono text-zinc-300">{selectedLead.phone}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Email</span>
                  <span className="mt-1 block truncate text-xs text-zinc-300">{selectedLead.email || "Not provided"}</span>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-sm">
            <div className="mb-5 border-b border-zinc-800/80 pb-4">
              <h2 className="text-sm font-semibold text-zinc-100">Order items</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Add products and set the price per piece. The catalog price is the minimum reference price.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={productToAdd}
                onChange={(event) => setProductToAdd(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                aria-label="Product to add"
              >
                <option value="">Select a product to add</option>
                {addableProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title} · {product.currency} {product.price.toFixed(2)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addItem}
                disabled={!productToAdd}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-3 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                Add product
              </button>
            </div>
            {resolvedItems.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
                No products added yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {resolvedItems.map((item) => (
                  <div key={item.product.id} className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-100">{item.product.title}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
                          {item.product.category} · minimum {item.product.currency} {item.product.price.toFixed(2)} each
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-rose-300"
                        aria-label={`Remove ${item.product.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <label className="space-y-1 text-[10px] uppercase tracking-wider text-zinc-500">
                        <span>Quantity</span>
                        <input
                          type="number"
                          min={1}
                          max={1000}
                          step={1}
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(item.product.id, {
                              quantity: Math.max(1, Math.min(1000, Number(event.target.value) || 1)),
                            })
                          }
                          className="block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-mono normal-case tracking-normal text-zinc-100 outline-none focus:border-zinc-600"
                        />
                      </label>
                      <label className="space-y-1 text-[10px] uppercase tracking-wider text-zinc-500">
                        <span>Price per piece</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateItem(item.product.id, {
                              unitPrice: Math.max(0, Number(event.target.value) || 0),
                            })
                          }
                          className="block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-mono normal-case tracking-normal text-zinc-100 outline-none focus:border-zinc-600"
                        />
                      </label>
                      <div className="space-y-1 text-[10px] uppercase tracking-wider text-zinc-500">
                        <span>Line total</span>
                        <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-mono normal-case tracking-normal text-zinc-100">
                          {item.product.currency} {item.lineTotal.toFixed(2)}
                        </p>
                        {item.unitPrice < item.product.price && (
                          <p className="mt-1 text-[10px] normal-case tracking-normal text-amber-300">
                            Below minimum {item.product.currency} {item.product.price.toFixed(2)} / piece
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-sm">
            <div className="mb-5 border-b border-zinc-800/80 pb-4">
              <h2 className="text-sm font-semibold text-zinc-100">Order note and source</h2>
              <p className="mt-1 text-xs text-zinc-500">
                The lead note is prefilled here as context. Edit it to save the order-specific handoff note.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block space-y-2 text-xs text-zinc-400">
                <span className="font-medium text-zinc-300">Order source</span>
                <select
                  value={orderSource}
                  onChange={(event) => setOrderSource(event.target.value as OrderSource)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                >
                  {Object.entries(sourceLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2 text-xs text-zinc-400 md:col-span-2">
                <span className="font-medium text-zinc-300">
                  Order note <span className="text-zinc-600">(optional)</span>
                </span>
                <textarea
                  value={sourceNote}
                  onChange={(event) => {
                    setSourceNote(event.target.value);
                  }}
                  maxLength={1000}
                  rows={4}
                  placeholder="Add context from the call or explain the order handoff."
                  className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Lead note history</h2>
                <p className="mt-1 text-xs text-zinc-500">Notes from this lead, including other operators.</p>
              </div>
              <Clock3 className="h-4 w-4 text-zinc-500" />
            </div>
            {leadNotesError ? (
              <p className="text-xs text-amber-200/80">{leadNotesError}</p>
            ) : leadNotes.length === 0 ? (
              <p className="text-xs text-zinc-500">No saved lead notes yet.</p>
            ) : (
              <div className="space-y-3">
                {leadNotes.map((note) => (
                  <article key={note.id} className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4">
                    <div className="flex items-center justify-between gap-3 text-[10px] text-zinc-500">
                      <span className="font-medium text-zinc-300">{note.author_name}</span>
                      <time dateTime={note.created_at}>{new Date(note.created_at).toLocaleString("en-GB")}</time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{note.body}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="h-fit xl:sticky xl:top-0">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Order summary</h2>
                <p className="mt-1 text-xs text-zinc-500">Review before saving.</p>
              </div>
              <ShoppingCart className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between gap-4 text-zinc-400">
                <span>Customer</span>
                <span className="max-w-[170px] truncate text-right text-zinc-200">{selectedLead?.full_name || "Not selected"}</span>
              </div>
              <div className="flex justify-between gap-4 text-zinc-400">
                <span>Items</span>
                <span className="text-right text-zinc-200">{resolvedItems.length}</span>
              </div>
              <div className="flex justify-between gap-4 text-zinc-400">
                <span>Currency</span>
                <span className="font-mono text-zinc-200">{orderCurrency}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-zinc-800/80 pt-3 text-zinc-400">
                <span>Total</span>
                <span className="font-mono text-base font-semibold text-zinc-100">
                  {resolvedItems.length ? `${orderCurrency} ${orderTotal.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-zinc-500">
                <span>Minimum reference total</span>
                <span className="font-mono">{resolvedItems.length ? `${orderCurrency} ${minimumOrderTotal.toFixed(2)}` : "—"}</span>
              </div>
            </div>
            {isBelowMinimum && (
              <div className="mt-5 rounded-xl border border-amber-800/70 bg-amber-950/30 p-3 text-[11px] leading-relaxed text-amber-200" role="status">
                <p className="font-semibold">Order is below the minimum reference price.</p>
                <p className="mt-1 text-amber-200/80">Minimum reference total: {orderCurrency} {minimumOrderTotal.toFixed(2)}. You can still create this order.</p>
              </div>
            )}
            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-[11px] leading-relaxed text-zinc-400">
              <CheckCircle2 className="mb-1.5 h-4 w-4 text-zinc-300" />
              The order is created as In-Progress. Items, total and the audit event are written atomically on the server.
            </div>
            <button
              type="submit"
              disabled={isPending || !selectedLead || resolvedItems.length === 0}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-3 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isPending ? "Creating order…" : "Create Order"}
            </button>
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="mt-2 w-full rounded-xl px-4 py-2.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>
        </aside>
      </div>
    </form>
  );
}
