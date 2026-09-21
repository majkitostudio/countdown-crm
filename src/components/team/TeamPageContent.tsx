"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { CalendarClock, Users } from "lucide-react";
import { refreshTeamPageAction } from "@/app/actions/workspace";
import { TeamMembersPanel } from "@/components/team/TeamMembersPanel";
import { TeamPresencePanel } from "@/components/team/TeamPresencePanel";
import { TeamQueuePanel } from "@/components/team/TeamQueuePanel";
import { TeamRosterPanel } from "@/components/team/TeamRosterPanel";
import { TeamDailyCheckpointPanel } from "@/components/team/TeamDailyCheckpointPanel";
import { TeamQualityReviewPanel } from "@/components/team/TeamQualityReviewPanel";
import { TeamAssistancePanel } from "@/components/team/TeamAssistancePanel";
import { TeamCheckpointHandoverPanel } from "@/components/team/TeamCheckpointHandoverPanel";
import { TeamOperatorDetailPanel, type TeamOperatorDetailData } from "@/components/team/TeamOperatorDetailPanel";
import { TeamCheckpointCallbacksSection } from "@/components/team/TeamCheckpointCallbacksSection";
import { TeamCheckpointQualitySection } from "@/components/team/TeamCheckpointQualitySection";
import type { WorkspaceRole } from "@/lib/auth/roles";
import type { TeamPageData } from "@/lib/dal/teamPage";
import {
  TEAM_WORKSPACE_PERIOD_KEYS,
  TEAM_WORKSPACE_PERIOD_LABELS,
  type TeamWorkspacePeriodKey,
  type TeamWorkspaceScopeInput,
} from "@/lib/teamWorkspaceScope";

interface TeamPageContentProps {
  currentUserId: string;
  role: Extract<WorkspaceRole, "team_leader" | "administrator">;
  data: TeamPageData;
  initialView?: TeamWorkspaceView;
}

export type TeamMutationHandler = (mutation: () => Promise<unknown>) => Promise<void>;

type TeamWorkspaceView = "checkpoint" | "quality" | "orders" | "operators" | "queue";

const TEAM_WORKSPACE_VIEWS: Array<{ id: TeamWorkspaceView; label: string }> = [
  { id: "checkpoint", label: "Denní checkpoint" },
  { id: "quality", label: "Kontrola kvality hovorů" },
  { id: "orders", label: "Objednávky" },
  { id: "operators", label: "Aktivní operátoři" },
  { id: "queue", label: "Callbacky a týmová fronta" },
];

interface TeamPageClientState {
  initialData: TeamPageData;
  data: TeamPageData;
}

export function selectCurrentTeamPageData(
  state: TeamPageClientState,
  incomingData: TeamPageData,
): TeamPageData {
  return state.initialData === incomingData ? state.data : incomingData;
}

export async function runTeamMutationAndRefresh(
  mutation: () => Promise<unknown>,
  refresh: () => Promise<TeamPageData>,
  replace: (data: TeamPageData) => void,
): Promise<void> {
  await mutation();
  replace(await refresh());
}

function SourceUnavailablePanel({ title, message }: { title: string; message: string }) {
  return (
    <section className="rounded-xl border border-zinc-700 bg-zinc-950/50 p-5" role="status">
      <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{message} Náhradní data nezobrazujeme.</p>
    </section>
  );
}

function TeamWorkspaceContextBar({
  periodKey,
  teamIds,
  selectableTeams,
  isPending,
  onScopeChange,
}: {
  periodKey: TeamWorkspacePeriodKey;
  teamIds: string[];
  selectableTeams: Array<{ id: string; name: string }>;
  isPending: boolean;
  onScopeChange: (next: TeamWorkspaceScopeInput) => void;
}) {
  const selectTeam = (teamId: string) => {
    const selected = teamIds.includes(teamId);
    const nextTeamIds = selected ? teamIds.filter((id) => id !== teamId) : [...teamIds, teamId];
    onScopeChange({ periodKey, teamIds: nextTeamIds });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-xs sm:flex-row sm:items-center">
      <label className="flex items-center gap-2">
        <span className="text-zinc-500">Období</span>
        <select
          value={periodKey}
          onChange={(event) => onScopeChange({ periodKey: event.target.value as TeamWorkspacePeriodKey, teamIds })}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 font-medium text-zinc-200"
          aria-label="Zobrazované období"
        >
          {TEAM_WORKSPACE_PERIOD_KEYS.map((key) => (
            <option key={key} value={key}>{TEAM_WORKSPACE_PERIOD_LABELS[key]}</option>
          ))}
        </select>
      </label>
      <span className="hidden h-5 border-l border-zinc-800 sm:block" aria-hidden="true" />
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="flex items-center gap-1.5 text-zinc-500">
          <Users className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
          Povolené týmy
        </span>
        {selectableTeams.length === 0 ? (
          <span className="text-zinc-600">Žádné týmy</span>
        ) : (
          selectableTeams.map((team) => {
            const selected = teamIds.includes(team.id);
            return (
              <button
                key={team.id}
                type="button"
                aria-pressed={selected}
                onClick={() => selectTeam(team.id)}
                className={selected
                  ? "rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-950"
                  : "rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"}
              >
                {team.name}
              </button>
            );
          })
        )}
      </div>
      {isPending && (
        <span className="flex items-center gap-2 text-zinc-500 sm:ml-auto" role="status">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500" aria-hidden="true" />
          Načítám…
        </span>
      )}
      {!isPending && (
        <span className="flex items-center gap-2 text-zinc-500 sm:ml-auto">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" aria-hidden="true" />
          Týmová data
        </span>
      )}
      <span className="flex items-center gap-1.5 text-zinc-600" title="Plánování směn bude samostatná část systému">
        <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
        Směny samostatně
      </span>
    </div>
  );
}

export function TeamPageContent({ currentUserId, role, data, initialView = "checkpoint" }: TeamPageContentProps) {
  const [refreshedState, setRefreshedState] = useState({ initialData: data, data });
  const [view, setView] = useState<TeamWorkspaceView>(initialView);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
  const [scope, setScope] = useState<TeamWorkspaceScopeInput>({
    periodKey: data.scope.periodKey,
    teamIds: data.scope.teamIds,
  });
  const [isRefreshing, startTransition] = useTransition();
  const currentData = selectCurrentTeamPageData(refreshedState, data);
  const assistanceSource = currentData.assistanceRequests;

  const replaceScopeData = useCallback((nextData: TeamPageData) => {
    setRefreshedState({ initialData: data, data: nextData });
  }, [data]);

  const applyScope = useCallback((next: TeamWorkspaceScopeInput) => {
    setScope(next);
    setSelectedOperatorId(null);
    startTransition(() => {
      void refreshTeamPageAction(next)
        .then(replaceScopeData)
        .catch(() => setScope({ periodKey: data.scope.periodKey, teamIds: data.scope.teamIds }));
    });
  }, [data, replaceScopeData]);

  const runMutation = useCallback<TeamMutationHandler>(
    (mutation) => runTeamMutationAndRefresh(
      mutation,
      () => refreshTeamPageAction(scope),
      replaceScopeData,
    ),
    [replaceScopeData, scope],
  );

  useEffect(() => {
    if (view !== "checkpoint") return;
    const refreshTimer = window.setInterval(() => {
      void refreshTeamPageAction(scope)
        .then(replaceScopeData)
        .catch(() => undefined);
    }, 5_000);
    return () => window.clearInterval(refreshTimer);
  }, [data, view, scope, replaceScopeData]);

  const openAssistance = useMemo(
    () => (assistanceSource?.status === "ready" ? assistanceSource.data : []),
    [assistanceSource],
  );
  const qualityList = useMemo(
    () => (currentData.qualityReviews.status === "ready" ? currentData.qualityReviews.data : []),
    [currentData.qualityReviews],
  );
  const qualityPendingCount = useMemo(
    () => qualityList.filter((review) => review.status === "review" || review.status === "pending").length,
    [qualityList],
  );

  const operatorDetail: TeamOperatorDetailData | null = useMemo(() => {
    if (!selectedOperatorId || currentData.checkpoint.status !== "ready") return null;
    const checkpoint = currentData.checkpoint.data;
    const metric = checkpoint.operatorMetrics.find((item) => item.operatorId === selectedOperatorId);
    if (!metric) return null;
    return {
      metric,
      orders: checkpoint.orders.filter((order) => order.operatorId === selectedOperatorId),
      overdueCallbacks: checkpoint.overdueCallbacks.filter((callback) => callback.operatorName === metric.operatorName),
      upcomingCallbacks: checkpoint.upcomingCallbacks.filter((callback) => callback.operatorName === metric.operatorName),
      recentCalls: checkpoint.recentCallsByOperator[selectedOperatorId] || [],
      assistanceRequests: openAssistance.filter((request) => request.operatorId === selectedOperatorId),
      qualityReviews: qualityList.filter((review) => review.operator?.id === selectedOperatorId),
      qualityAvailable: currentData.qualityReviews.status === "ready",
    };
  }, [selectedOperatorId, currentData.checkpoint, currentData.qualityReviews, openAssistance, qualityList]);

  return (
    <div className="space-y-6">
      <nav className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-1" aria-label="Team Workspace views">
        <div className="flex min-w-max gap-1" role="tablist">
          {TEAM_WORKSPACE_VIEWS.map((item) => {
            const selected = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setView(item.id)}
                className={selected
                  ? "rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-950"
                  : "rounded-lg px-3 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      <TeamWorkspaceContextBar
        periodKey={scope.periodKey ?? currentData.scope.periodKey}
        teamIds={scope.teamIds ?? currentData.scope.teamIds}
        selectableTeams={currentData.scope.selectableTeams}
        isPending={isRefreshing}
        onScopeChange={applyScope}
      />

      {view === "checkpoint" && (
        <div className="space-y-6">
          {/* 1. Asistence - Co vyžaduje pozornost */}
          {assistanceSource?.status !== "unavailable" ? (
            <TeamAssistancePanel
              requests={assistanceSource?.data || []}
              onMutationAction={runMutation}
            />
          ) : (
            <SourceUnavailablePanel title="Žádosti o asistenci nejsou dostupné" message="Signály od operátorů nejsou dostupné." />
          )}

          {/* 2-6. Daily Checkpoint + Konec směny + Callbacky + Kvalita */}
          {currentData.checkpoint.status === "ready"
            ? operatorDetail
              ? (
                <TeamOperatorDetailPanel
                  detail={operatorDetail}
                  onBack={() => setSelectedOperatorId(null)}
                  onOpenQuality={() => { setSelectedOperatorId(null); setView("quality"); }}
                />
              )
              : (
                <div className="space-y-6">
                  <TeamDailyCheckpointPanel
                    checkpoint={currentData.checkpoint.data}
                    periodKey={currentData.checkpoint.data.periodKey}
                    onSelectOperator={setSelectedOperatorId}
                  />
                  <TeamCheckpointHandoverPanel
                    checkpoint={currentData.checkpoint.data}
                    openAssistance={openAssistance}
                    qualityPendingCount={qualityPendingCount}
                    qualityAvailable={currentData.qualityReviews.status === "ready"}
                    onOpenQueue={() => setView("queue")}
                    onOpenQuality={() => setView("quality")}
                  />
                  {/* Callbacky jako sekce v checkpointu */}
                  <TeamCheckpointCallbacksSection
                    checkpoint={currentData.checkpoint.data}
                    onOpenQueue={() => setView("queue")}
                  />
                  {/* Kvalita hovorů jako sekce v checkpointu */}
                  <TeamCheckpointQualitySection
                    qualityPendingCount={qualityPendingCount}
                    qualityAvailable={currentData.qualityReviews.status === "ready"}
                    onOpenQuality={() => setView("quality")}
                  />
                </div>
              )
            : <SourceUnavailablePanel title="Denní checkpoint není dostupný" message="Denní checkpoint není dostupný." />}
        </div>
      )}

      {view === "quality" && (
        currentData.qualityReviews.status === "ready"
          ? <TeamQualityReviewPanel reviews={currentData.qualityReviews.data} />
          : <SourceUnavailablePanel title="Kontrola kvality nedostupná" message="AI kontrola kvality hovorů není dostupná." />
      )}

      {view === "orders" && (
        currentData.checkpoint.status === "ready"
          ? <TeamDailyCheckpointPanel checkpoint={currentData.checkpoint.data} section="orders" periodKey={currentData.checkpoint.data.periodKey} />
          : <SourceUnavailablePanel title="Orders unavailable" message="Team orders are unavailable." />
      )}

      {view === "operators" && (
        <div className="space-y-6">
          {currentData.roster.status === "ready" ? (
            <TeamRosterPanel teams={currentData.roster.data.teams} memberships={currentData.roster.data.memberships} />
          ) : (
            <SourceUnavailablePanel title="Team roster unavailable" message="Team roster is unavailable." />
          )}
          {currentData.operators.status === "ready" && currentData.presence.status === "ready" ? (
            <TeamPresencePanel operators={currentData.operators.data} presence={currentData.presence.data} />
          ) : currentData.presence.status === "unavailable" ? (
            <SourceUnavailablePanel title="Operator status unavailable" message="Operator status is unavailable." />
          ) : (
            <SourceUnavailablePanel title="Operators unavailable" message="Operators are unavailable." />
          )}
          {role === "administrator" && currentData.members?.status === "ready" && (
            <TeamMembersPanel members={currentData.members.data} currentUserId={currentUserId} onMutation={runMutation} />
          )}
          {role === "administrator" && currentData.members?.status === "unavailable" && (
            <SourceUnavailablePanel title="Workspace Members unavailable" message="Workspace members are unavailable." />
          )}
        </div>
      )}

      {view === "queue" && (
        currentData.queue.status === "ready" ? (
          <TeamQueuePanel
            queueItems={currentData.queue.data}
            operators={currentData.operators.status === "ready" ? currentData.operators.data : []}
            operatorsState={currentData.operators.status}
            onMutation={runMutation}
          />
        ) : (
          <SourceUnavailablePanel title="Lead Queue Operations unavailable" message="Lead queue is unavailable." />
        )
      )}
    </div>
  );
}
