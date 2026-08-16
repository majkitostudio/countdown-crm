"use client";

import { useEffect, useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Zap,
  Sparkles,
  Mail,
  RefreshCw,
  Bell,
  PhoneOff,
  ArrowRightLeft,
  ShoppingCart,
  UserPlus,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TriggerType,
  ActionType,
  TriggerCondition,
  WorkflowAction,
  WorkflowRule,
  TRIGGER_REGISTRY,
  ACTION_REGISTRY,
} from "@/lib/workflows/types";

// ─── Icon Resolver ──────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  PhoneOff,
  ArrowRightLeft,
  ShoppingCart,
  UserPlus,
  Sparkles,
  Mail,
  RefreshCw,
  Bell,
  Globe,
};

function getIcon(name: string) {
  return ICON_MAP[name] || Zap;
}

// ─── Condition Fields by Trigger ────────────────────────────────────────────

const CONDITION_FIELDS: Record<TriggerType, { label: string; value: string }[]> = {
  on_call_ended: [
    { label: "Call Outcome", value: "outcome" },
    { label: "Sentiment", value: "sentiment" },
    { label: "Order Value", value: "orderValue" },
  ],
  on_lead_status_changed: [
    { label: "New Status", value: "newStatus" },
    { label: "Previous Status", value: "previousStatus" },
  ],
  on_order_placed: [
    { label: "Order Value", value: "orderValue" },
    { label: "Product Title", value: "productTitle" },
  ],
  on_lead_created: [
    { label: "Source", value: "source" },
    { label: "Lead Name", value: "leadName" },
  ],
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface RuleBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: Omit<WorkflowRule, "id" | "createdAt" | "updatedAt">) => void;
  editingRule?: WorkflowRule | null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RuleBuilderModal({
  isOpen,
  onClose,
  onSave,
  editingRule,
}: RuleBuilderModalProps) {
  const [name, setName] = useState(editingRule?.name ?? "");
  const [description, setDescription] = useState(editingRule?.description ?? "");
  const [trigger, setTrigger] = useState<TriggerType>(editingRule?.trigger ?? "on_call_ended");
  const [conditions, setConditions] = useState<TriggerCondition[]>(
    editingRule?.conditions ?? []
  );
  const [actions, setActions] = useState<WorkflowAction[]>(
    editingRule?.actions ?? []
  );
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    if (!isOpen) return;
    // This modal intentionally resets its editable draft from the selected rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(editingRule?.name ?? "");
    setDescription(editingRule?.description ?? "");
    setTrigger(editingRule?.trigger ?? "on_call_ended");
    setConditions(editingRule?.conditions ?? []);
    setActions(editingRule?.actions ?? []);
    setStep(1);
  }, [editingRule, isOpen]);

  if (!isOpen) return null;

  // ── Condition CRUD ─────────────────────────────────────────────────────

  const addCondition = () => {
    const fields = CONDITION_FIELDS[trigger];
    setConditions([
      ...conditions,
      { field: fields[0]?.value ?? "outcome", operator: "equals", value: "" },
    ]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<TriggerCondition>) => {
    setConditions(
      conditions.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  };

  // ── Action CRUD ────────────────────────────────────────────────────────

  const addAction = (type: ActionType) => {
    if (actions.some((a) => a.type === type)) return; // Prevent duplicates
    setActions([...actions, { type, config: {} }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateActionConfig = (index: number, key: string, value: string) => {
    setActions(
      actions.map((a, i) =>
        i === index ? { ...a, config: { ...a.config, [key]: value } } : a
      )
    );
  };

  // ── Save ───────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!name.trim()) return;
    if (actions.length === 0) return;

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      enabled: editingRule?.enabled ?? true,
      trigger,
      conditions,
      actions,
    });

    onClose();
  };

  const canProceedStep1 = name.trim().length > 0;
  const canSave = actions.length > 0;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">
                {editingRule ? "Edit Automation Rule" : "New Automation Rule"}
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                Krok {step} z 3 —{" "}
                {step === 1 ? "Trigger & Název" : step === 2 ? "Podmínky" : "Akce"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 px-6 pt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-300",
                s <= step ? "bg-zinc-100" : "bg-zinc-800"
              )}
            />
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* ── Step 1: Trigger & Name ─────────────────────────────── */}
          {step === 1 && (
            <>
              {/* Rule Name */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Název pravidla
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Např. AI Summary po úspěšném hovoru"
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Popis (volitelný)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Stručný popis co pravidlo dělá..."
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
                />
              </div>

              {/* Trigger Selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Spouštěč (Trigger)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TRIGGER_REGISTRY.map((t) => {
                    const Icon = getIcon(t.icon);
                    const isSelected = trigger === t.type;
                    return (
                      <button
                        key={t.type}
                        onClick={() => {
                          setTrigger(t.type);
                          setConditions([]); // Reset conditions when trigger changes
                        }}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer",
                          isSelected
                            ? "bg-zinc-900 border-zinc-700 shadow-xs"
                            : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                        )}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-md flex items-center justify-center shrink-0 border border-zinc-800",
                            isSelected
                              ? "bg-zinc-800 text-zinc-100"
                              : "bg-zinc-900 text-zinc-400"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-xs font-semibold",
                              isSelected ? "text-zinc-100" : "text-zinc-300"
                            )}
                          >
                            {t.label}
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-0.5 leading-tight">
                            {t.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── Step 2: Conditions ─────────────────────────────────── */}
          {step === 2 && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    Podmínky filtru
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Volitelné. Pokud je necháte prázdné, pravidlo se spustí vždy.
                  </p>
                </div>
                <button
                  onClick={addCondition}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Přidat podmínku
                </button>
              </div>

              {conditions.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 text-xs font-mono">
                  Žádné podmínky — pravidlo se spustí při každé události typu &quot;{TRIGGER_REGISTRY.find((t) => t.type === trigger)?.label}&quot;.
                </div>
              ) : (
                <div className="space-y-3">
                  {conditions.map((cond, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg"
                    >
                      {/* Field */}
                      <select
                        value={cond.field}
                        onChange={(e) => updateCondition(i, { field: e.target.value })}
                        className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 focus:outline-none"
                      >
                        {CONDITION_FIELDS[trigger].map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>

                      {/* Operator */}
                      <select
                        value={cond.operator}
                        onChange={(e) =>
                          updateCondition(i, {
                            operator: e.target.value as TriggerCondition["operator"],
                          })
                        }
                        className="w-28 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 focus:outline-none font-mono"
                      >
                        <option value="equals">rovná se</option>
                        <option value="not_equals">nerovná se</option>
                        <option value="contains">obsahuje</option>
                        <option value="greater_than">větší než</option>
                        <option value="less_than">menší než</option>
                      </select>

                      {/* Value */}
                      <input
                        type="text"
                        value={cond.value}
                        onChange={(e) => updateCondition(i, { value: e.target.value })}
                        placeholder="hodnota..."
                        className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none"
                      />

                      {/* Remove */}
                      <button
                        onClick={() => removeCondition(i)}
                        className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Step 3: Actions ────────────────────────────────────── */}
          {step === 3 && (
            <>
              {/* Action Picker */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Dostupné akce
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ACTION_REGISTRY.map((a) => {
                    const Icon = getIcon(a.icon);
                    const isAdded = actions.some((act) => act.type === a.type);
                    return (
                      <button
                        key={a.type}
                        onClick={() => addAction(a.type)}
                        disabled={isAdded}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer",
                          isAdded
                            ? "bg-zinc-900 border-zinc-700 opacity-70 cursor-not-allowed"
                            : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                        )}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-md flex items-center justify-center shrink-0 border border-zinc-800",
                            isAdded
                              ? "bg-zinc-800 text-zinc-200"
                              : "bg-zinc-900 text-zinc-400"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-xs font-semibold",
                              isAdded ? "text-zinc-100" : "text-zinc-300"
                            )}
                          >
                            {a.label}
                            {isAdded && " ✓"}
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-0.5 leading-tight">
                            {a.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Actions & Config */}
              {actions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Aktivní akce ({actions.length})
                  </p>
                  <div className="space-y-2">
                    {actions.map((action, i) => {
                      const def = ACTION_REGISTRY.find(
                        (a) => a.type === action.type
                      );
                      if (!def) return null;
                      const Icon = getIcon(def.icon);

                      return (
                        <div
                          key={action.type}
                          className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-zinc-400" />
                              <span className="text-xs font-semibold text-zinc-200">
                                {def.label}
                              </span>
                            </div>
                            <button
                              onClick={() => removeAction(i)}
                              className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Config Fields */}
                          {def.configFields?.map((field) => (
                            <div key={field.key} className="space-y-1">
                              <label className="text-[11px] text-zinc-500">
                                {field.label}
                              </label>
                              {field.type === "select" ? (
                                <select
                                  value={action.config[field.key] ?? ""}
                                  onChange={(e) =>
                                    updateActionConfig(i, field.key, e.target.value)
                                  }
                                  className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 focus:outline-none"
                                >
                                  <option value="">Vyberte...</option>
                                  {field.options?.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={action.config[field.key] ?? ""}
                                  onChange={(e) =>
                                    updateActionConfig(i, field.key, e.target.value)
                                  }
                                  placeholder={field.placeholder}
                                  className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-950/50">
          <button
            onClick={() => {
              if (step === 1) onClose();
              else setStep((step - 1) as 1 | 2 | 3);
            }}
            className="px-4 py-2 text-xs font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            {step === 1 ? "Zrušit" : "← Zpět"}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as 1 | 2 | 3)}
              disabled={step === 1 && !canProceedStep1}
              className={cn(
                "px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                step === 1 && !canProceedStep1
                  ? "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800"
                  : "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
              )}
            >
              Další →
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={cn(
                "px-5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                canSave
                  ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200 shadow-sm"
                  : "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800"
              )}
            >
              {editingRule ? "Uložit změny" : "Vytvořit pravidlo"} ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
