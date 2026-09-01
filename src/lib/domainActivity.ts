import { getLeadTimeline } from "./timeline";
import type { CustomerActivityEvent } from "./customerActivity";

export async function getLeadActivities(leadId: string): Promise<CustomerActivityEvent[]> {
  return getLeadTimeline(leadId);
}
