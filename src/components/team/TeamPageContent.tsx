"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Users } from "lucide-react";
import { refreshTeamPageAction } from "@/app/actions/workspace";
import { TeamMembersPanel } from "@/components/team/TeamMembersPanel";
import { TeamPresencePanel } from "@/components/team/TeamPresencePanel";
import { TeamQueuePanel } from "@/components/team/TeamQueuePanel";
import { TeamRosterPanel } from "@/components/team/TeamRosterPanel";
import { TeamDailyCheckpointPanel } from "@/components/team/TeamDailyCheckpointPanel";
import { TeamQualityReviewPanel } from "@/components/team/TeamQualityReviewPanel";
import { TeamAssistancePanel } from "@/components/team/TeamAssistancePanel";
import type { WorkspaceRole } from "@/lib/auth/roles";
import type { TeamPageData } from "@/lib/dal/teamPage";

interface TeamPageContentProps {
  currentUserId: string;
  role: Extract<WorkspaceRole, "team_leader" | "administrator">;
  data: TeamPageData;
  initialView?: TeamWorkspaceView;
}

export type TeamMutationHandler = (mutation: () => Promise<unknown>) => Promise<void>;

type TeamWorkspaceView = "checkpoint" | "quality" | "orders" | "operators" | "queue";

const TEAM_WORKSPACE_VIEWS: Array<{ id: TeamWorkspaceView; label: string }> = [
  { id: "checkpoint", label: "Daily Checkpoint" },
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
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{message} No data was fabricated.</p>
    </section>
  );
}

function TeamWorkspaceContextBar({ data }: { data: TeamPageData }) {
  const teamNames = data.roster.status === "ready"
    ? data.roster.data.teams.map((team) => team.name).join(", ")
    : "Týmy nejsou dostupné";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-xs sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <span className="text-zinc-500">Období</span>
        <span className="font-medium text-zinc-200">Dnes</span>
      </div>
      <span className="hidden h-5 border-l border-zinc-800 sm:block" aria-hidden="true" />
      <div className="flex min-w-0 items-center gap-2">
        <Users className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
        <span className="text-zinc-500">Povolené týmy</span>
        <span className="truncate font-medium text-zinc-200">{teamNames}</span>
      </div>
      <span className="flex items-center gap-2 text-zinc-500 sm:ml-auto">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" aria-hidden="true" />
        Týmová data
      </span>
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
  const currentData = selectCurrentTeamPageData(refreshedState, data);
  const assistanceSource = currentData.assistanceRequests;
  const runMutation = useCallback<TeamMutationHandler>(
    (mutation) => runTeamMutationAndRefresh(
      mutation,
      refreshTeamPageAction,
      (nextData) => setRefreshedState({ initialData: data, data: nextData }),
    ),
    [data],
  );

  useEffect(() => {
    if (view !== "checkpoint") return;
    const refreshTimer = window.setInterval(() => {
      void refreshTeamPageAction()
        .then((nextData) => setRefreshedState({ initialData: data, data: nextData }))
        .catch(() => undefined);
    }, 5_000);
    return () => window.clearInterval(refreshTimer);
  }, [data, view]);

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

      <TeamWorkspaceContextBar data={currentData} />

      {view === "checkpoint" && (
        <div className="space-y-6">
          {assistanceSource?.status !== "unavailable" ? (
            <TeamAssistancePanel
              requests={assistanceSource?.data || []}
              onMutationAction={runMutation}
            />
          ) : (
            <SourceUnavailablePanel title="Žádosti o asistenci nejsou dostupné" message="Signály od operátorů nejsou dostupné." />
          )}
          {currentData.checkpoint.status === "ready"
            ? <TeamDailyCheckpointPanel checkpoint={currentData.checkpoint.data} />
            : <SourceUnavailablePanel title="Daily Checkpoint unavailable" message="Daily Checkpoint is unavailable." />}
        </div>
      )}

      {view === "quality" && (
        currentData.qualityReviews.status === "ready"
          ? <TeamQualityReviewPanel reviews={currentData.qualityReviews.data} />
          : <SourceUnavailablePanel title="Kontrola kvality nedostupná" message="AI kontrola kvality hovorů není dostupná." />
      )}

      {view === "orders" && (
        currentData.checkpoint.status === "ready"
          ? <TeamDailyCheckpointPanel checkpoint={currentData.checkpoint.data} section="orders" />
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
