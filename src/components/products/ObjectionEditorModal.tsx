"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Check, Eye, Plus, Sparkles, Trash2, X } from "lucide-react";
import { createObjectionAction, deleteObjectionAction, updateObjectionAction } from "@/app/actions/objections";
import { Product } from "@/lib/products";
import { ObjectionBattleCard } from "@/lib/objections";

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
  const [productId, setProductId] = useState("");
  const [objectionTitle, setObjectionTitle] = useState("");
  const [rebuttals, setRebuttals] = useState<string[]>([""]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialCard) {
      // The modal form is an editable draft synchronized when the selected card changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProductId(initialCard.product_id || "");
      setObjectionTitle(initialCard.objection_title);
      setRebuttals(initialCard.rebuttal_arguments.length > 0 ? initialCard.rebuttal_arguments : [""]);
    } else {
      setProductId(products[0]?.id || "");
      setObjectionTitle("");
      setRebuttals([""]);
    }
    setErrorMessage(null);
  }, [initialCard, isOpen, products]);

  if (!isOpen) return null;

  const handleAddRebuttal = () => setRebuttals([...rebuttals, ""]);

  const handleRemoveRebuttal = (idx: number) => {
    setRebuttals(rebuttals.filter((_, i) => i !== idx));
  };

  const handleRebuttalChange = (idx: number, text: string) => {
    const updated = [...rebuttals];
    updated[idx] = text;
    setRebuttals(updated);
  };

  const handleSave = async () => {
    const title = objectionTitle.trim();
    const validRebuttals = rebuttals.map((rebuttal) => rebuttal.trim()).filter(Boolean);

    if (!title) {
      setErrorMessage("Zadejte název námitky.");
      return;
    }
    if (validRebuttals.length === 0) {
      setErrorMessage("Přidejte alespoň jeden ověřený argument operátora.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const input = {
        product_id: productId || null,
        objection_title: title,
        rebuttal_args: validRebuttals,
      };

      if (initialCard) {
        await updateObjectionAction(initialCard.id, input);
      } else {
        await createObjectionAction(input);
      }

      onSaved();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Námitku se nepodařilo uložit.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialCard) return;

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await deleteObjectionAction(initialCard.id);
      onSaved();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Námitku se nepodařilo smazat.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedProduct = products.find((product) => product.id === productId);
  const visibleRebuttals = rebuttals.filter((rebuttal) => rebuttal.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl relative text-zinc-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">
                {initialCard ? "Upravit námitkovou kartu" : "Vytvořit námitkovou kartu"}
              </h2>
              <p className="text-xs text-zinc-400">
                Karty se ukládají do workspace a zobrazují se operátorům jako schválené podklady.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Přiřazený produkt
              </label>
              <select value={productId} onChange={(event) => setProductId(event.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700">
                <option value="">Všechny produkty (globální námitka)</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Název námitky nebo detekční fráze
              </label>
              <textarea rows={2} value={objectionTitle} onChange={(event) => setObjectionTitle(event.target.value)} placeholder="např. Cena je příliš vysoká" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700" />
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Ověřené reakce operátora</label>
                <button type="button" onClick={handleAddRebuttal} className="text-[11px] font-medium text-zinc-300 hover:text-zinc-100 flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800 transition-colors cursor-pointer">
                  <Plus className="w-3 h-3" /> Přidat argument
                </button>
              </div>
              <div className="space-y-2">
                {rebuttals.map((rebuttal, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[10px] flex items-center justify-center shrink-0">{idx + 1}</span>
                    <input type="text" value={rebuttal} onChange={(event) => handleRebuttalChange(idx, event.target.value)} placeholder={`Argument #${idx + 1}...`} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700" />
                    {rebuttals.length > 1 && <button type="button" onClick={() => handleRemoveRebuttal(idx)} className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400"><Eye className="w-3.5 h-3.5" /> Náhled pro operátora</div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="text-xs pb-2 border-b border-zinc-800"><span className="font-semibold text-zinc-200">{selectedProduct?.title || "Globální námitka"}</span></div>
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-zinc-500 uppercase">Námitka:</span>
                <p className="text-xs text-zinc-300 font-medium italic bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80">&ldquo;{objectionTitle || "Sem se napíše název námitky..."}&rdquo;</p>
              </div>
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-medium text-zinc-500 uppercase">Schválené reakce:</span>
                <div className="space-y-1.5">
                  {visibleRebuttals.length === 0 ? <div className="text-[11px] text-zinc-600 italic">Zadejte alespoň jeden argument...</div> : visibleRebuttals.map((argument, idx) => (
                    <div key={idx} className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-zinc-200 flex items-center justify-between gap-2"><span className="line-clamp-2 leading-tight">• {argument}</span><ArrowRight className="w-3 h-3 text-zinc-500 shrink-0" /></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {errorMessage && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{errorMessage}</div>}

        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          {initialCard ? <button type="button" onClick={handleDelete} disabled={isSaving} className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-50 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /> Smazat kartu</button> : <div />}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer">Zrušit</button>
            <button type="button" onClick={handleSave} disabled={isSaving || !objectionTitle.trim() || visibleRebuttals.length === 0} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"><Check className="w-4 h-4" /> {isSaving ? "Ukládám…" : "Uložit kartu"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
