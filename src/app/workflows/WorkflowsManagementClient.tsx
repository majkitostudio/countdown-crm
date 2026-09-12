"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Zap,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Clock,
  Sparkles,
  Mail,
  RefreshCw,
  Bell,
  PhoneOff,
  ArrowRightLeft,
  ShoppingCart,
  UserPlus,
  Globe,
  Activity,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WorkflowRule,
  ExecutionLogEntry,
  TRIGGER_REGISTRY,
  ACTION_REGISTRY,
  TriggerType,
  ActionType,
} from "@/lib/workflows/types";
import { RuleBuilderModal } from "@/components/workflows/RuleBuilderModal";
import {
  deleteWorkflowAction,
  listWorkflowExecutionsAction,
  listWorkflowsAction,
  saveWorkflowAction,
  simulateWorkflowEventAction,
} from "@/app/actions/workflows";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusAlert, StatusBadge as SharedStatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

// ─── Icon Maps ──────────────────────────────────────────────────────────────

const TRIGGER_ICON_MAP: Record<string, React.ElementType> = {
  PhoneOff,
  ArrowRightLeft,
  ShoppingCart,
  UserPlus,
};

const ACTION_ICON_MAP: Record<string, React.ElementType> = {
  Sparkles,
  Mail,
  RefreshCw,
  Bell,
  Globe,
};

function getTriggerIcon(type: TriggerType) {
  const def = TRIGGER_REGISTRY.find((t) => t.type === type);
  return def ? (TRIGGER_ICON_MAP[def.icon] || Zap) : Zap;
}

function getActionIcon(type: ActionType) {
  const def = ACTION_REGISTRY.find((a) => a.type === type);
  return def ? (ACTION_ICON_MAP[def.icon] || Zap) : Zap;
}

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ExecutionLogEntry["status"] }) {
  const config = {
    success: {
      tone: "success" as const,
      label: "Úspěch",
    },
    failure: {
      tone: "danger" as const,
      label: "Chyba",
    },
    skipped: {
      tone: "neutral" as const,
      label: "Přeskočeno",
    },
    simulation: {
      tone: "neutral" as const,
      label: "Simulace",
    },
    unavailable: {
      tone: "warning" as const,
      label: "Nedostupné",
    },
  }[status];

  return (
    <SharedStatusBadge tone={config.tone}>{config.label}</SharedStatusBadge>
  );
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [executionLog, setExecutionLog] = useState<ExecutionLogEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
  const [activeTab, setActiveTab] = useState<"rules" | "log">("rules");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    const [nextRules, nextLog] = await Promise.all([
      listWorkflowsAction(),
      listWorkflowExecutionsAction(),
    ]);
    setRules(nextRules);
    setExecutionLog(nextLog);
  }, []);

  useEffect(() => {
    async function loadWorkflowState() {
      try {
        await refreshState();
      } catch {
        setRules([]);
        setExecutionLog([]);
      }
    }

    void loadWorkflowState();
  }, [refreshState]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleAddRule = async (
    rule: Omit<WorkflowRule, "id" | "createdAt" | "updatedAt">
  ) => {
    if (editingRule) {
      await saveWorkflowAction({ ...editingRule, ...rule, updatedAt: new Date().toISOString() });
    } else {
      const now = new Date().toISOString();
      await saveWorkflowAction({ ...rule, id: `rule-${Date.now()}`, createdAt: now, updatedAt: now });
    }
    setEditingRule(null);
    await refreshState();
  };

  const handleToggle = async (id: string) => {
    const rule = rules.find((item) => item.id === id);
    if (!rule) return;
    await saveWorkflowAction({ ...rule, enabled: !rule.enabled, updatedAt: new Date().toISOString() });
    await refreshState();
  };

  const handleDelete = async (id: string) => {
    await deleteWorkflowAction(id);
    await refreshState();
  };

  const handleEdit = (rule: WorkflowRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleTestEmit = async () => {
    setTestMessage(null);
    try {
      const result = await simulateWorkflowEventAction({
        trigger: "on_call_ended",
        eventId: `manual-test-${Date.now()}`,
        payload: {
          callId: "TEST_ONLY_CALL",
          leadId: "TEST_ONLY_LEAD",
          leadName: "Test-only simulation lead",
          agentName: "TEST_ONLY",
          outcome: "order_placed",
          sentiment: "Positive",
          orderValue: 0,
          transcript: "",
        },
      });
      setTestMessage(`Simulation: ${result.reason}`);
      await refreshState();
    } catch (error) {
      setTestMessage(error instanceof Error ? `Simulation failed: ${error.message}` : "Simulation failed.");
    }
  };

  // ── Computed Stats ─────────────────────────────────────────────────────

  const activeRulesCount = rules.filter((r) => r.enabled).length;
  const successCount = executionLog.filter((e) => e.status === "success").length;
  const failureCount = executionLog.filter((e) => e.status === "failure").length;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen space-y-6">
      <PageHeader
        icon={Zap}
        title="Workflows & Automations"
        description="Automatizujte opakující se procesy pomocí událostních pravidlových sekvencí"
        actions={
          <>
          <Button
            variant="secondary"
            onClick={handleTestEmit}
          >
            <Activity className="w-3.5 h-3.5 text-zinc-400" />
            Test-only simulation: Call Ended
          </Button>

          {/* Add Rule Button */}
          <Button
            onClick={() => {
              setEditingRule(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Nové pravidlo
          </Button>
          </>
        }
      />

      {testMessage && (
        <StatusAlert tone="neutral" role="status">
          {testMessage} No production webhook, provider, or business mutation was invoked.
        </StatusAlert>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Aktivní pravidla",
            value: activeRulesCount,
            total: rules.length,
          },
          {
            label: "Úspěšná spuštění",
            value: successCount,
            total: executionLog.length,
          },
          {
            label: "Selhání",
            value: failureCount,
            total: executionLog.length,
          },
        ].map((stat) => (
          <MetricCard
            key={stat.label}
            label={stat.label}
            value={<>{stat.value}<span className="text-sm font-normal text-zinc-500"> / {stat.total}</span></>}
            valueTone={stat.label === "Selhání" ? "danger" : "neutral"}
          />
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-zinc-800/80">
        {(
          [
            { key: "rules", label: "Pravidla", icon: Zap },
            { key: "log", label: "Audit Log", icon: Clock },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer",
                activeTab === tab.key
                  ? "border-zinc-100 text-zinc-100 font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Icon className="w-3.5 h-3.5 text-zinc-400" />
              {tab.label}
              {tab.key === "log" && executionLog.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded font-mono text-[10px]">
                  {executionLog.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content: Rules ──────────────────────────────────────── */}
      {activeTab === "rules" && (
        <div className="space-y-3">
          {rules.length === 0 ? (
            <Surface variant="empty">
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-30 text-zinc-500" />
              <p className="text-sm">Zatím nemáte žádná automatizační pravidla.</p>
              <p className="text-xs mt-1 text-zinc-500">
                Klikněte na &quot;Nové pravidlo&quot; a vytvořte své první workflow.
              </p>
            </Surface>
          ) : (
            rules.map((rule) => {
              const TrigIcon = getTriggerIcon(rule.trigger);
              const triggerDef = TRIGGER_REGISTRY.find(
                (t) => t.type === rule.trigger
              );

              return (
                <Surface
                  key={rule.id}
                  variant="page"
                >
                  <div className={cn("flex items-start justify-between p-4 group", !rule.enabled && "opacity-60")}>
                    {/* Left: Info */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border border-zinc-800",
                          rule.enabled
                            ? "bg-zinc-900 text-zinc-300"
                            : "bg-zinc-950 text-zinc-600"
                        )}
                      >
                        <TrigIcon className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-zinc-100 truncate">
                            {rule.name}
                          </h3>
                          <span className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 text-zinc-400 text-[10px] font-mono rounded">
                            {triggerDef?.label}
                          </span>
                          {triggerDef?.serverDispatch === "unavailable" && (
                            <span className="px-2 py-0.5 bg-amber-950/30 border border-amber-900/60 text-amber-300 text-[10px] font-mono rounded">
                              Server nedostupný
                            </span>
                          )}
                        </div>
                        {rule.description && (
                          <p className="text-xs text-zinc-400 mt-0.5 truncate">
                            {rule.description}
                          </p>
                        )}
                        {/* Action Pills */}
                        <div className="flex items-center gap-1.5 mt-2">
                          {rule.actions.map((action) => {
                            const ActionIcon = getActionIcon(action.type);
                            const actionDef = ACTION_REGISTRY.find(
                              (a) => a.type === action.type
                            );
                            return (
                              <span
                                key={action.type}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-900 text-zinc-300 text-[10px] font-mono border border-zinc-800 rounded-md"
                              >
                                <ActionIcon className="w-3 h-3 text-zinc-400" />
                                {actionDef?.label}
                              </span>
                            );
                          })}
                          {rule.conditions.length > 0 && (
                            <span className="px-2 py-0.5 bg-zinc-900 text-zinc-300 text-[10px] font-mono rounded-md border border-zinc-800">
                              {rule.conditions.length} podmínk
                              {rule.conditions.length === 1 ? "a" : "y"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <Button
                        variant="quiet"
                        onClick={() => handleEdit(rule)}
                      >
                        Upravit
                      </Button>
                      <Button
                        variant="quiet"
                        onClick={() => handleToggle(rule.id)}
                        title={rule.enabled ? "Deaktivovat" : "Aktivovat"}
                      >
                        {rule.enabled ? (
                          <ToggleRight className="w-6 h-6 text-zinc-200" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-zinc-600" />
                        )}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDelete(rule.id)}
                        title="Smazat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Surface>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab Content: Execution Log ──────────────────────────────── */}
      {activeTab === "log" && (
        <div className="space-y-2">
          {executionLog.length === 0 ? (
            <Surface variant="empty">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Zatím žádné záznamy o spuštění.</p>
              <p className="text-xs mt-1">
                Použijte tlačítko &quot;Test-only simulation: Call Ended&quot; bez produkčního side effectu.
              </p>
            </Surface>
          ) : (
            executionLog.map((entry) => {
              const isExpanded = expandedLog === entry.id;
              return (
                <Surface
                  key={entry.id}
                  variant="table"
                >
                  <button
                    onClick={() =>
                      setExpandedLog(isExpanded ? null : entry.id)
                    }
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-900/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusBadge status={entry.status} />
                      <span className="text-xs font-semibold text-zinc-200 truncate">
                        {entry.ruleName}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        {new Date(entry.executedAt).toLocaleString("cs-CZ")}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-zinc-800/60 space-y-2">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-zinc-500">Trigger:</span>{" "}
                          <span className="text-zinc-300">
                            {
                              TRIGGER_REGISTRY.find(
                                (t) => t.type === entry.trigger
                              )?.label
                            }
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Akce:</span>{" "}
                          <span className="text-zinc-300">
                            {entry.executedActions
                              .map(
                                (a) =>
                                  ACTION_REGISTRY.find((ar) => ar.type === a)
                                    ?.label
                              )
                              .join(", ") || "—"}
                          </span>
                        </div>
                      </div>
                      {entry.errorMessage && (
                        <StatusAlert tone={entry.status === "failure" ? "danger" : "warning"}>
                          {entry.errorMessage}
                        </StatusAlert>
                      )}
                      {entry.actionResults.length > 0 && (
                        <div className="space-y-1 text-[11px]">
                          {entry.actionResults.map((result) => (
                            <div key={result.action} className="text-zinc-400">
                              <span className="font-mono text-zinc-300">{result.action}</span>: {result.reason}
                              <span className="ml-1 text-zinc-600">({result.durableEffect ? "durable" : "no durable effect"})</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <details className="text-[11px]">
                        <summary className="text-zinc-500 cursor-pointer hover:text-zinc-400">
                          Event Payload (JSON)
                        </summary>
                        <pre className="mt-1 p-2 bg-zinc-950 rounded text-zinc-400 overflow-x-auto">
                          {JSON.stringify(entry.eventPayload, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </Surface>
              );
            })
          )}
        </div>
      )}

      {/* Rule Builder Modal */}
      <RuleBuilderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRule(null);
        }}
        onSave={handleAddRule}
        editingRule={editingRule}
      />
    </div>
  );
}
