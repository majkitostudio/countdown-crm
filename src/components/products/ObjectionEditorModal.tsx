"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  X,
  Plus,
  Trash2,
  Check,
  ArrowRight,
  Eye,
} from "lucide-react";
import { Product } from "@/lib/products";
import { ObjectionBattleCard, saveObjectionCard, deleteObjectionCard } from "@/lib/objections";

interface ObjectionEditorModalProps {
  initialCard?: ObjectionBattleCard | null;
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function ObjectionEditorModal({
  initialCard,
  products,
  isOpen,
  onClose,
  onSaved,
}: ObjectionEditorModalProps) {
  const [productId, setProductId] = useState<string>("");
  const [category, setCategory] = useState<ObjectionBattleCard["objection_category"]>("price");
  const [customerPhrase, setCustomerPhrase] = useState<string>("");
  const [rebuttals, setRebuttals] = useState<string[]>([""]);
  const [suggestedBundleId, setSuggestedBundleId] = useState<string>("");

  useEffect(() => {
    if (initialCard) {
      // The modal form is an editable draft synchronized when the selected card changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProductId(initialCard.product_id || "");
      setCategory(initialCard.objection_category);
      setCustomerPhrase(initialCard.customer_phrase);
      setRebuttals(initialCard.rebuttal_arguments.length > 0 ? initialCard.rebuttal_arguments : [""]);
      setSuggestedBundleId(initialCard.suggested_bundle_id || "");
    } else {
      setProductId(products[0]?.id || "");
      setCategory("price");
      setCustomerPhrase("");
      setRebuttals([""]);
      setSuggestedBundleId("");
    }
  }, [initialCard, isOpen, products]);

  if (!isOpen) return null;

  const handleAddRebuttal = () => {
    setRebuttals([...rebuttals, ""]);
  };

  const handleRemoveRebuttal = (idx: number) => {
    setRebuttals(rebuttals.filter((_, i) => i !== idx));
  };

  const handleRebuttalChange = (idx: number, text: string) => {
    const updated = [...rebuttals];
    updated[idx] = text;
    setRebuttals(updated);
  };

  const handleSave = () => {
    if (!customerPhrase.trim()) return;

    const selectedProd = products.find((p) => p.id === productId);
    const validRebuttals = rebuttals.map((r) => r.trim()).filter(Boolean);

    saveObjectionCard({
      id: initialCard?.id,
      product_id: productId || undefined,
      product_title: selectedProd?.title,
      objection_category: category,
      customer_phrase: customerPhrase.trim(),
      rebuttal_arguments: validRebuttals.length > 0 ? validRebuttals : ["Vyjádřete pochopení a nabídněte balíček se slevou."],
      suggested_bundle_id: suggestedBundleId || undefined,
    });

    onSaved();
    onClose();
  };

  const handleDelete = () => {
    if (initialCard?.id) {
      deleteObjectionCard(initialCard.id);
      onSaved();
      onClose();
    }
  };

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl relative text-zinc-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">
                {initialCard ? "Upravit Námitkový Skript (Objection Battlecard)" : "Vytvořit Nový Námitkový Skript"}
              </h2>
              <p className="text-xs text-zinc-400">
                Spravujte AI skripty a prodejní reakce operátorů v Operator Console
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Column Grid: Left Form / Right Operator Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Form Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-4 text-xs">
            
            {/* Product & Category Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                  Přiřazený produkt
                </label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                >
                  <option value="">Všechny produkty (Globální námitka)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} (${p.price})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                  Kategorie námitky
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as typeof category)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                >
                  <option value="price">Cena / Rozpočet (Price)</option>
                  <option value="competitor">Konkurence / Jiná značka (Competitor)</option>
                  <option value="trust">Nedůvěra / Kvalita (Trust)</option>
                  <option value="timing">Čas / Odložení nákupu (Timing)</option>
                </select>
              </div>
            </div>

            {/* Customer Phrase Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Typická fráze zákazníka (Objection Trigger)
              </label>
              <textarea
                rows={2}
                value={customerPhrase}
                onChange={(e) => setCustomerPhrase(e.target.value)}
                placeholder="např. Cena je příliš vysoká v porovnání s běžnými vitamíny v lékárně..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
              />
            </div>

            {/* Rebuttal Arguments List */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Doporučené reakce operátora (Rebuttals)
                </label>
                <button
                  type="button"
                  onClick={handleAddRebuttal}
                  className="text-[11px] font-medium text-zinc-300 hover:text-zinc-100 flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Přidat argument</span>
                </button>
              </div>

              <div className="space-y-2">
                {rebuttals.map((reb, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={reb}
                      onChange={(e) => handleRebuttalChange(idx, e.target.value)}
                      placeholder={`Argument #${idx + 1}...`}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                    />
                    {rebuttals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRebuttal(idx)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Live Operator Preview Panel (5 cols) */}
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              <Eye className="w-3.5 h-3.5 text-zinc-400" />
              <span>Operator Console Live Preview</span>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
                <span className="font-semibold text-zinc-200">
                  {selectedProduct?.title || "Zvolený produkt"}
                </span>
                <span className="px-2 py-0.5 bg-zinc-950 text-zinc-400 font-mono text-[10px] rounded border border-zinc-800">
                  {category.toUpperCase()}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-medium text-zinc-500 uppercase">Detekovaná námitka:</span>
                <p className="text-xs text-zinc-300 font-medium italic bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80">
                  &ldquo;{customerPhrase || "Sem se napíše fráze zákazníka..."}&rdquo;
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-medium text-zinc-500 uppercase">AI Rebuttal Cards:</span>
                <div className="space-y-1.5">
                  {rebuttals.filter(Boolean).length === 0 ? (
                    <div className="text-[11px] text-zinc-600 italic">Zadejte alespoň jeden argument...</div>
                  ) : (
                    rebuttals.filter(Boolean).map((arg, idx) => (
                      <div key={idx} className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-zinc-200 flex items-center justify-between gap-2">
                        <span className="line-clamp-2 leading-tight">• {arg}</span>
                        <ArrowRight className="w-3 h-3 text-zinc-500 shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          {initialCard ? (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Smazat skript</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Zrušit
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!customerPhrase.trim()}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Uložit skript</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
