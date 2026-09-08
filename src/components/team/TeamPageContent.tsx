import { TeamMembersPanel } from "@/components/team/TeamMembersPanel";
import { TeamQueuePanel } from "@/components/team/TeamQueuePanel";
import type { WorkspaceRole } from "@/lib/auth/roles";
import type { TeamPageData } from "@/lib/dal/teamPage";

interface TeamPageContentProps {
  currentUserId: string;
  role: Extract<WorkspaceRole, "team_leader" | "administrator">;
  data: TeamPageData;
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
  return (
    <div className="space-y-8">
      {data.queue.state === "available" ? (
        <TeamQueuePanel
          initialQueueItems={data.queue.data}
          operators={data.operators.state === "available" ? data.operators.data : []}
          operatorsState={data.operators.state}
          operatorsUnavailableMessage={data.operators.state === "unavailable" ? data.operators.message : undefined}
        />
      ) : (
        <SourceUnavailablePanel title="Lead Queue Operations unavailable" message={data.queue.message} />
      )}

      {role === "administrator" && data.members?.state === "available" && (
        <TeamMembersPanel initialMembers={data.members.data} currentUserId={currentUserId} />
      )}
      {role === "administrator" && data.members?.state === "unavailable" && (
        <SourceUnavailablePanel title="Workspace Members unavailable" message={data.members.message} />
      )}
    </div>
  );
}
