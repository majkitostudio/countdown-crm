import Link from "next/link";
import { ExternalLink, Package, ShoppingBag, Truck } from "lucide-react";
import type { WorkspaceOrderDTO } from "@/lib/dal/activity";
import { getStatusClassName, type SemanticTone } from "@/components/ui/Status";
import { formatDateTime } from "@/lib/datetime";
import { formatCurrencyAmount } from "@/lib/currency";
import { getCarrierMeta, getCarrierTrackingUrl } from "@/lib/tracking";
import { Badge } from "@/components/shadcn/badge";
import { Card, CardAction, CardContent, CardHeader } from "@/components/shadcn/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/shadcn/table";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/shadcn/empty";
import { CardHeading } from "@/components/lead-card/CardHeading";
import { cn } from "@/lib/utils";

const STATUS_TONES: Record<string, SemanticTone> = {
  completed: "success",
  delivered: "success",
  cancelled: "danger",
  returned: "danger",
  pending: "warning",
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: "Zpracovává se",
  sent: "Odesláno",
  delivered: "Doručeno",
  returned: "Vráceno do skladu",
  cancelled: "Stornováno",
  pending: "Čeká na schválení",
  completed: "Dokončeno",
};

function getStatusTone(status: string): SemanticTone {
  return STATUS_TONES[status] ?? "neutral";
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export interface LeadOrdersSectionProps {
  orders: WorkspaceOrderDTO[];
  leadId: string;
}

export function LeadOrdersSection({ orders }: LeadOrdersSectionProps) {
  return (
    <Card data-testid="lead-orders-section">
      <CardHeader>
        <div className="min-w-0 space-y-0.5">
          <CardHeading>Objednávky a zásilky</CardHeading>
          <p className="text-xs text-text-muted">
            Přehled nákupů zákazníka, stav expedice a sledovací čísla balíků.
          </p>
        </div>
        <CardAction>
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-text-secondary">
            <ShoppingBag className="size-4 text-text-muted" strokeWidth={1.75} aria-hidden="true" />
            {orders.length}
          </span>
        </CardAction>
      </CardHeader>

      <CardContent>
        {orders.length === 0 ? (
          <Empty className="border border-dashed border-border-default">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Package className="size-4 text-text-muted" strokeWidth={1.75} aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Zákazník zatím nemá žádné objednávky</EmptyTitle>
              <EmptyDescription>
                Jakmile operátor vytvoří objednávku v hovoru, zobrazí se zde její stav a sledování
                balíku.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table className="text-xs">
            <caption className="sr-only">
              Objednávky zákazníka se stavem, částkou a sledováním zásilky.
            </caption>
            <thead>
              <tr>
                <TableHead className="h-9 px-3 font-medium text-text-muted">Objednávka</TableHead>
                <TableHead className="h-9 px-3 font-medium text-text-muted">Stav</TableHead>
                <TableHead className="h-9 px-3 font-medium whitespace-nowrap text-text-muted">
                  Částka
                </TableHead>
                <TableHead className="h-9 px-3 font-medium text-text-muted">Zásilka</TableHead>
              </tr>
            </thead>
            <TableBody>
              {orders.map((order) => {
                const trackingUrl = getCarrierTrackingUrl(order.carrier, order.tracking_number);
                const carrierMeta = getCarrierMeta(order.carrier);

                return (
                  <TableRow key={order.id} data-testid={`lead-order-card-${order.id}`}>
                    <TableCell className="px-3 py-2.5 align-top whitespace-normal">
                      <div className="min-w-0 space-y-0.5">
                        <Link
                          href={`/orders/${order.id}?origin=lead`}
                          className="text-xs font-medium break-words text-text-secondary underline-offset-4 transition-colors duration-150 ease-interface hover:text-text-primary hover:underline"
                        >
                          {order.product_title}
                        </Link>
                        <p className="font-mono text-[11px] text-text-muted">
                          #{order.id.slice(0, 8)} · {formatDateTime(order.created_at)}
                          {order.agent_name ? ` · ${order.agent_name}` : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-top">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border h-auto px-1.5 py-0.5 text-[11px] font-medium",
                          getStatusClassName(getStatusTone(order.status)),
                        )}
                      >
                        {statusLabel(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-top font-mono whitespace-nowrap text-text-primary">
                      {formatCurrencyAmount(order.total_amount, order.currency)}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-top whitespace-normal">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <Truck className="size-4 shrink-0 text-text-muted" strokeWidth={1.75} aria-hidden="true" />
                          {order.tracking_number ? (
                            <>
                              <span className="font-mono text-[10px] text-text-muted">
                                {carrierMeta.badge}
                              </span>
                              <span className="min-w-0 font-mono text-[11px] break-all text-text-secondary">
                                {order.tracking_number}
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] text-text-muted">
                              {order.status === "sent" ? "Číslo zásilky nebylo zadáno" : "Zatím neodesláno"}
                            </span>
                          )}
                        </span>

                        {trackingUrl ? (
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`lead-order-tracking-link-${order.id}`}
                            className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-text-secondary underline-offset-4 transition-colors duration-150 ease-interface hover:text-text-primary hover:underline"
                          >
                            Sledovat balíček
                            <ExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                          </a>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
