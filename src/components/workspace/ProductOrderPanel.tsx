"use client";

import React, { useState } from "react";
import {
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle2,
  Sparkles,
  Zap,
  X,
  AlertCircle,
  Tag,
  BookOpen,
} from "lucide-react";
import { Product } from "@/lib/products";
import { Lead } from "@/lib/leads";
import type { LeadNoteDTO } from "@/lib/dal/leadNotes";
import { getCrossSellRecommendations, Recommendation } from "@/lib/recommendations";
import { buildCallOrderItems, type CallOrderItemInput } from "@/lib/callOrder";
import { formatCurrencyAmount } from "@/lib/currency";
import {
  DeliveryAddressFields,
  EMPTY_DELIVERY_ADDRESS_DRAFT,
  toDeliveryAddressSnapshot,
} from "@/components/orders/DeliveryAddressFields";
import {
  getProductPricingLadder,
  getOperatorPitch,
  PACKAGE_DURATION_OPTIONS,
} from "@/lib/pricingLadder";
import type { DeliveryAddressSnapshot } from "@/lib/deliveryAddress";

export interface OrderPlacementResult {
  orderId: string;
  callCompleted: boolean;
}

type OrderSource = "previous_call" | "email" | "web_form" | "manual" | "other";

interface ProductOrderPanelProps {
  products: Product[];
  activeLead: Lead | null;
  leadNotes?: LeadNoteDTO[];
  orderMode?: "call" | "manual";
  onClose: () => void;
  onOrderPlaced: (
    input: {
      items: CallOrderItemInput[];
      orderSource?: OrderSource;
      sourceNote?: string | null;
      deliveryAddressSnapshot: DeliveryAddressSnapshot;
    },
  ) => Promise<OrderPlacementResult | null>;
}

export function ProductOrderPanel({
  products,
  activeLead,
  leadNotes = [],
  orderMode = "call",
  onClose,
  onOrderPlaced,
}: ProductOrderPanelProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || "");
  const [bundleProduct, setBundleProduct] = useState<Product | null>(null);

  const effectiveProductId = selectedProductId || products[0]?.id || "";
  const selectedProduct = products.find((p) => p.id === effectiveProductId) || products[0];

  const pricingLadder = React.useMemo(() => getProductPricingLadder(selectedProduct), [selectedProduct]);
  const [prevPricingLadder, setPrevPricingLadder] = useState(pricingLadder);
  const [selectedTier, setSelectedTier] = useState<"standard" | "bonus" | "floor" | "custom">("standard");
  const [quantity, setQuantity] = useState<number>(4);
  const [unitPrice, setUnitPrice] = useState<number>(() => pricingLadder.standardUnitPrice);

  if (pricingLadder !== prevPricingLadder) {
    setPrevPricingLadder(pricingLadder);
    setUnitPrice(pricingLadder.standardUnitPrice);
    setSelectedTier("standard");
  }

  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [callOutcome, setCallOutcome] = useState<string>("order_placed");
  const [wrapUpNotes, setWrapUpNotes] = useState<string>("");
  const [orderSource, setOrderSource] = useState<OrderSource>("manual");
  const [sourceNote, setSourceNote] = useState<string>("");
  const [isSuccessAlert, setIsSuccessAlert] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(() => ({
    ...EMPTY_DELIVERY_ADDRESS_DRAFT,
    recipient_name: activeLead?.full_name || "",
    city: activeLead?.city || "",
    country: activeLead?.country || "CZ",
  }));
  const [prevLeadId, setPrevLeadId] = useState(activeLead?.id);
  if (activeLead && activeLead.id !== prevLeadId) {
    setPrevLeadId(activeLead.id);
    setDeliveryAddress((prev) => ({
      ...prev,
      recipient_name: prev.recipient_name || activeLead.full_name || "",
      city: prev.city || activeLead.city || "",
      country: prev.country || "CZ",
    }));
  }
  const leadNotesInitializedRef = React.useRef(false);

  const formattedLeadNotes = leadNotes
    .map((note) => {
      const timestamp = new Date(note.created_at).toLocaleString("cs-CZ", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `[${timestamp} · ${note.author_name}]\n${note.body}`;
    })
    .join("\n\n");

  React.useEffect(() => {
    if (orderMode === "manual" && !leadNotesInitializedRef.current && formattedLeadNotes) {
      leadNotesInitializedRef.current = true;
      setSourceNote(formattedLeadNotes);
    }
  }, [formattedLeadNotes, orderMode]);

  const crossSellRecs = getCrossSellRecommendations(selectedProduct, products);
  const topRec: Recommendation | undefined = crossSellRecs[0];

  const primarySubtotal = unitPrice * quantity;
  const bundleSubtotal = bundleProduct ? topRec?.bundlePrice || bundleProduct.price : 0;
  
  const rawSubtotal = primarySubtotal + bundleSubtotal;
  const discountAmount = (rawSubtotal * discountPercent) / 100;
  const grandTotal = Math.max(0, rawSubtotal - discountAmount);
  const anchorSubtotal = pricingLadder.anchorUnitPrice * quantity;
  const clientSavings = Math.max(0, anchorSubtotal - primarySubtotal);
  const isBelowFloor = unitPrice < pricingLadder.floorUnitPrice;

  const pitch = getOperatorPitch({
    tierId: selectedTier,
    quantity,
    unitPrice,
    anchorPrice: pricingLadder.anchorUnitPrice,
    currency: pricingLadder.currency,
    productTitle: selectedProduct?.title,
  });

  const deliveryAddressSnapshot = toDeliveryAddressSnapshot(deliveryAddress);

  const handleSelectTier = (tier: "standard" | "bonus" | "floor") => {
    setSelectedTier(tier);
    if (tier === "standard") setUnitPrice(pricingLadder.standardUnitPrice);
    if (tier === "bonus") setUnitPrice(pricingLadder.bonusUnitPrice);
    if (tier === "floor") setUnitPrice(pricingLadder.floorUnitPrice);
  };

  const handleManualPriceChange = (val: number) => {
    setUnitPrice(val);
    setSelectedTier("custom");
  };

  const handleAddBundleItem = (rec: Recommendation) => {
    setBundleProduct(rec.recommendedProduct);
    setDiscountPercent(15);
  };

  const handlePlaceOrder = async () => {
    if (!selectedProduct || !activeLead || isSubmitting) return;
    if (!deliveryAddressSnapshot) {
      setOrderError("Enter a complete delivery address before placing the order.");
      return;
    }

    setOrderError(null);
    setIsSubmitting(true);
    try {
      const items: CallOrderItemInput[] = buildCallOrderItems({
        product_id: selectedProduct.id,
        unit_price: unitPrice,
        quantity,
        discount_percent: discountPercent,
        bundle: bundleProduct
          ? { product_id: bundleProduct.id, unit_price: bundleSubtotal }
          : undefined,
      });

      const result = await onOrderPlaced({
        items,
        orderSource: orderMode === "call" ? "previous_call" : orderSource,
        sourceNote: orderMode === "manual" ? sourceNote.trim() || null : null,
        deliveryAddressSnapshot,
      });
      if (!result) {
        setOrderError("Order was not created. Check the error above and try again.");
        return;
      }

      setLastOrderId(result.orderId);
      if (!result.callCompleted) {
        setOrderError(`Order #${result.orderId} was created, but call completion failed. The order was not reported as fully completed.`);
        return;
      }

      setIsSuccessAlert(true);
      setTimeout(() => setIsSuccessAlert(false), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-zinc-900/95 border border-zinc-700/80 backdrop-blur-md rounded-2xl p-5 shadow-2xl space-y-5 flex flex-col max-h-[calc(100vh-2rem)] overflow-y-auto">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <ShoppingCart className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 id="order-dialog-title" className="text-sm font-semibold text-zinc-100">
              {orderMode === "manual" ? "Create Order" : "Sales Checkout & Negotiation"}
            </h2>
            <p className="text-[11px] text-zinc-400">
              {orderMode === "manual"
                ? "Record an order without creating a new call"
                : "Order creation after call outcome selection"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close order flow"
          title="Close order flow"
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Success Notification Alert */}
      {isSuccessAlert && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <p className="font-bold">Order #{lastOrderId} successfully placed!</p>
            <p className="text-[11px] text-emerald-200/80">{formatCurrencyAmount(grandTotal, selectedProduct?.currency || "USD")} recorded for {activeLead?.full_name}.</p>
          </div>
        </div>
      )}

      {orderError && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs" role="alert">
          {orderError}
        </div>
      )}

      {/* Doručovací adresa s vyhledáváním a potvrzením */}
      <DeliveryAddressFields
        value={deliveryAddress}
        onChange={setDeliveryAddress}
        disabled={isSubmitting}
        idPrefix="workspace-delivery-address"
        leadContext={activeLead ? {
          recipient_name: activeLead.full_name,
          city: activeLead.city,
          country: "CZ",
        } : null}
      />

      {/* Primary Product Selector */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
          Primary Product Selection
        </label>

        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
          {products.map((prod) => {
            const isSelected = prod.id === selectedProductId;
            return (
              <div
                key={prod.id}
                onClick={() => {
                  setSelectedProductId(prod.id);
                  setBundleProduct(null);
                }}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 text-xs ${
                  isSelected
                    ? "bg-zinc-900 border-zinc-700 text-zinc-100"
                    : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? "border-zinc-300 bg-zinc-100" : "border-zinc-700"}`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-200 line-clamp-1">{prod.title}</p>
                    <p className="text-[11px] text-zinc-500 uppercase">{prod.category}</p>
                  </div>
                </div>
                <span className="font-mono font-semibold text-zinc-200 shrink-0">{formatCurrencyAmount(prod.price, prod.currency || "USD")}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CENOVÉ MANTINELY & VYJEDNÁVACÍ SCHODY (Price Ladder) */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 space-y-4">
        
        {/* Banner mantinelů */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-300">Cenové mantinely:</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-zinc-500 line-through" title="Běžná webová cena z e-shopu">
              Web: {pricingLadder.anchorUnitPrice.toLocaleString("cs-CZ")} {pricingLadder.currency}
            </span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-200 font-medium" title="Běžná nabídka v hovoru">
              Telefon: {pricingLadder.standardUnitPrice.toLocaleString("cs-CZ")} {pricingLadder.currency}
            </span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-400 font-medium" title="Minimální limit (podlaha)">
              Dno: {pricingLadder.floorUnitPrice.toLocaleString("cs-CZ")} {pricingLadder.currency}
            </span>
          </div>
        </div>

        {/* 1. Volba délky kúry (Počet balení) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-zinc-400 text-[10px]">
              Délka kúry (počet balení):
            </span>
            <span className="text-zinc-400 text-[11px]">Doporučeno: 4 balení (plná kúra)</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {PACKAGE_DURATION_OPTIONS.map((opt) => {
              const isSelected = quantity === opt.quantity;
              return (
                <button
                  key={opt.quantity}
                  type="button"
                  onClick={() => setQuantity(opt.quantity)}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                    isSelected
                      ? "border-zinc-500 bg-zinc-800 text-zinc-100 font-semibold ring-1 ring-zinc-500/30 shadow-sm"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <div className="text-xs">{opt.label}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{opt.months} měs.</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Cenové schody vyjednávání */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-zinc-400 text-[10px]">
              Cenový schod pro vyjednávání v hovoru:
            </span>
            <span className="text-zinc-500 text-[11px]">Zvolte podle reakce klienta</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            
            {/* Schod 1: Standard nabídka */}
            <button
              type="button"
              onClick={() => handleSelectTier("standard")}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                selectedTier === "standard"
                  ? "border-zinc-500 bg-zinc-800 ring-1 ring-zinc-500/30 shadow-sm"
                  : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
              }`}
            >
              <div className="text-xs font-semibold text-zinc-200">1. Standard nabídka</div>
              <div className="mt-1 font-mono font-semibold text-sm text-zinc-100">
                {pricingLadder.standardUnitPrice.toLocaleString("cs-CZ")} {pricingLadder.currency}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Výchozí start v hovoru</div>
            </button>

            {/* Schod 2: Bonus E-knihy */}
            <button
              type="button"
              onClick={() => handleSelectTier("bonus")}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                selectedTier === "bonus"
                  ? "border-zinc-500 bg-zinc-800 ring-1 ring-zinc-500/30 shadow-sm"
                  : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
              }`}
            >
              <div className="text-xs font-semibold text-zinc-200">2. Sleva + E-knihy</div>
              <div className="mt-1 font-mono font-semibold text-sm text-zinc-100">
                {pricingLadder.bonusUnitPrice.toLocaleString("cs-CZ")} {pricingLadder.currency}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">+ 2x E-kniha zdarma</div>
            </button>

            {/* Schod 3: Manažerská záchrana */}
            <button
              type="button"
              onClick={() => handleSelectTier("floor")}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                selectedTier === "floor"
                  ? "border-zinc-500 bg-zinc-800 ring-1 ring-zinc-500/30 shadow-sm"
                  : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
              }`}
            >
              <div className="text-xs font-semibold text-zinc-200">3. Dno / Záchrana</div>
              <div className="mt-1 font-mono font-semibold text-sm text-zinc-100">
                {pricingLadder.floorUnitPrice.toLocaleString("cs-CZ")} {pricingLadder.currency}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Minimální limit (Dno)</div>
            </button>

          </div>
        </div>

        {/* 3. Manuální úprava počtu kusů a ceny operátorem */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Manuální úprava operátora (podle potřeby):
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-zinc-400 block text-[11px] mb-1">Počet balení (ks):</label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-1 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  className="w-16 text-center font-mono font-bold text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-md py-1 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-1 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-zinc-400 block text-[11px] mb-1">Cena za 1 balení:</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={unitPrice}
                  onChange={(e) => handleManualPriceChange(Math.max(0, Number(e.target.value) || 0))}
                  className={`w-full font-mono font-bold bg-zinc-950 border rounded-md py-1 px-2.5 text-xs ${
                    isBelowFloor
                      ? "border-rose-500 text-rose-300 ring-1 ring-rose-500/40"
                      : "border-zinc-800 text-zinc-100"
                  }`}
                />
                <span className="font-mono text-zinc-500 text-xs shrink-0">{pricingLadder.currency}</span>
              </div>
            </div>
          </div>

          {isBelowFloor && (
            <div className="flex items-center gap-1.5 text-rose-300 text-[11px] bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span>
                Upozornění: Cena {unitPrice} {pricingLadder.currency} je pod minimálním limitem ({pricingLadder.floorUnitPrice} {pricingLadder.currency})!
              </span>
            </div>
          )}
        </div>

        {/* 4. Tahák do telefonu (Operator Pitch) */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between font-semibold text-zinc-300 text-xs">
            <span>{pitch.title}</span>
            <span className="rounded bg-zinc-800 border border-zinc-700/60 px-1.5 py-0.5 text-[10px] text-zinc-400 font-mono">Tahák</span>
          </div>
          <p className="text-zinc-200 leading-relaxed italic text-xs">
            {pitch.text}
          </p>
          {pitch.bonusText && (
            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-zinc-400">
              <BookOpen className="w-3 h-3 text-zinc-500 shrink-0" />
              <span>{pitch.bonusText}</span>
            </div>
          )}
        </div>

      </div>

      {/* AI Cross-Sell Recommendation Card */}
      {topRec && (
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              <span>Doplňkový produkt (Cross-Sell)</span>
            </div>
            <span className="px-2 py-0.5 bg-zinc-900 text-zinc-300 text-[10px] font-medium rounded-md border border-zinc-800">
              Sleva 15%
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={topRec.recommendedProduct.image_url}
                alt={topRec.recommendedProduct.title}
                className="w-9 h-9 rounded-lg object-cover border border-zinc-800 shrink-0"
              />
              <div>
                <p className="font-semibold text-xs text-zinc-100 line-clamp-1">{topRec.recommendedProduct.title}</p>
                <div className="flex items-center gap-1.5 text-[11px] font-mono">
                  <span className="line-through text-zinc-500">{formatCurrencyAmount(topRec.originalPrice, topRec.recommendedProduct.currency || "USD")}</span>
                  <span className="text-zinc-100 font-semibold">{formatCurrencyAmount(topRec.bundlePrice, topRec.recommendedProduct.currency || "USD")}</span>
                </div>
              </div>
            </div>

            {bundleProduct?.id === topRec.recommendedProduct.id ? (
              <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium rounded-lg flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Přidáno
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleAddBundleItem(topRec)}
                className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Přidat</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-zinc-400 leading-tight">
            <strong className="text-zinc-300">Operator Script:</strong> &ldquo;{topRec.reason}&rdquo;
          </p>
        </div>
      )}

      {/* Volitelná dodatečná promo sleva */}
      <div className="space-y-3 pt-2 border-t border-zinc-800">
        <div className="flex items-center justify-between text-xs">
          <label className="text-zinc-400">Dodatečná promo sleva (volitelně):</label>
          <select
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value))}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none"
          >
            <option value={0}>0% Bez dodatečné slevy</option>
            <option value={5}>5% První objednávka</option>
            <option value={10}>10% Mimořádný promo kód</option>
            <option value={15}>15% VIP zákazník</option>
          </select>
        </div>

        {/* Finanční rekapitulace objednávky */}
        <div className="pt-2 border-t border-zinc-800 space-y-1.5 text-xs">
          <div className="flex justify-between text-zinc-400">
            <span>Vybraný produkt ({quantity} ks × {unitPrice.toLocaleString("cs-CZ")} {pricingLadder.currency}):</span>
            <span className="font-mono text-zinc-200">{formatCurrencyAmount(primarySubtotal, selectedProduct?.currency || "CZK")}</span>
          </div>

          <div className="flex justify-between text-zinc-400">
            <span>Běžná hodnota z e-shopu (kotva):</span>
            <span className="font-mono line-through text-zinc-500">{formatCurrencyAmount(anchorSubtotal, selectedProduct?.currency || "CZK")}</span>
          </div>

          {clientSavings > 0 && (
            <div className="flex justify-between text-emerald-400 font-semibold">
              <span>Úspora pro klienta v hovoru:</span>
              <span className="font-mono">-{formatCurrencyAmount(clientSavings, selectedProduct?.currency || "CZK")}</span>
            </div>
          )}

          {bundleProduct && (
            <div className="flex justify-between text-zinc-300 font-medium">
              <span>Doplňkový produkt (+{bundleProduct.title.substring(0, 15)}...):</span>
              <span className="font-mono">{formatCurrencyAmount(bundleSubtotal, bundleProduct.currency || selectedProduct?.currency || "CZK")}</span>
            </div>
          )}

          {discountPercent > 0 && (
            <div className="flex justify-between text-zinc-300">
              <span>Extra sleva ({discountPercent}%):</span>
              <span className="font-mono">-{formatCurrencyAmount(discountAmount, selectedProduct?.currency || "CZK")}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-sm text-zinc-100 pt-2 border-t border-zinc-800">
            <span>Konečná cena k úhradě klientem:</span>
            <span className="font-mono text-zinc-100 text-base">{formatCurrencyAmount(grandTotal, selectedProduct?.currency || "CZK")}</span>
          </div>
        </div>

        {/* Tlačítka pro dokončení */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={!selectedProduct || !activeLead || isSubmitting || !deliveryAddressSnapshot}
            aria-busy={isSubmitting}
            className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{isSubmitting ? "Ukládám objednávku…" : `Zaznamenat objednávku (${formatCurrencyAmount(grandTotal, selectedProduct?.currency || "CZK")})`}</span>
          </button>

          <div
            role="status"
            className="w-full py-2.5 bg-zinc-950/60 border border-zinc-800 text-zinc-500 font-medium rounded-lg text-xs flex items-center justify-center gap-1.5"
            title="SMS platební odkaz vyžaduje napojení platební brány"
          >
            <Zap className="w-3.5 h-3.5 text-zinc-600" />
            <span>SMS platební brána nedostupná</span>
          </div>
        </div>
      </div>

      {leadNotes.length > 0 && (
        <section className="space-y-2 border-t border-zinc-800 pt-3">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Poznámky k leadu z konzultace</h3>
            <p className="mt-1 text-[11px] text-zinc-500">Předchozí poznámky pro kontext objednávky.</p>
          </div>
          <div className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 text-xs leading-relaxed text-zinc-300">
            {formattedLeadNotes}
          </div>
        </section>
      )}

      {/* Wrap Up & Notes */}
      {orderMode === "manual" && (
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <label htmlFor="order-source" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
            Zdroj objednávky (Order source)
          </label>
          <select
            id="order-source"
            value={orderSource}
            onChange={(event) => setOrderSource(event.target.value as OrderSource)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none"
          >
            <option value="manual">Manuální / administrativní záznam</option>
            <option value="previous_call">Předchozí hovor</option>
            <option value="email">E-mail</option>
            <option value="web_form">Webový formulář</option>
            <option value="other">Jiné</option>
          </select>
          <label htmlFor="order-note" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
            Poznámka k objednávce
          </label>
          <textarea
            id="order-note"
            rows={2}
            value={sourceNote}
            onChange={(event) => setSourceNote(event.target.value)}
            placeholder="Doplňující poznámka k objednávce nebo dohodnuté specifikaci..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
        </div>
      )}

      {orderMode === "call" && (
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
            Výsledek hovoru & Poznámky k uzavření
          </label>

          <select
            value={callOutcome}
            onChange={(e) => setCallOutcome(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none"
          >
            <option value="order_placed">Objednávka vytvořena — Prodej úspěšně dokončen</option>
            <option value="followup_scheduled">Naplánován další follow-up</option>
            <option value="objection_handled">Námitka vyřešena / Čeká na potvrzení</option>
            <option value="no_answer">Nezvedá / Hlasová schránka</option>
          </select>

          <textarea
            rows={3}
            value={wrapUpNotes}
            onChange={(e) => setWrapUpNotes(e.target.value)}
            placeholder="Poznamenejte reakci zákazníka, domluvené termíny doručení..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
        </div>
      )}

    </div>
  );
}
