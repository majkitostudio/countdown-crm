"use client";

import React, { useState } from "react";
import {
  ShoppingCart,
  Package,
  Plus,
  Minus,
  CheckCircle2,
  DollarSign,
  Calendar,
  FileText,
  Sparkles,
  ArrowRight,
  Layers,
  Zap,
  Tag
} from "lucide-react";
import { Product } from "@/lib/products";
import { Lead } from "@/lib/leads";
import { getCrossSellRecommendations, Recommendation } from "@/lib/recommendations";
import { createOrder } from "@/lib/orders";
import { addOperatorXp, unlockAchievement } from "@/lib/gamification";

interface ProductOrderPanelProps {
  products: Product[];
  activeLead: Lead | null;
  appliedPitch?: string;
  onOrderPlaced: (productId: string, totalAmount: number) => void;
}

export function ProductOrderPanel({
  products,
  activeLead,
  appliedPitch,
  onOrderPlaced,
}: ProductOrderPanelProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || "");
  const [bundleProduct, setBundleProduct] = useState<Product | null>(null);

  const [quantity, setQuantity] = useState<number>(1);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [callOutcome, setCallOutcome] = useState<string>("order_placed");
  const [wrapUpNotes, setWrapUpNotes] = useState<string>("");
  const [isSuccessAlert, setIsSuccessAlert] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string>("");

  React.useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  React.useEffect(() => {
    if (appliedPitch) {
      setWrapUpNotes((prev) => (prev ? `${prev}\n• ${appliedPitch}` : `• ${appliedPitch}`));
    }
  }, [appliedPitch]);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const crossSellRecs = getCrossSellRecommendations(selectedProduct, products);
  const topRec: Recommendation | undefined = crossSellRecs[0];

  const primarySubtotal = selectedProduct ? selectedProduct.price * quantity : 0;
  const bundleSubtotal = bundleProduct ? topRec?.bundlePrice || bundleProduct.price : 0;
  
  const rawSubtotal = primarySubtotal + bundleSubtotal;
  const discountAmount = (rawSubtotal * discountPercent) / 100;
  const grandTotal = Math.max(0, rawSubtotal - discountAmount);

  const handleAddBundleItem = (rec: Recommendation) => {
    setBundleProduct(rec.recommendedProduct);
    setDiscountPercent(15);
  };

  const handlePlaceOrder = async () => {
    if (!selectedProduct || !activeLead) return;

    const newOrd = await createOrder({
      lead_id: activeLead.id,
      lead_name: activeLead.full_name,
      product_id: selectedProduct.id,
      product_title: bundleProduct ? `${selectedProduct.title} + ${bundleProduct.title}` : selectedProduct.title,
      total_amount: grandTotal,
      status: "completed",
      agent_name: "Operator",
    });

    setLastOrderId(newOrd.id);
    onOrderPlaced(selectedProduct.id, grandTotal);
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
    <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-5 flex flex-col h-full overflow-y-auto">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">Sales Checkout & Cross-Sell</h2>
            <p className="text-[11px] text-zinc-400">1-Click order creation & post-call wrap up</p>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {isSuccessAlert && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <p className="font-bold">Order #{lastOrderId} Successfully Placed!</p>
            <p className="text-[11px] text-emerald-200/80">${grandTotal.toFixed(2)} recorded for {activeLead?.full_name}.</p>
          </div>
        </div>
      )}

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
                    ? "bg-emerald-500/10 border-emerald-500/40 text-zinc-100"
                    : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? "border-emerald-500 bg-emerald-500" : "border-zinc-700"}`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-200 line-clamp-1">{prod.title}</p>
                    <p className="text-[11px] text-zinc-500 uppercase">{prod.category}</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-zinc-200 shrink-0">${prod.price.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Cross-Sell Recommendation Card */}
      {topRec && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>AI Recommended Cross-Sell Bundle</span>
            </div>
            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] font-bold rounded-md border border-cyan-500/30">
              Save 15%
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 bg-zinc-950/80 p-2.5 rounded-lg border border-cyan-500/20">
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
                  <span className="text-emerald-400 font-bold">${topRec.bundlePrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {bundleProduct?.id === topRec.recommendedProduct.id ? (
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Added
              </span>
            ) : (
              <button
                onClick={() => handleAddBundleItem(topRec)}
                className="px-2.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-all shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Bundle</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-cyan-200/90 leading-tight">
            <strong>Operator Script:</strong> &ldquo;{topRec.reason}&rdquo;
          </p>
        </div>
      )}

      {/* Quantity & Discount Controls */}
      <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-4 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400 font-medium">Quantity (Primary)</span>
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="p-1 text-zinc-400 hover:text-zinc-100"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-mono font-bold text-zinc-100 w-6 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="p-1 text-zinc-400 hover:text-zinc-100"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-400 font-medium">Closing Discount</span>
          <select
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value))}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none"
          >
            <option value={0}>No Discount (0%)</option>
            <option value={10}>10% Special Promo</option>
            <option value={15}>15% VIP / Bundle Discount</option>
            <option value={25}>25% Multi-Pack Special</option>
          </select>
        </div>

        {/* Price Breakdown */}
        <div className="pt-2 border-t border-zinc-800 space-y-1">
          <div className="flex justify-between text-zinc-400">
            <span>Primary Item:</span>
            <span className="font-mono">${primarySubtotal.toFixed(2)}</span>
          </div>

          {bundleProduct && (
            <div className="flex justify-between text-cyan-400 font-medium">
              <span>Bundle (+{bundleProduct.title.substring(0, 15)}...):</span>
              <span className="font-mono">${bundleSubtotal.toFixed(2)}</span>
            </div>
          )}

          {discountPercent > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Discount ({discountPercent}%):</span>
              <span className="font-mono">-${discountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-sm text-zinc-100 pt-1 border-t border-zinc-800">
            <span>Total Payable:</span>
            <span className="font-mono text-emerald-400">${grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={!selectedProduct || !activeLead}
          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Place Order for {activeLead?.full_name || "Customer"}</span>
        </button>
      </div>

      {/* Post-Call Wrap Up Section */}
      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
          Call Outcome & Wrap-up Notes
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
