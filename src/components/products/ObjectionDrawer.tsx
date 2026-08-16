"use client";

import React, { useState } from "react";
import { X, ShieldAlert, Sparkles, Plus, Check, MessageSquareQuote, Flame } from "lucide-react";
import { Product, Objection, updateProduct } from "@/lib/products";

interface ObjectionDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated: () => void;
}

export function ObjectionDrawer({ product, isOpen, onClose, onProductUpdated }: ObjectionDrawerProps) {
  const [objections, setObjections] = useState<Objection[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newArgs, setNewArgs] = useState("");

  React.useEffect(() => {
    if (product) {
      // This local draft must follow the selected product before edits begin.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setObjections(product.objections || []);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleAddObjection = async () => {
    if (!newTitle.trim() || !newArgs.trim()) return;

    const argsList = newArgs
      .split(/\n|\|/)
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    const newObj: Objection = {
      id: `obj-${Date.now()}`,
      product_id: product.id,
      objection_title: newTitle.trim(),
      rebuttal_args: argsList,
      frequency_score: 8,
    };

    const updatedObjections = [...objections, newObj];
    setObjections(updatedObjections);

    await updateProduct(product.id, { objections: updatedObjections });
    onProductUpdated();

    setNewTitle("");
    setNewArgs("");
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-zinc-950/90 backdrop-blur-xl border-l border-zinc-800/80 text-zinc-100 flex flex-col shadow-2xl">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-zinc-900 text-zinc-300 rounded-xl border border-zinc-800">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-100">
                  Sales Objection Battle-Card
                </h2>
                <p className="text-xs text-zinc-400 font-mono">
                  {product.title} (${product.price.toFixed(2)})
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Header Banner */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-300 leading-relaxed">
                <strong className="text-zinc-100">AI Copilot Battle-Card:</strong> These rebuttal scripts are automatically surfaced to call operators in real-time when customer price or product objections are detected during live calls.
              </div>
            </div>

            {/* Objections List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Known Customer Objections ({objections.length})
                </h3>

                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="text-xs font-medium text-zinc-300 hover:text-zinc-100 flex items-center gap-1 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Objection
                </button>
              </div>

              {/* Add Objection Inline Form */}
              {showAddForm && (
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3 animate-in fade-in duration-200">
                  <h4 className="text-xs font-semibold text-zinc-200">New Objection Template</h4>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Customer Objection Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Price is too high / Shipping takes too long"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Rebuttal Arguments (One per line)</label>
                    <textarea
                      rows={3}
                      placeholder="Enter talking point 1...&#10;Enter talking point 2..."
                      value={newArgs}
                      onChange={(e) => setNewArgs(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddObjection}
                      className="px-4 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold rounded-lg text-xs cursor-pointer"
                    >
                      Save Objection
                    </button>
                  </div>
                </div>
              )}

              {/* List of Objections Cards */}
              {objections.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950/40 border border-zinc-800 rounded-xl text-xs text-zinc-500 font-mono">
                  No objections registered yet for this product.
                </div>
              ) : (
                objections.map((obj, idx) => (
                  <div
                    key={obj.id || idx}
                    className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-3"
                  >
                    {/* Objection Title & Frequency */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <MessageSquareQuote className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span className="font-semibold text-zinc-200 text-xs">
                          &ldquo;{obj.objection_title}&rdquo;
                        </span>
                      </div>

                      {obj.frequency_score && (
                        <span className="px-2 py-0.5 bg-zinc-900 text-zinc-300 border border-zinc-800 text-[10px] font-mono rounded-md flex items-center gap-1 shrink-0">
                          <Flame className="w-3 h-3 text-zinc-400" />
                          Freq: {obj.frequency_score}/10
                        </span>
                      )}
                    </div>

                    {/* Rebuttal Talking Points */}
                    <div className="space-y-1.5 pt-2 border-t border-zinc-800/60">
                      <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold block">
                        Recommended Operator Response:
                      </span>
                      <ul className="space-y-1.5 text-xs text-zinc-300">
                        {obj.rebuttal_args.map((arg, aIdx) => (
                          <li key={aIdx} className="flex items-start gap-2 bg-zinc-900/80 p-2 rounded-lg border border-zinc-800/60">
                            <span className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                              {aIdx + 1}
                            </span>
                            <span className="leading-normal">{arg}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>
                ))
              )}

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
