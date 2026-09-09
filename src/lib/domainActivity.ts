import { getLeadTimeline, getLeadActivityPage, TimelineActivityEntry } from "./timeline";
import type { CustomerActivityPageOptions } from "./customerActivity";
import { WorkspaceActivity } from "./domain";

function toWorkspaceActivity(entry: TimelineActivityEntry): WorkspaceActivity {
  return {
    id: entry.id,
    record: { id: entry.lead_id, type: "lead" },
    type: entry.type,
    title: entry.title,
    description: entry.description,
    actor: entry.operator_name,
    timestamp: entry.timestamp,
    source: "supabase",
    metadata: entry.metadata,
  };
}

export async function getLeadActivities(leadId: string): Promise<WorkspaceActivity[]> {
  const entries = await getLeadTimeline(leadId);
  return entries.map(toWorkspaceActivity);
}

export async function getLeadActivitiesPage(leadId: string, options?: CustomerActivityPageOptions) {
  const page = await getLeadActivityPage(leadId, options);
  return { ...page, items: page.items.map(toWorkspaceActivity) };
}
