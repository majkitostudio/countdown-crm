"use client";

import { useCallback, useState } from "react";
import { refreshTeamPageAction } from "@/app/actions/workspace";
import { TeamMembersPanel } from "@/components/team/TeamMembersPanel";
import { TeamQueuePanel } from "@/components/team/TeamQueuePanel";
import type { WorkspaceRole } from "@/lib/auth/roles";
import type { TeamPageData } from "@/lib/dal/teamPage";

interface TeamPageContentProps {
  currentUserId: string;
  role: Extract<WorkspaceRole, "team_leader" | "administrator">;
  data: TeamPageData;
}

export type TeamMutationHandler = (mutation: () => Promise<unknown>) => Promise<void>;

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

export function TeamPageContent({ currentUserId, role, data }: TeamPageContentProps) {
  const [refreshedState, setRefreshedState] = useState({ initialData: data, data });
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
    <div className="space-y-8">
      {currentData.queue.status === "ready" ? (
        <TeamQueuePanel
          queueItems={currentData.queue.data}
          operators={currentData.operators.status === "ready" ? currentData.operators.data : []}
          operatorsState={currentData.operators.status}
          onMutation={runMutation}
        />
      ) : (
        <SourceUnavailablePanel title="Lead Queue Operations unavailable" message="Lead queue is unavailable." />
      )}

      {role === "administrator" && currentData.members?.status === "ready" && (
        <TeamMembersPanel members={currentData.members.data} currentUserId={currentUserId} onMutation={runMutation} />
      )}
      {role === "administrator" && currentData.members?.status === "unavailable" && (
        <SourceUnavailablePanel title="Workspace Members unavailable" message="Workspace members are unavailable." />
      )}
    </div>
  );
}
