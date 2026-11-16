import Link from "next/link";
import { ArrowLeft, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { getDirectLeadForWorkspace } from "@/lib/dal/leadQueue";
import { isDataAccessError } from "@/lib/dal/errors";
import { listWorkspaceLeadActivity } from "@/lib/dal/activity";
import { listLeadNotesForWorkspace } from "@/lib/dal/leadNotes";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { getLeadActivityPage, TIMELINE_PAGE_LIMIT, type TimelineActivityEntry } from "@/lib/timeline";
import { formatDateTime } from "@/lib/datetime";
import { PageHeader } from "@/components/layout/PageHeader";
import { CustomerIdentityCard } from "@/components/lead-card/CustomerIdentityCard";
import { CustomerSummaryCard } from "@/components/lead-card/CustomerSummaryCard";
import { CustomerTimelineFeed } from "@/components/lead-card/CustomerTimelineFeed";
import { LeadOrdersSection } from "@/components/leads/LeadOrdersSection";
import { LeadNotesSection } from "@/components/workspace/LeadNotesSection";
import { Alert, AlertDescription } from "@/components/shadcn/alert";
import { Button } from "@/components/shadcn/button";
import { getStatusClassName } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  let lead: Awaited<ReturnType<typeof getDirectLeadForWorkspace>> | null = null;
  let context: Awaited<ReturnType<typeof requireWorkspaceContext>> | null = null;
  let loadError: unknown = null;

  try {
    context = await requireWorkspaceContext();
    lead = await getDirectLeadForWorkspace(leadId, context.workspaceId);
  } catch (error) {
    loadError = error;
  }

  if (loadError || !lead) {
    const message = isDataAccessError(loadError) && loadError.code === "FORBIDDEN"
      ? "Vaše role v pracovním prostoru nemá k tomuto kontaktu přístup."
      : isDataAccessError(loadError) && loadError.code === "NOT_FOUND"
        ? "Kontakt není v aktivním pracovním prostoru dostupný."
        : "Kontakt se nepodařilo načíst. Nebyla použita smyšlená data. Zkuste to znovu.";

    return (
      <Surface variant="empty" className="w-full">
        <LockKeyhole className="mx-auto mb-4 size-8 text-text-disabled" strokeWidth={1.75} aria-hidden="true" />
        <h1 className="text-base font-semibold text-text-primary">Kontakt není dostupný</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-text-muted">{message}</p>
        <Button asChild variant="secondary">
          <Link href="/console">
            <ArrowLeft className="size-3.5" strokeWidth={1.75} aria-hidden="true" /> Zpět do konzole operátora
          </Link>
        </Button>
      </Surface>
    );
  }

  let activity: Awaited<ReturnType<typeof listWorkspaceLeadActivity>> = { calls: [], orders: [] };
  let activityUnavailable = false;
  try {
    activity = await listWorkspaceLeadActivity(lead.id);
  } catch {
    activityUnavailable = true;
  }

  let notes: Awaited<ReturnType<typeof listLeadNotesForWorkspace>> = [];
  let notesUnavailable = false;
  try {
    notes = await listLeadNotesForWorkspace(lead.id);
  } catch {
    notesUnavailable = true;
  }

  let timelineItems: TimelineActivityEntry[] = [];
  let timelineCursor: string | null = null;
  let timelineHasMore = false;
  let timelineError: string | null = null;
  try {
    const page = await getLeadActivityPage(lead.id, { limit: TIMELINE_PAGE_LIMIT });
    timelineItems = page.items;
    timelineCursor = page.next_cursor;
    timelineHasMore = page.has_more;
  } catch (error) {
    timelineError =
      error instanceof Error ? error.message : "Historii zákazníka se nepodařilo načíst.";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        icon={UserRound}
        title={lead.full_name}
        badge={{ label: "Kontakt pouze pro čtení", tone: "neutral" }}
        backLink={{ href: "/console", label: "Zpět do pracovního prostoru" }}
        description={`Aktualizováno ${formatDateTime(lead.updated_at)}`}
        actions={
          <div className="inline-flex items-center gap-2 rounded-control border border-border-default bg-surface-inset px-3 py-2 text-[11px] text-text-muted">
            <ShieldCheck className="size-3.5 text-text-muted" strokeWidth={1.75} aria-hidden="true" />
            Otevření této adresy neopravňuje k zahájení hovoru.
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(300px,340px)_minmax(0,1fr)] lg:items-start">
        <div className="lg:col-span-2">
          <CustomerIdentityCard lead={lead} />
        </div>

        <div className="lg:col-start-1 lg:row-start-2">
          <CustomerSummaryCard
            lead={lead}
            activity={activity}
            activityUnavailable={activityUnavailable}
          />
        </div>

        <div className="space-y-6 lg:col-start-2 lg:row-start-2">
          <CustomerTimelineFeed
            leadId={lead.id}
            initialItems={timelineItems}
            initialNextCursor={timelineCursor}
            initialHasMore={timelineHasMore}
            initialError={timelineError}
          />
          {!activityUnavailable && <LeadOrdersSection orders={activity.orders} leadId={lead.id} />}
        </div>

        <div className="lg:col-start-1 lg:row-start-3">
          {context?.role === "operator" ? (
            <Alert className={cn("border", getStatusClassName("neutral"))}>
              <AlertDescription className="text-xs">
                Tento profil zákazníka je pro operátory pouze ke čtení. Odtud lze otevřít objednávky
                a historii hovorů.
              </AlertDescription>
            </Alert>
          ) : notesUnavailable ? (
            <Alert className={cn("border", getStatusClassName("warning"))}>
              <AlertDescription className="text-xs">
                Sdílené poznámky momentálně nejsou dostupné. Historie poznámek nebyla skryta ani
                nahrazena smyšlenými údaji.
              </AlertDescription>
            </Alert>
          ) : (
            <LeadNotesSection leadId={lead.id} initialNotes={notes} />
          )}
        </div>
      </div>
    </div>
  );
}
