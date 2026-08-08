"use client";

import React, { useState, useEffect } from "react";
import {
  Filter,
  Plus,
  X,
  Bookmark,
  Sparkles,
  Check,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { schemaEngine } from "@/lib/schema/engine";
import { AttributeDefinition } from "@/lib/schema/types";

export interface ActiveFilter {
  id: string;
  fieldKey: string;
  fieldName: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty";
  value: string;
}

export interface SavedView {
  id: string;
  name: string;
  filters: ActiveFilter[];
}

interface FilterEngineBarProps {
  onFiltersChange: (filters: ActiveFilter[]) => void;
}

const STORAGE_KEY = "countdown_saved_views";

const DEFAULT_SAVED_VIEWS: SavedView[] = [
  {
    id: "view-high-score",
    name: "🔥 Vysoký AI Skóre (> 80)",
    filters: [
      {
        id: "f-1",
        fieldKey: "ai_score",
        fieldName: "AI Propensity Score",
        operator: "greater_than",
        value: "80",
      },
    ],
  },
  {
    id: "view-qualified",
    name: "⭐ Qualified Leadi",
    filters: [
      {
        id: "f-2",
        fieldKey: "status",
        fieldName: "Lead Status",
        operator: "equals",
        value: "qualified",
      },
    ],
  },
];

export function FilterEngineBar({ onFiltersChange }: FilterEngineBarProps) {
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn("[FilterEngineBar] Error reading saved views:", err);
      }
    }
    return DEFAULT_SAVED_VIEWS;
  });
  const [activeViewId, setActiveViewId] = useState<string>("view-all");

  const [isAddingFilter, setIsAddingFilter] = useState(false);
  const [isSavingView, setIsSavingView] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  // Filter creation state
  const [selectedFieldKey, setSelectedFieldKey] = useState("ai_score");
  const [selectedOperator, setSelectedOperator] =
    useState<ActiveFilter["operator"]>("greater_than");
  const [inputValue, setInputValue] = useState("");

  const availableAttributes = React.useMemo(() => {
    const schema = schemaEngine.getSchema("leads");
    return (schema?.attributes || []) as AttributeDefinition[];
  }, []);

  const persistSavedViews = (views: SavedView[]) => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
      } catch (err) {
        console.warn("[FilterEngineBar] Error persisting saved views:", err);
      }
    }
  };

  const handleSelectView = (view: SavedView) => {
    setActiveViewId(view.id);
    setActiveFilters([...view.filters]);
    onFiltersChange([...view.filters]);
  };

  const handleClearView = () => {
    setActiveViewId("view-all");
    setActiveFilters([]);
    onFiltersChange([]);
  };

  const handleAddFilter = React.useCallback(() => {
    if (!inputValue.trim() && selectedOperator !== "is_empty" && selectedOperator !== "is_not_empty") return;

    const attr = availableAttributes.find((a) => a.key === selectedFieldKey);
    const newFilter: ActiveFilter = {
      id: `filter-${Date.now()}`,
      fieldKey: selectedFieldKey,
      fieldName: attr?.name || selectedFieldKey,
      operator: selectedOperator,
      value: inputValue.trim(),
    };

    const updated = [...activeFilters, newFilter];
    setActiveFilters(updated);
    onFiltersChange(updated);
    setActiveViewId("custom");
    setInputValue("");
    setIsAddingFilter(false);
  }, [activeFilters, availableAttributes, inputValue, onFiltersChange, selectedFieldKey, selectedOperator]);

  const handleRemoveFilter = (filterId: string) => {
    const updated = activeFilters.filter((f) => f.id !== filterId);
    setActiveFilters(updated);
    onFiltersChange(updated);
    if (updated.length === 0) {
      setActiveViewId("view-all");
    } else {
      setActiveViewId("custom");
    }
  };

  const handleSaveCurrentView = () => {
    if (!newViewName.trim() || activeFilters.length === 0) return;

    const newView: SavedView = {
      id: `view-${Date.now()}`,
      name: newViewName.trim(),
      filters: [...activeFilters],
    };

    const updated = [...savedViews, newView];
    setSavedViews(updated);
    persistSavedViews(updated);
    setActiveViewId(newView.id);
    setNewViewName("");
    setIsSavingView(false);
  };

  const handleDeleteSavedView = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedViews.filter((v) => v.id !== viewId);
    setSavedViews(updated);
    persistSavedViews(updated);
    if (activeViewId === viewId) {
      handleClearView();
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3 shadow-sm space-y-3">
      {/* Top Row: Saved Views Presets */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 pl-1">
            <Bookmark className="w-3.5 h-3.5 text-zinc-400" />
            Pohledy:
          </span>

          <button
            onClick={handleClearView}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
              activeViewId === "view-all"
                ? "bg-zinc-100 text-zinc-950 font-semibold shadow-sm"
                : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
            )}
          >
            Všechny kontakty
          </button>

          {savedViews.map((view) => (
            <div key={view.id} className="relative group flex items-center">
              <button
                onClick={() => handleSelectView(view)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer pr-7",
                  activeViewId === view.id
                    ? "bg-zinc-100 text-zinc-950 font-semibold shadow-sm"
                    : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                )}
              >
                {view.name}
              </button>
              <button
                onClick={(e) => handleDeleteSavedView(view.id, e)}
                className="absolute right-1.5 p-0.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors"
                title="Smazat uložený pohled"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {activeFilters.length > 0 && activeViewId === "custom" && (
          <button
            onClick={() => setIsSavingView(!isSavingView)}
            className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Uložit tento filtr jako Pohled
          </button>
        )}
      </div>

      {/* Save View Modal Prompt */}
      {isSavingView && (
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80 animate-in fade-in slide-in-from-top-1">
          <input
            type="text"
            placeholder="Název nového pohledu (např. VIP Zákazníci Praha)..."
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700 flex-1"
          />
          <button
            onClick={handleSaveCurrentView}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Uložit
          </button>
          <button
            onClick={() => setIsSavingView(false)}
            className="px-2 py-1.5 text-zinc-400 hover:text-zinc-200 text-xs"
          >
            Zrušit
          </button>
        </div>
      )}

      {/* Bottom Row: Active Filter Pills & Add Filter Engine */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800/60">
        <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 pl-1">
          <Filter className="w-3.5 h-3.5 text-zinc-400" />
          Filtry:
        </span>

        {activeFilters.length === 0 && (
          <span className="text-xs text-zinc-400 italic">Žádný aktivní filtr</span>
        )}

        {activeFilters.map((filter) => (
          <div
            key={filter.id}
            className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs px-2.5 py-1 rounded-lg font-medium shadow-xs"
          >
            <span className="text-zinc-400">{filter.fieldName}</span>
            <span className="text-zinc-400">{filter.operator}</span>
            <span className="text-zinc-100 font-semibold">{filter.value}</span>
            <button
              onClick={() => handleRemoveFilter(filter.id)}
              className="ml-1 p-0.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {!isAddingFilter ? (
          <button
            onClick={() => setIsAddingFilter(true)}
            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-400" />
            Přidat filtr
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 bg-zinc-950 p-1.5 border border-zinc-800 rounded-xl animate-in fade-in duration-150">
            <select
              value={selectedFieldKey}
              onChange={(e) => setSelectedFieldKey(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-2 py-1 focus:outline-none"
            >
              {availableAttributes.map((attr) => (
                <option key={attr.key} value={attr.key}>
                  {attr.name}
                </option>
              ))}
            </select>

            <select
              value={selectedOperator}
              onChange={(e) =>
                setSelectedOperator(e.target.value as ActiveFilter["operator"])
              }
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="equals">se rovná (=)</option>
              <option value="contains">obsahuje</option>
              <option value="greater_than">je větší než (&gt;)</option>
              <option value="less_than">je menší než (&lt;)</option>
              <option value="is_empty">je prázdné</option>
              <option value="is_not_empty">není prázdné</option>
            </select>

            <input
              type="text"
              placeholder="Hodnota..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddFilter()}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-zinc-700 w-32"
            />

            <button
              onClick={handleAddFilter}
              className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsAddingFilter(false)}
              className="p-1 text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
