import Link from "next/link";
import type { WorkspaceCallDTO, WorkspaceOrderDTO } from "@/lib/dal/activity";
import type { LeadDTO } from "@/lib/dal/leads";
import { buildCustomer360Snapshot } from "@/lib/customer360";
import { formatCurrencyAmount, formatCurrencyAmounts } from "@/lib/currency";
import { formatDateTime } from "@/lib/datetime";
import { formatCallOutcome } from "@/lib/callOutcomes";
import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert";
import { Card, CardAction, CardContent, CardHeader } from "@/components/shadcn/card";
import { Separator } from "@/components/shadcn/separator";
import { getStatusClassName } from "@/components/ui/Status";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { cn } from "@/lib/utils";
import { CardHeading, CardSubHeading } from "./CardHeading";

interface CustomerSummaryCardProps {
  lead: LeadDTO;
  activity: {
    calls: Array<Pick<WorkspaceCallDTO, "created_at" | "outcome">>;
    orders: Array<
      Pick<
        WorkspaceOrderDTO,
        "id" | "created_at" | "product_title" | "total_amount" | "currency" | "status"
      >
    >;
  };
  activityUnavailable?: boolean;
}

const UNAVAILABLE_TEXT =
  "Aktivity zákazníka nejsou dostupné. Doporučení pro udržení zákazníka nebylo vytvořeno z náhradních dat.";

function KpiCell({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</p>
      <p className="font-mono text-sm break-words text-text-primary">{value}</p>
      {detail ? <p className="text-[11px] leading-tight text-text-muted">{detail}</p> : null}
    </div>
  );
}

export function CustomerSummaryCard({
  lead,
  activity,
  activityUnavailable = false,
}: CustomerSummaryCardProps) {
  const snapshot = activityUnavailable ? null : buildCustomer360Snapshot(lead, activity);

  return (
    <Card data-testid="customer-summary">
      <CardHeader>
        <div className="min-w-0 space-y-0.5">
          <CardHeading>Přehled zákazníka</CardHeading>
          <p className="text-xs text-text-muted">Skutečná historie pracovního prostoru, bez náhradních dat.</p>
        </div>
        <CardAction>
          <Badge variant="outline" className={cn("h-auto border px-1.5 py-0.5 text-[11px] font-medium", getStatusClassName("neutral"))}>
            Uložená data pracovního prostoru
          </Badge>
        </CardAction>
      </CardHeader>

      {snapshot === null ? (
        <CardContent>
          <Alert role="status" className={cn("border", getStatusClassName("neutral"))}>
            <AlertDescription className="text-xs">{UNAVAILABLE_TEXT}</AlertDescription>
          </Alert>
        </CardContent>
      ) : (
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <KpiCell label="Hovory" value={String(snapshot.totalCalls)} />
            <KpiCell
              label="Objednávky"
              value={`${snapshot.fulfilledOrders}/${snapshot.totalOrders}`}
              detail="vyřízené / celkem"
            />
            <KpiCell
              label="Tržby"
              value={snapshot.fulfilledOrders === 0 ? formatCurrencyAmount(0, "CZK") : formatCurrencyAmounts(snapshot.revenueByCurrency)}
              detail={
                snapshot.incompleteRevenueOrders > 0
                  ? `Neúplné údaje u ${snapshot.incompleteRevenueOrders} vyřízených objednávek.`
                  : snapshot.revenueByCurrency.length > 1
                  ? "měny jsou uvedeny zvlášť, nesčítají se"
                  : undefined
              }
            />
            <KpiCell
              label="Poslední kontakt"
              value={snapshot.lastCallAt ? formatDateTime(snapshot.lastCallAt) : "—"}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="min-w-0 space-y-1">
              <CardSubHeading>Poslední objednávka</CardSubHeading>
              <p className="text-xs break-words text-text-secondary">
                {snapshot.lastProduct || "Zatím bez objednávky"}
              </p>
              <p className="font-mono text-[11px] text-text-muted">
                {snapshot.lastOrderAt ? formatDateTime(snapshot.lastOrderAt) : "—"}
              </p>
            </div>
            <div className="min-w-0 space-y-1">
              <CardSubHeading>Výsledek posledního hovoru</CardSubHeading>
              <p className="text-xs break-words text-text-secondary">
                {snapshot.lastCallOutcome
                  ? formatCallOutcome(snapshot.lastCallOutcome as Parameters<typeof formatCallOutcome>[0])
                  : "Zatím bez hovoru"}
              </p>
              <p className="font-mono text-[11px] text-text-muted">
                {snapshot.lastCallAt ? formatDateTime(snapshot.lastCallAt) : "—"}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2.5">
            <CardSubHeading>Další krok pro udržení zákazníka</CardSubHeading>
            <Alert
              role="status"
              className={cn("flex flex-wrap items-center justify-between gap-3 border", getStatusClassName("info"))}
            >
              <div className="min-w-0 space-y-1">
                <AlertTitle className="text-xs text-text-primary">{snapshot.nextAction.title}</AlertTitle>
                <AlertDescription className="text-xs text-text-secondary">
                  {snapshot.nextAction.description}
                </AlertDescription>
              </div>
              <Button asChild variant="secondary" size="sm" className="shrink-0">
                <Link href={snapshot.nextAction.href}>Otevřít krok</Link>
              </Button>
            </Alert>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
