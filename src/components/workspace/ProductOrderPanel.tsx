"use client";

import React, { useState } from "react";
import {
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle2,
  Sparkles,
  Zap
} from "lucide-react";
import { Product } from "@/lib/products";
import { Lead } from "@/lib/leads";
import { getCrossSellRecommendations, Recommendation } from "@/lib/recommendations";
import { addOperatorXp, unlockAchievement } from "@/lib/gamification";

interface OrderPlacementResult {
  orderId: string;
  callCompleted: boolean;
}

interface ProductOrderPanelProps {
  products: Product[];
  activeLead: Lead | null;
  selectedProductId: string;
  onProductChange: (productId: string) => void;
  isOrderFlowOpen: boolean;
  appliedPitch?: string;
  onOrderPlaced: (productId: string, totalAmount: number) => Promise<OrderPlacementResult | null>;
}

export function ProductOrderPanel({
  products,
  activeLead,
  selectedProductId: controlledProductId,
  onProductChange,
  isOrderFlowOpen,
  appliedPitch,
  onOrderPlaced,
}: ProductOrderPanelProps) {
  const [localSelectedProductId, setLocalSelectedProductId] = useState<string>(controlledProductId || products[0]?.id || "");
  const [bundleProduct, setBundleProduct] = useState<Product | null>(null);

  const [quantity, setQuantity] = useState<number>(1);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [callOutcome, setCallOutcome] = useState<string>("order_placed");
  const [wrapUpNotes, setWrapUpNotes] = useState<string>("");
  const [isSuccessAlert, setIsSuccessAlert] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string>("");
  const [isSmsSent, setIsSmsSent] = useState(false);

  const handleSendPayLinkSms = () => {
    if (!activeLead) return;
    setIsSmsSent(true);
    setTimeout(() => setIsSmsSent(false), 5000);
  };


  const lastPitchRef = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    if (appliedPitch && appliedPitch !== lastPitchRef.current) {
      lastPitchRef.current = appliedPitch;
      setWrapUpNotes((prev) => (prev ? `${prev}\n• ${appliedPitch}` : `• ${appliedPitch}`));
    }
  }, [appliedPitch]);

  const selectedProductId = controlledProductId || localSelectedProductId || products[0]?.id || "";
  const effectiveProductId = selectedProductId;
  const selectedProduct = products.find((p) => p.id === effectiveProductId) || products[0];

  const crossSellRecs = getCrossSellRecommendations(selectedProduct, products);
  const topRec: Recommendation | undefined = crossSellRecs[0];

  const primarySubtotal = selectedProduct ? selectedProduct.price * quantity : 0;
  const bundleSubtotal = bundleProduct ? topRec?.bundlePrice || bundleProduct.price : 0;
  
  const rawSubtotal = primarySubtotal + bundleSubtotal;
  const discountAmount = (rawSubtotal * discountPercent) / 100;
  const grandTotal = Math.max(0, rawSubtotal - discountAmount);

  if (!isOrderFlowOpen) {
    return (
      <section className="bg-zinc-900/30 border border-zinc-800/80 rounded-xl p-5 space-y-3 h-full">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-300">Order</h2>
        </div>
        <p className="text-xs leading-relaxed text-zinc-500">
          Order details will appear here after the operator selects the Order outcome.
        </p>
      </section>
    );
  }

  const handleAddBundleItem = (rec: Recommendation) => {
    setBundleProduct(rec.recommendedProduct);
    setDiscountPercent(15);
  };

  const handlePlaceOrder = async () => {
    if (!selectedProduct || !activeLead) return;

    setOrderError(null);
    const result = await onOrderPlaced(selectedProduct.id, grandTotal);
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

    // Gamification XP Rewards & Achievements
    addOperatorXp(150, "Completed customer order");
    unlockAchievement("first_deal");

    if (bundleProduct) {
      unlockAchievement("cross_sell_king");
    }

    setTimeout(() => setIsSuccessAlert(false), 5000);
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl p-5 shadow-sm space-y-5 flex flex-col h-full overflow-y-auto">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <ShoppingCart className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Sales Checkout & Cross-Sell</h2>
            <p className="text-[11px] text-zinc-400">Order creation after call outcome selection</p>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {isSuccessAlert && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <p className="font-bold">Order #{lastOrderId} successfully placed!</p>
            <p className="text-[11px] text-emerald-200/80">${grandTotal.toFixed(2)} recorded for {activeLead?.full_name}.</p>
          </div>
        </div>
      )}

      {orderError && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs" role="alert">
          {orderError}
        </div>
      )}

      {/* Primary Product Selector */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
          Primary Product Selection
        </label>

      <div className={`space-y-2 max-h-[140px] overflow-y-auto pr-1 ${!isOrderFlowOpen ? "opacity-60" : ""}`}>
          {products.map((prod) => {
            const isSelected = prod.id === selectedProductId;
            return (
              <div
                key={prod.id}
                onClick={() => {
                  if (!isOrderFlowOpen) return;
                  setLocalSelectedProductId(prod.id);
                  onProductChange(prod.id);
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
                <span className="font-mono font-semibold text-zinc-200 shrink-0">${prod.price.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Cross-Sell Recommendation Card */}
      {topRec && (
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              <span>AI Recommended Cross-Sell Bundle</span>
            </div>
            <span className="px-2 py-0.5 bg-zinc-900 text-zinc-300 text-[10px] font-medium rounded-md border border-zinc-800">
              Save 15%
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
                  <span className="line-through text-zinc-500">${topRec.originalPrice.toFixed(2)}</span>
                  <span className="text-zinc-100 font-semibold">${topRec.bundlePrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {bundleProduct?.id === topRec.recommendedProduct.id ? (
              <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium rounded-lg flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Added
              </span>
            ) : (
              <button
                onClick={() => handleAddBundleItem(topRec)}
                className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Bundle</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-zinc-400 leading-tight">
            <strong className="text-zinc-300">Operator Script:</strong> &ldquo;{topRec.reason}&rdquo;
          </p>
        </div>
      )}


      {/* Quantity & Discount Controls */}
      <div className="space-y-3 pt-2 border-t border-zinc-800">
        <div className="flex items-center justify-between text-xs">
          <label className="text-zinc-400">Quantity:</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-mono text-zinc-200 font-semibold w-6 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="p-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <label className="text-zinc-400">Apply Promo Discount:</label>
          <select
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value))}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none"
          >
            <option value={0}>0% No Discount</option>
            <option value={5}>5% First Order</option>
            <option value={10}>10% Special Promo</option>
            <option value={15}>15% VIP / Bundle Discount</option>
            <option value={25}>25% Multi-Pack Special</option>
          </select>
        </div>

        {/* Price Breakdown */}
        <div className="pt-2 border-t border-zinc-800 space-y-1 text-xs">
          <div className="flex justify-between text-zinc-400">
            <span>Primary Item:</span>
            <span className="font-mono">${primarySubtotal.toFixed(2)}</span>
          </div>

          {bundleProduct && (
            <div className="flex justify-between text-zinc-300 font-medium">
              <span>Bundle (+{bundleProduct.title.substring(0, 15)}...):</span>
              <span className="font-mono">${bundleSubtotal.toFixed(2)}</span>
            </div>
          )}

          {discountPercent > 0 && (
            <div className="flex justify-between text-zinc-300">
              <span>Discount ({discountPercent}%):</span>
              <span className="font-mono">-${discountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-sm text-zinc-100 pt-1 border-t border-zinc-800">
            <span>Total Payable:</span>
            <span className="font-mono text-zinc-100">${grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Order Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            onClick={handlePlaceOrder}
            disabled={!isOrderFlowOpen || !selectedProduct || !activeLead}
            className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 font-medium rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{isOrderFlowOpen ? "Place Order" : "Select Success / Order first"}</span>
          </button>

          <button
            onClick={handleSendPayLinkSms}
            disabled={!isOrderFlowOpen || !activeLead || isSmsSent}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 disabled:opacity-50 text-zinc-300 font-medium rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {isSmsSent ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">SMS Odeslána</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-zinc-400" />
                <span>Send SMS Pay-Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Post-Call Wrap Up Section */}
      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
          Post-call outcome & notes
        </label>

        <select
          value={callOutcome}
          onChange={(e) => setCallOutcome(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none"
        >
          <option value="order_placed">Order Placed — Sale Completed</option>
          <option value="followup_scheduled">Follow-up Scheduled</option>
          <option value="objection_handled">Objection Handled / Pending</option>
          <option value="no_answer">No Answer / Voicemail</option>
        </select>

        <textarea
          rows={3}
          value={wrapUpNotes}
          onChange={(e) => setWrapUpNotes(e.target.value)}
          placeholder="Record notes regarding customer reaction, agreed follow-up or objections..."
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
        />
      </div>

    </div>
  );
}
