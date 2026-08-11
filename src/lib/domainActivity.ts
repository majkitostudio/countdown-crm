import { addTimelineEntry, getLeadTimeline, TimelineActivityEntry } from "./timeline";
import { WorkspaceActivity } from "./domain";

function toWorkspaceActivity(entry: TimelineActivityEntry): WorkspaceActivity {
  const isPersisted = entry.id.startsWith("tl-call-") || entry.id.startsWith("tl-ord-");
  return {
    id: entry.id,
    record: { id: entry.lead_id, type: "lead" },
    type: entry.type,
    title: entry.title,
    description: entry.description,
    actor: entry.operator_name,
    timestamp: entry.timestamp,
    source: isPersisted ? "supabase" : "demo",
    metadata: entry.metadata,
  };
}

export async function getLeadActivities(leadId: string): Promise<WorkspaceActivity[]> {
  const entries = await getLeadTimeline(leadId);
  return entries.map(toWorkspaceActivity);
}

export function addLeadActivity(
  leadId: string,
  entry: Omit<WorkspaceActivity, "id" | "record" | "timestamp" | "source">
): WorkspaceActivity | null {
  const added = addTimelineEntry(leadId, {
    type: entry.type,
    title: entry.title,
    description: entry.description,
    operator_name: entry.actor,
    metadata: entry.metadata,
  });
  return added ? toWorkspaceActivity(added) : null;
}
