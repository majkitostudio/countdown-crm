"use client";

import { useId } from "react";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  RotateCcw,
  Truck,
  Building2,
} from "lucide-react";
import type { ShipmentTrackingEvent } from "@/lib/dal/activity";
import { Surface } from "@/components/ui/Surface";

interface ShipmentTimelineCardProps {
  orderCreatedAt: string;
  orderStatus: string;
  packageLocation?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  events?: ShipmentTrackingEvent[];
}

function formatEventTime(isoString: string): { time: string; date: string } {
  try {
    const d = new Date(isoString);
    const time = new Intl.DateTimeFormat("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
    const date = new Intl.DateTimeFormat("cs-CZ", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).format(d);
    return { time, date };
  } catch {
    return { time: "--:--", date: "" };
  }
}

function getEventIcon(title: string, status?: string) {
  const t = (title + " " + (status || "")).toLowerCase();

  if (t.includes("delivered") || t.includes("doruč") || t.includes("prevzat") || t.includes("vyzvednut")) {
    return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  }
  if (t.includes("return") || t.includes("vráce") || t.includes("odmít") || t.includes("nedoruč")) {
    return <RotateCcw className="h-4 w-4 text-rose-400" />;
  }
  if (t.includes("depo") || t.includes("sklad") || t.includes("výdejn") || t.includes("box")) {
    return <Building2 className="h-4 w-4 text-amber-400" />;
  }
  if (t.includes("předán") || t.includes("odesl") || t.includes("transit") || t.includes("přeprav") || t.includes("cěst")) {
    return <Truck className="h-4 w-4 text-sky-400" />;
  }
  if (t.includes("vytvořen") || t.includes("objednávka")) {
    return <Package className="h-4 w-4 text-zinc-400" />;
  }
  return <Clock className="h-4 w-4 text-zinc-400" />;
}

export function ShipmentTimelineCard({
  orderCreatedAt,
  orderStatus,
  packageLocation,
  trackingNumber,
  carrier,
  events = [],
}: ShipmentTimelineCardProps) {
  const baseId = useId();

  // Combine events: if no events exist yet, construct baseline timeline from creation
  const displayEvents: ShipmentTrackingEvent[] =
    events && events.length > 0
      ? [...events].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())
      : [
          {
            id: `${baseId}-created`,
            occurred_at: orderCreatedAt,
            status: orderStatus,
            title: "Objednávka vytvořena operátorem",
            location: null,
            description: "Objednávka úspěšně zaevidována a čeká na expedici.",
            source: "system",
          },
        ];

  return (
    <Surface variant="page" className="p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Časová osa zásilky (Timeline)</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Detailní historie pohybu balíčku od expedice po doručení či vrácení.
          </p>
        </div>

        {carrier && trackingNumber && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-1 text-[11px] font-mono text-zinc-300">
            <span className="capitalize text-zinc-500">{carrier}:</span> {trackingNumber}
          </span>
        )}
      </div>

      {/* Prominent Package Location Box (Klienti se na to nejčastěji ptají!) */}
      {packageLocation ? (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                Kde se balíček právě nachází:
              </span>
              <p className="mt-0.5 text-sm font-semibold text-zinc-100 break-words">
                {packageLocation}
              </p>
              <p className="mt-1 text-xs text-amber-200/80">
                Při hovoru s klientem můžete ihned nahlásit toto výdejní místo, depo nebo Z-BOX.
              </p>
            </div>
          </div>
        </div>
      ) : orderStatus === "sent" ? (
        <div className="mb-6 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 flex items-center gap-2.5 text-xs text-sky-200">
          <Truck className="h-4 w-4 text-sky-400 shrink-0" />
          <span>Balíček je v přepravě k zákazníkovi nebo na výdejní místo.</span>
        </div>
      ) : null}

      {/* Vertical Timeline */}
      <div className="relative pl-6 space-y-6 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-[2px] before:bg-zinc-800">
        {displayEvents.map((evt, index) => {
          const { time, date } = formatEventTime(evt.occurred_at);
          const isLatest = index === displayEvents.length - 1;

          return (
            <div key={evt.id || index} className="relative group">
              {/* Timeline marker */}
              <div
                className={`absolute -left-6 top-0 flex h-6 w-6 items-center justify-center rounded-full border bg-zinc-950 shadow-sm ${
                  isLatest
                    ? "border-amber-400/80 ring-2 ring-amber-400/20"
                    : "border-zinc-700"
                }`}
              >
                {getEventIcon(evt.title, evt.status)}
              </div>

              {/* Event Content */}
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3.5 transition-colors group-hover:border-zinc-700/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-zinc-100">
                      {time}
                    </span>
                    <span className="text-[11px] text-zinc-500">{date}</span>
                  </div>

                  {evt.location && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300/90 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      <MapPin className="h-3 w-3" />
                      {evt.location}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs font-medium text-zinc-200">{evt.title}</p>

                {evt.description && (
                  <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                    {evt.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}
