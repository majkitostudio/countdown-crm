import { listLeadActivityPageAction } from "@/app/actions/crm";
import type {
  CustomerActivityEvent,
  CustomerActivityPage,
  CustomerActivityPageOptions,
} from "./customerActivity";

export async function getLeadActivityPage(
  leadId: string,
  options?: CustomerActivityPageOptions,
): Promise<CustomerActivityPage> {
  return listLeadActivityPageAction(leadId, options);
}

export async function getLeadTimeline(leadId: string): Promise<CustomerActivityEvent[]> {
  const page = await getLeadActivityPage(leadId);
  return page.items;
}
