"use client";

import React, { useState } from "react";
import { X, ShieldAlert, Sparkles, Plus, MessageSquareQuote, Pencil } from "lucide-react";
import { createObjectionAction } from "@/app/actions/objections";
import { Product, Objection } from "@/lib/products";
import { Button } from "@/components/ui/Button";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

interface ObjectionDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated: () => void;
  onEditObjection: (id: string) => void;
}

export function ObjectionDrawer({ product, isOpen, onClose, onProductUpdated, onEditObjection }: ObjectionDrawerProps) {
  const [objections, setObjections] = useState<Objection[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newArgs, setNewArgs] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (product) {
      // This local draft must follow the selected product before edits begin.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setObjections(product.objections || []);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleAddObjection = async () => {
    if (!newTitle.trim() || !newArgs.trim()) {
      setErrorMessage("Vyplňte název námitky a alespoň jeden argument.");
      return;
    }

    const argsList = newArgs
      .split(/\n|\|/)
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const created = await createObjectionAction({
        product_id: product.id,
        objection_title: newTitle.trim(),
        rebuttal_args: argsList,
      });
      const newObj: Objection = {
        id: created.id,
        product_id: created.product_id || undefined,
        objection_title: created.objection_title,
        rebuttal_args: created.rebuttal_args,
      };
      setObjections((current) => [...current, newObj]);
      onProductUpdated();
      setNewTitle("");
      setNewArgs("");
      setShowAddForm(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Námitku se nepodařilo uložit.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg">
        <Surface variant="overlay">
          <div className="flex h-full flex-col text-zinc-100">
          
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

            <Button
              variant="quiet"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Drawer Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Header Banner */}
            <Surface variant="inset">
              <div className="flex items-start gap-3 p-4">
              <Sparkles className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-300 leading-relaxed">
                <strong className="text-zinc-100">AI Copilot Battle-Card:</strong> These rebuttal scripts are automatically surfaced to call operators in real-time when customer price or product objections are detected during live calls.
              </div>
              </div>
            </Surface>

            {/* Objections List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Known Customer Objections ({objections.length})
                </h3>

                <Button
                  variant="secondary"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Objection
                </Button>
              </div>

              {/* Add Objection Inline Form */}
              {showAddForm && (
                <Surface variant="inset">
                  <div className="animate-in space-y-3 p-4 fade-in duration-200">
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
                    <Button
                      variant="quiet"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleAddObjection}
                      disabled={isSaving}
                    >
                      Save Objection
                    </Button>
                  </div>
                  </div>
                </Surface>
              )}

              {/* List of Objections Cards */}
              {objections.length === 0 ? (
                <Surface variant="inset">
                  <div className="p-8 text-center font-mono text-xs text-zinc-500">
                  No objections registered yet for this product.
                  </div>
                </Surface>
              ) : (
                objections.map((obj, idx) => (
                  <Surface
                    key={obj.id || idx}
                    variant="inset"
                  >
                    <div className="space-y-3 p-4">
                    {/* Objection Title & Frequency */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquareQuote className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span className="font-semibold text-zinc-200 text-xs truncate">
                          &ldquo;{obj.objection_title}&rdquo;
                        </span>
                      </div>

                      <Button
                        variant="quiet"
                        type="button"
                        onClick={() => onEditObjection(obj.id)}
                        title="Upravit námitku"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>

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
                  </Surface>
                ))
              )}

              {errorMessage && (
                <StatusAlert tone="danger">
                  {errorMessage}
                </StatusAlert>
              )}

            </div>

          </div>

          </div>
        </Surface>
        </div>
      </div>
    </div>
  );
}
