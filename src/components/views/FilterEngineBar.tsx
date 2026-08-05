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
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than";
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
    id: "view-all",
    name: "Všechny kontakty",
    filters: [],
  },
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
  const [savedViews, setSavedViews] = useState<SavedView[]>(DEFAULT_SAVED_VIEWS);
  const [activeViewId, setActiveViewId] = useState<string>("view-all");

  const [isAddingFilter, setIsAddingFilter] = useState(false);
  const [isSavingView, setIsSavingView] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  // Filter creation state
  const [selectedFieldKey, setSelectedFieldKey] = useState("ai_score");
  const [selectedOperator, setSelectedOperator] =
    useState<ActiveFilter["operator"]>("greater_than");
  const [inputValue, setInputValue] = useState("");

  const schema = schemaEngine.getSchema("leads");
  const availableAttributes: AttributeDefinition[] = schema?.attributes || [];

  // Load saved views from localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSavedViews(parsed);
          }
        }
      } catch (err) {
        console.warn("[FilterEngineBar] Error reading saved views:", err);
      }
    }
  }, []);

  const persistSavedViews = (views: SavedView[]) => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
      } catch (err) {
        console.warn("[FilterEngineBar] Error saving views:", err);
      }
    }
  };

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange(activeFilters);
  }, [activeFilters, onFiltersChange]);

  const handleSelectView = (view: SavedView) => {
    setActiveViewId(view.id);
    setActiveFilters([...view.filters]);
  };

  const handleAddFilter = () => {
    if (!inputValue.trim()) return;

    const attr = availableAttributes.find((a) => a.key === selectedFieldKey);
    const newFilter: ActiveFilter = {
      id: `filter-${Date.now()}`,
      fieldKey: selectedFieldKey,
      fieldName: attr?.name || selectedFieldKey,
      operator: selectedOperator,
      value: inputValue.trim(),
    };

    setActiveFilters([...activeFilters, newFilter]);
    setActiveViewId("custom");
    setInputValue("");
    setIsAddingFilter(false);
  };

  const handleRemoveFilter = (filterId: string) => {
    const updated = activeFilters.filter((f) => f.id !== filterId);
    setActiveFilters(updated);
    setActiveViewId("custom");
  };

  const handleClearAll = () => {
    setActiveFilters([]);
    setActiveViewId("view-all");
  };

  const handleSaveCurrentView = () => {
    if (!newViewName.trim()) return;

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
      setActiveViewId("view-all");
      setActiveFilters([]);
    }
  };

  return (
    <div className="space-y-3 bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-4 shadow-sm">
      {/* Top Bar: Saved Views Tabs */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {savedViews.map((view) => {
            const isActive = activeViewId === view.id;
            return (
              <div key={view.id} className="relative group shrink-0">
                <button
                  onClick={() => handleSelectView(view)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer",
                    isActive
                      ? "bg-zinc-800 text-zinc-100 border-zinc-700 shadow-xs"
                      : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  )}
                >
                  <Bookmark className="w-3 h-3 text-zinc-400 shrink-0" />
                  <span>{view.name}</span>
                  {view.filters.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
                      {view.filters.length}
                    </span>
                  )}
                </button>

                {/* Delete custom saved view button */}
                {!DEFAULT_SAVED_VIEWS.some((d) => d.id === view.id) && (
                  <button
                    onClick={(e) => handleDeleteSavedView(view.id, e)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-zinc-900 border border-zinc-700 text-zinc-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Smazat uložený pohled"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}

          {activeViewId === "custom" && (
            <span className="px-3 py-1.5 rounded-xl text-xs font-mono bg-zinc-900 text-zinc-300 border border-zinc-800 shrink-0">
              Vlastní filtr ({activeFilters.length})
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {activeFilters.length > 0 && !isSavingView && (
            <button
              onClick={() => setIsSavingView(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
            >
              <Bookmark className="w-3 h-3 text-zinc-400" />
              <span>Uložit pohled</span>
            </button>
          )}

          <button
            onClick={() => setIsAddingFilter(!isAddingFilter)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-xl hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <span>Přidat filtr</span>
          </button>
        </div>
      </div>

      {/* Save View Modal Line */}
      {isSavingView && (
        <div className="flex items-center gap-2 p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl animate-in fade-in duration-200">
          <input
            type="text"
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            placeholder="Název pohledu (např. 'Vysoký potencil CZ')"
            className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <button
            onClick={handleSaveCurrentView}
            disabled={!newViewName.trim()}
            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Uložit
          </button>
          <button
            onClick={() => setIsSavingView(false)}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add Filter Inline Panel */}
      {isAddingFilter && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-zinc-950 border border-zinc-800 rounded-xl animate-in fade-in duration-200">
          {/* Field selection */}
          <select
            value={selectedFieldKey}
            onChange={(e) => setSelectedFieldKey(e.target.value)}
            className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none"
          >
            {availableAttributes.map((attr) => (
              <option key={attr.key} value={attr.key}>
                {attr.name} ({attr.type})
              </option>
            ))}
          </select>

          {/* Operator */}
          <select
            value={selectedOperator}
            onChange={(e) =>
              setSelectedOperator(e.target.value as ActiveFilter["operator"])
            }
            className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none font-mono"
          >
            <option value="equals">rovná se</option>
            <option value="not_equals">nerovná se</option>
            <option value="contains">obsahuje</option>
            <option value="greater_than">větší než</option>
            <option value="less_than">menší než</option>
          </select>

          {/* Input Value */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Hodnota..."
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />

          <button
            onClick={handleAddFilter}
            disabled={!inputValue.trim()}
            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Aplikovat
          </button>
        </div>
      )}

      {/* Active Filters Badges */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/60">
          <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
            Aktivní filtry:
          </span>

          {activeFilters.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-medium text-zinc-200"
            >
              <span className="text-zinc-400">{f.fieldName}</span>
              <span className="text-zinc-400 font-mono text-[10px]">
                {f.operator === "equals"
                  ? "="
                  : f.operator === "greater_than"
                  ? ">"
                  : f.operator === "less_than"
                  ? "<"
                  : f.operator}
              </span>
              <span className="font-semibold text-zinc-100">{f.value}</span>
              <button
                onClick={() => handleRemoveFilter(f.id)}
                className="text-zinc-500 hover:text-rose-400 transition-colors ml-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          <button
            onClick={handleClearAll}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 underline ml-2 cursor-pointer"
          >
            Vymazat všechny filtry
          </button>
        </div>
      )}
    </div>
  );
}
