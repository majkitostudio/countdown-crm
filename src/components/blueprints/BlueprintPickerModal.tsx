"use client";

import React, { useState } from "react";
import {
  Layers,
  X,
  Check,
  Sparkles,
  PhoneCall,
  Building2,
  ShoppingBag,
  ArrowRight,
  Database,
  Workflow,
  BarChart3,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { blueprintEngine } from "@/lib/blueprints/engine";
import { IndustryCategory, IndustryBlueprint } from "@/lib/blueprints/types";

interface BlueprintPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBlueprintApplied?: (blueprint: IndustryBlueprint) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  PhoneCall,
  Building2,
  ShoppingBag,
  Layers,
};

function getIcon(name: string) {
  return ICON_MAP[name] || Layers;
}

export function BlueprintPickerModal({
  isOpen,
  onClose,
  onBlueprintApplied,
}: BlueprintPickerModalProps) {
  const blueprints = blueprintEngine.getAllBlueprints();
  const currentActive = blueprintEngine.getActiveBlueprint();
  const [selectedId, setSelectedId] = useState<IndustryCategory>(currentActive.id);
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedBlueprint =
    blueprints.find((b) => b.id === selectedId) || blueprints[0];

  const handleApply = () => {
    setIsApplying(true);
    try {
      const result = blueprintEngine.applyBlueprint(selectedId);
      const msg = `Šablona "${result.blueprint.name}" byla úspěšně aktivována! Načteno +${result.addedAttributesCount} EAV polí a +${result.addedRulesCount} automatizací.`;
      setApplyResult(msg);

      if (onBlueprintApplied) {
        onBlueprintApplied(result.blueprint);
      }

      setTimeout(() => {
        setApplyResult(null);
        setIsApplying(false);
        onClose();
      }, 1800);
    } catch (err) {
      console.error("Blueprint error:", err);
      setIsApplying(false);
    }
  };

  const getThemeColor = (_color: string) => {
    return {
      badge: "bg-zinc-900 text-zinc-300 border-zinc-800 font-mono",
      ring: "border-zinc-700 bg-zinc-900/90",
      btn: "bg-zinc-100 text-zinc-950 hover:bg-zinc-200",
      iconBg: "bg-zinc-900 border border-zinc-800 text-zinc-300",
    };
  };

  const selectedTheme = getThemeColor(selectedBlueprint.color);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Layers className="w-5 h-5 text-zinc-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-100">
                  Oborové Balíčky & Šablony (Industry Blueprints)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
                  Attio-Grade Engine
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Vyberte šablonu pro okamžité načtení EAV atributů, AI promptů a Workflow automatizací.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Result Notification Banner */}
        {applyResult && (
          <div className="p-4 bg-emerald-950/80 border-b border-emerald-800/80 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{applyResult}</span>
          </div>
        )}

        {/* Content Body Grid (Left Selector 4 cols, Right Preview 8 cols) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left Column: Preset Cards */}
          <div className="md:col-span-4 p-4 border-r border-zinc-800/80 space-y-3 overflow-y-auto bg-zinc-950/50">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Dostupné šablony ({blueprints.length})
            </label>

            {blueprints.map((bp) => {
              const Icon = getIcon(bp.icon);
              const isSelected = bp.id === selectedId;
              const isActiveCurrent = bp.id === currentActive.id;
              const theme = getThemeColor(bp.color);

              return (
                <button
                  key={bp.id}
                  onClick={() => setSelectedId(bp.id)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-xl border transition-all relative flex items-start gap-3 group cursor-pointer",
                    isSelected
                      ? theme.ring
                      : "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/80"
                  )}
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                      theme.iconBg
                    )}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p
                        className={cn(
                          "text-xs font-semibold truncate",
                          isSelected ? "text-zinc-100" : "text-zinc-300"
                        )}
                      >
                        {bp.name}
                      </p>
                      {isActiveCurrent && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Aktivní
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                      {bp.tagline}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Detailed Preview */}
          <div className="md:col-span-8 p-6 overflow-y-auto space-y-6">
            {/* Header detail */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border mb-2",
                    selectedTheme.badge
                  )}
                >
                  <Sparkles className="w-3 h-3" />
                  {selectedBlueprint.targetAudience}
                </span>
                <h3 className="text-lg font-bold text-zinc-100">
                  {selectedBlueprint.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {selectedBlueprint.description}
                </p>
              </div>
            </div>

            {/* Included EAV Attributes */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                Vlastní EAV Atributy ({selectedBlueprint.customAttributes.length})
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {selectedBlueprint.customAttributes.map((attr) => (
                  <div
                    key={attr.id}
                    className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200">
                        {attr.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded">
                        {attr.type}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">
                      key: {attr.key}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Default Workflow Rules */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Workflow className="w-3.5 h-3.5 text-amber-400" />
                Workflow Automatizace ({selectedBlueprint.defaultWorkflowRules.length})
              </h4>
              <div className="space-y-2">
                {selectedBlueprint.defaultWorkflowRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200">
                        {rule.name}
                      </span>
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-mono">
                        {rule.trigger}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      {rule.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Metrics & AI Capabilities */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <BarChart3 className="w-3.5 h-3.5 text-zinc-400" />
                  Sledované KPI Metriky
                </h4>
                <ul className="space-y-1 text-xs text-zinc-300">
                  {selectedBlueprint.keyMetrics.map((km, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-400">•</span>
                      <span>
                        <strong className="text-zinc-200">{km.label}:</strong>{" "}
                        <span className="text-zinc-400">{km.description}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                  Gemini AI Schopnosti
                </h4>
                <ul className="space-y-1 text-xs text-zinc-300">
                  {selectedBlueprint.aiCapabilities.map((ai, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{ai}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-950">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            Zavřít
          </button>

          <button
            onClick={handleApply}
            disabled={isApplying}
            className={cn(
              "px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer",
              selectedTheme.btn
            )}
          >
            <span>
              {isApplying
                ? "Aplikuji šablonu..."
                : `Aplikovat šablonu: ${selectedBlueprint.name}`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
