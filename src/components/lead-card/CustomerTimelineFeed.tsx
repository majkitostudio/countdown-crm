"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  History,
  PhoneCall,
  RefreshCw,
  ShoppingBag,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { getLeadActivityPage, TIMELINE_PAGE_LIMIT, type TimelineActivityEntry, type TimelineActivityType } from "@/lib/timeline";
import { formatCallOutcome } from "@/lib/callOutcomes";
import { formatCurrencyAmount } from "@/lib/currency";
import { formatDayLabel, formatTime, getDayKey } from "@/lib/datetime";
import { formatDuration } from "@/lib/utils";
import { Badge } from "@/components/shadcn/badge";
import { Card, CardAction, CardContent, CardHeader } from "@/components/shadcn/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/shadcn/empty";
import { Separator } from "@/components/shadcn/separator";
import { Skeleton } from "@/components/shadcn/skeleton";
import { Spinner } from "@/components/shadcn/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/shadcn/toggle-group";
import { Alert, AlertDescription } from "@/components/shadcn/alert";
import { Button } from "@/components/shadcn/button";
import { getStatusClassName } from "@/components/ui/Status";
import { cn } from "@/lib/utils";
import { CardHeading } from "./CardHeading";

type TimelineFilter = "all" | TimelineActivityType;

const FILTERS: Array<{ value: TimelineFilter; label: string }> = [
  { value: "all", label: "Vše" },
  { value: "call", label: "Hovory" },
  { value: "order", label: "Objednávky" },
  { value: "note", label: "Poznámky" },
];

const TYPE_ICONS: Record<TimelineActivityType, LucideIcon> = {
  call: PhoneCall,
  order: ShoppingBag,
  sms_paylink: Zap,
  note: FileText,
  status_change: RefreshCw,
};

const CHIP_CLASS_NAME =
  "h-auto border-border-default bg-transparent px-1.5 py-0.5 font-mono text-[10px] font-normal text-text-secondary";

interface CustomerTimelineFeedProps {
  leadId: string;
  initialItems: TimelineActivityEntry[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  initialError?: string | null;
}

/** The feed restarts when the customer changes so no state leaks across leads. */
export function CustomerTimelineFeed(props: CustomerTimelineFeedProps) {
  return <CustomerTimelineContent key={props.leadId} {...props} />;
}

function CustomerTimelineContent({
  leadId,
  initialItems,
  initialNextCursor,
  initialHasMore,
  initialError = null,
}: CustomerTimelineFeedProps) {
  const [items, setItems] = useState<TimelineActivityEntry[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(initialError);
  const [announcement, setAnnouncement] = useState("");
  const generation = useRef(0);

  const groups = useMemo(() => {
    const visible = filter === "all" ? items : items.filter((item) => item.type === filter);
    const byDay = new Map<string, { label: string; entries: TimelineActivityEntry[] }>();
    for (const entry of visible) {
      const key = getDayKey(entry.timestamp);
      const bucket = byDay.get(key);
      if (bucket) bucket.entries.push(entry);
      else byDay.set(key, { label: formatDayLabel(entry.timestamp), entries: [entry] });
    }
    return [...byDay.values()];
  }, [items, filter]);

  const visibleCount = groups.reduce((total, group) => total + group.entries.length, 0);

  async function handleLoadMore() {
    if (!nextCursor || isLoadingMore) return;
    const requestGeneration = generation.current;
    setIsLoadingMore(true);
    setLoadError(null);
    try {
      const page = await getLeadActivityPage(leadId, { cursor: nextCursor, limit: TIMELINE_PAGE_LIMIT });
      if (generation.current !== requestGeneration) return;
      setItems((current) => [
        ...new Map([...current, ...page.items].map((item) => [item.id, item])).values(),
      ]);
      setNextCursor(page.next_cursor);
      setHasMore(page.has_more);
      setAnnouncement(`Načteno dalších záznamů: ${page.items.length}.`);
    } catch (error) {
      if (generation.current !== requestGeneration) return;
      setLoadError(
        error instanceof Error ? error.message : "Další aktivitu se nepodařilo načíst.",
      );
    } finally {
      if (generation.current === requestGeneration) setIsLoadingMore(false);
    }
  }

  async function handleRetry() {
    const requestGeneration = ++generation.current;
    setIsLoadingMore(true);
    setLoadError(null);
    try {
      const page = await getLeadActivityPage(leadId, { limit: TIMELINE_PAGE_LIMIT });
      if (generation.current !== requestGeneration) return;
      setItems(page.items);
      setNextCursor(page.next_cursor);
      setHasMore(page.has_more);
      setAnnouncement("Historie zákazníka je znovu načtena.");
    } catch (error) {
      if (generation.current !== requestGeneration) return;
      setLoadError(
        error instanceof Error ? error.message : "Historii zákazníka se nepodařilo načíst.",
      );
    } finally {
      if (generation.current === requestGeneration) setIsLoadingMore(false);
    }
  }

  return (
    <Card data-testid="customer-timeline-feed">
      <CardHeader>
        <div className="min-w-0 space-y-0.5">
          <CardHeading>Historie zákazníka</CardHeading>
          <p className="text-xs text-text-muted">
            Hovory, objednávky a poznámky v jednom pořadí od nejnovějšího.
          </p>
        </div>
        <CardAction>
          <span className="font-mono text-xs text-text-secondary">{visibleCount}</span>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        <ToggleGroup
          type="single"
          spacing={1}
          size="sm"
          variant="outline"
          value={filter}
          onValueChange={(value) => {
            if (value) setFilter(value as TimelineFilter);
          }}
          aria-label="Filtr časové osy"
          className="flex-wrap"
        >
          {FILTERS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className="data-[state=on]:border-border-strong data-[state=on]:bg-action-secondary-hover data-[state=on]:text-text-primary"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {loadError && items.length > 0 ? (
          <Alert className={cn("w-full border", getStatusClassName("danger"))}>
            <AlertDescription className="text-xs">{loadError}</AlertDescription>
          </Alert>
        ) : null}

        <div aria-busy={isLoadingMore} className="space-y-5">
          {loadError && items.length === 0 ? (
            <div className="space-y-3">
              <Alert className={cn("w-full border", getStatusClassName("danger"))}>
                <AlertDescription className="text-xs">{loadError}</AlertDescription>
              </Alert>
              <Button variant="secondary" onClick={() => void handleRetry()} disabled={isLoadingMore}>
                {isLoadingMore ? "Načítání…" : "Zkusit znovu"}
              </Button>
            </div>
          ) : groups.length === 0 ? (
            items.length === 0 ? (
              <Empty className="border border-dashed border-border-default">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <History className="size-4 text-text-muted" strokeWidth={1.75} aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>Zákazník zatím nemá žádnou aktivitu</EmptyTitle>
                  <EmptyDescription>
                    Hovory, objednávky a poznámky se zobrazí poté, co je operátor zaznamená v
                    pracovním prostoru.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Empty className="border border-dashed border-border-default">
                <EmptyHeader>
                  <EmptyTitle>Tomuto filtru neodpovídají žádné záznamy</EmptyTitle>
                  <EmptyDescription>Změňte filtr, abyste viděli celou historii.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="secondary" onClick={() => setFilter("all")}>
                    Zobrazit vše
                  </Button>
                </EmptyContent>
              </Empty>
            )
          ) : (
            groups.map((group) => (
              <section key={group.label} aria-label={group.label}>
                <div className="mb-3 flex items-center gap-3">
                  <p className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    {group.label}
                  </p>
                  <Separator className="flex-1" />
                </div>
                <ul className="relative space-y-4 pl-7 before:absolute before:inset-y-1 before:left-[10px] before:w-px before:bg-border-default">
                  {group.entries.map((entry) => (
                    <TimelineRow key={entry.id} entry={entry} />
                  ))}
                </ul>
              </section>
            ))
          )}

          {isLoadingMore && items.length > 0 ? (
            <div className="space-y-3" aria-hidden="true">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-4/5" />
            </div>
          ) : null}
        </div>

        {hasMore ? (
          <Button
            variant="secondary"
            onClick={() => void handleLoadMore()}
            disabled={isLoadingMore}
            className="w-full"
          >
            {isLoadingMore ? (
              <>
                <Spinner className="size-3.5" />
                Načítání dalších záznamů…
              </>
            ) : (
              "Načíst další záznamy"
            )}
          </Button>
        ) : null}

        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * The stored preview carries the amount as raw prose, e.g. "Objednávka
 * zaznamenána (1800.00 CZK)". The chip below formats the same number from
 * metadata, so the duplicate is dropped for this view only — the DAL text
 * stays as it is for the surfaces that still read it.
 */
const RAW_AMOUNT_SUFFIX = /\s*\([\d\s.,]+\s*[A-Za-z]{3}\)$/;

function displayTitle(entry: TimelineActivityEntry): string {
  if (entry.type === "order" && typeof entry.metadata?.order_value === "number") {
    return entry.title.replace(RAW_AMOUNT_SUFFIX, "");
  }
  return entry.title;
}

function TimelineRow({ entry }: { entry: TimelineActivityEntry }) {
  const Icon = TYPE_ICONS[entry.type] ?? History;
  const chips = buildChips(entry);
  const orderId = entry.type === "order" ? entry.metadata?.order_id : undefined;

  return (
    <li className="relative">
      <span
        className="absolute top-0.5 -left-7 flex size-[21px] items-center justify-center rounded-full border border-border-default bg-canvas text-text-muted"
        aria-hidden="true"
      >
        <Icon className="size-3" strokeWidth={1.75} />
      </span>

      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="min-w-0 text-xs font-medium break-words text-text-primary">{displayTitle(entry)}</p>
          <p className="shrink-0 font-mono text-[11px] text-text-muted">{formatTime(entry.timestamp)}</p>
        </div>

        {entry.type === "note" && entry.description ? (
          <p className="text-xs leading-relaxed break-words text-text-secondary">{entry.description}</p>
        ) : null}

        {chips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <Badge key={chip} variant="outline" className={CHIP_CLASS_NAME}>
                {chip}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted">
          <span>Zaznamenal: {entry.operator_name}</span>
          {orderId ? (
            <Link
              href={`/orders/${orderId}?origin=lead`}
              className="inline-flex items-center gap-1 text-text-secondary underline-offset-4 transition-colors duration-150 ease-interface hover:text-text-primary hover:underline"
            >
              Detail objednávky
              <ArrowRight className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function buildChips(entry: TimelineActivityEntry): string[] {
  const metadata = entry.metadata;
  if (!metadata) return [];

  const chips: string[] = [];
  if (typeof metadata.call_duration_seconds === "number") {
    chips.push(`Délka ${formatDuration(metadata.call_duration_seconds)}`);
  }
  if (metadata.call_outcome) {
    chips.push(
      formatCallOutcome(metadata.call_outcome as Parameters<typeof formatCallOutcome>[0]),
    );
  }
  if (typeof metadata.order_value === "number") {
    chips.push(formatCurrencyAmount(metadata.order_value, metadata.order_currency));
  }
  if (metadata.source_note) chips.push(metadata.source_note);
  return chips;
}
