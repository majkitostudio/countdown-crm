"use client";

import {
  Building2,
  CalendarDays,
  CircleGauge,
  FileText,
  Hash,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Lead } from "@/lib/leads";

interface ClientProfileCardProps {
  lead: Lead;
}

const STATUS_LABELS: Record<Lead["status"], string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  customer: "Customer",
  unresponsive: "Unresponsive",
};

function formatRecordDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unavailable";

  return date.toLocaleString("cs-CZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayValue(value: string | null | undefined, fallback = "Unavailable"): string {
  return value?.trim() || fallback;
}

function ProfileField({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: typeof Phone;
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-800/70 bg-zinc-950/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        <Icon className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" />
        <span>{label}</span>
      </div>
      {children || <p className="mt-1.5 truncate text-sm text-zinc-200">{value}</p>}
    </div>
  );
}

export function ClientProfileCard({ lead }: ClientProfileCardProps) {
  const score = Math.min(100, Math.max(0, lead.ai_score));

  return (
    <section
      className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 shadow-sm"
      data-testid="client-profile-card"
      aria-labelledby="client-profile-card-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-900/60 bg-sky-950/40 text-sky-200">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Client Profile</p>
            <h2 id="client-profile-card-title" className="mt-1 truncate text-base font-semibold text-zinc-100">
              Everything currently known about this lead
            </h2>
          </div>
        </div>
        <span className="rounded-md border border-zinc-800 bg-zinc-950/70 px-2 py-1 text-[10px] font-mono text-zinc-500">
          Record details
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <ProfileField icon={UserRound} label="Full name" value={lead.full_name} />
        <ProfileField icon={Phone} label="Phone">
          <a className="mt-1.5 block truncate text-sm text-zinc-200 hover:text-white" href={`tel:${lead.phone}`}>
            {lead.phone}
          </a>
        </ProfileField>
        <ProfileField icon={Mail} label="Email">
          {lead.email ? (
            <a className="mt-1.5 block truncate text-sm text-zinc-200 hover:text-white" href={`mailto:${lead.email}`}>
              {lead.email}
            </a>
          ) : (
            <p className="mt-1.5 truncate text-sm text-zinc-500">Unavailable</p>
          )}
        </ProfileField>
        <ProfileField icon={Building2} label="Company" value={displayValue(lead.company)} />
        <ProfileField icon={MapPin} label="Location" value={[lead.city, lead.country].filter(Boolean).join(", ") || "Unavailable"} />
        <ProfileField icon={CircleGauge} label="Lead status" value={STATUS_LABELS[lead.status]} />
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <ProfileField icon={CircleGauge} label="Lead score">
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-label="Lead score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
              <div className="h-full rounded-full bg-sky-400" style={{ width: `${score}%` }} />
            </div>
            <span className="shrink-0 font-mono text-sm text-zinc-200">{score}/100</span>
          </div>
        </ProfileField>
        <ProfileField icon={Hash} label="Lead ID" value={lead.id} />
        <ProfileField icon={CalendarDays} label="Created" value={formatRecordDate(lead.created_at)} />
        <ProfileField icon={CalendarDays} label="Last updated" value={formatRecordDate(lead.updated_at)} />
        <ProfileField icon={MapPin} label="Source" value="Unavailable" />
      </div>

      <div className="mt-2 rounded-lg border border-zinc-800/70 bg-zinc-950/40 p-3">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          <FileText className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" />
          <span>Profile note</span>
        </div>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
          {displayValue(lead.notes, "No profile note saved.")}
        </p>
      </div>

      <p className="mt-3 text-[10px] text-zinc-600">
        Activity timeline, shared notes and order history remain in the supporting context rail.
      </p>
    </section>
  );
}
