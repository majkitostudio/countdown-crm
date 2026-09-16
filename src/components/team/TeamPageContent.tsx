"use client";

import { useCallback, useState } from "react";
import { refreshTeamPageAction } from "@/app/actions/workspace";
import { TeamMembersPanel } from "@/components/team/TeamMembersPanel";
import { TeamPresencePanel } from "@/components/team/TeamPresencePanel";
import { TeamQueuePanel } from "@/components/team/TeamQueuePanel";
import { TeamRosterPanel } from "@/components/team/TeamRosterPanel";
import { TeamDailyCheckpointPanel } from "@/components/team/TeamDailyCheckpointPanel";
import type { WorkspaceRole } from "@/lib/auth/roles";
import type { TeamPageData } from "@/lib/dal/teamPage";

interface TeamPageContentProps {
  currentUserId: string;
  role: Extract<WorkspaceRole, "team_leader" | "administrator">;
  data: TeamPageData;
  initialView?: TeamWorkspaceView;
}

export type TeamMutationHandler = (mutation: () => Promise<unknown>) => Promise<void>;

type TeamWorkspaceView = "checkpoint" | "orders" | "operators" | "queue";

const TEAM_WORKSPACE_VIEWS: Array<{ id: TeamWorkspaceView; label: string }> = [
  { id: "checkpoint", label: "Daily Checkpoint" },
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
    <section className="rounded-2xl border border-amber-900/60 bg-amber-950/20 p-6" role="status">
      <h2 className="text-sm font-semibold text-amber-100">{title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-amber-200/70">{message} No data was fabricated.</p>
    </section>
  );
}

export function TeamPageContent({ currentUserId, role, data, initialView = "checkpoint" }: TeamPageContentProps) {
  const [refreshedState, setRefreshedState] = useState({ initialData: data, data });
  const [view, setView] = useState<TeamWorkspaceView>(initialView);
  const currentData = selectCurrentTeamPageData(refreshedState, data);
  const runMutation = useCallback<TeamMutationHandler>(
    (mutation) => runTeamMutationAndRefresh(
      mutation,
      refreshTeamPageAction,
      (nextData) => setRefreshedState({ initialData: data, data: nextData }),
    ),
    [data],
  );

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

      {view === "checkpoint" && (
        currentData.checkpoint.status === "ready"
          ? <TeamDailyCheckpointPanel checkpoint={currentData.checkpoint.data} />
          : <SourceUnavailablePanel title="Daily Checkpoint unavailable" message="Daily Checkpoint is unavailable." />
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
