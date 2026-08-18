import Link from "next/link";
import { ArrowLeft, Building2, LockKeyhole, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { getScopedLeadForWorkspace } from "@/lib/dal/leadQueue";
import { isDataAccessError } from "@/lib/dal/errors";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  let lead: Awaited<ReturnType<typeof getScopedLeadForWorkspace>> | null = null;
  let loadError: unknown = null;

  try {
    lead = await getScopedLeadForWorkspace(leadId);
  } catch (error) {
    loadError = error;
  }

  if (loadError || !lead) {
    const message = isDataAccessError(loadError) && loadError.code === "FORBIDDEN"
      ? "This contact is not available for your workspace role."
      : isDataAccessError(loadError) && loadError.code === "NOT_FOUND"
        ? "Contact unavailable. Operators can only open their current server assignment."
        : "Contact could not be loaded. No data was fabricated.";

    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Contact unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">{message}</p>
        <Link href="/workspace" className="mt-5 inline-flex items-center gap-2 rounded-lg border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-zinc-100">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Operator Console
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/workspace" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to workspace
      </Link>

      <div className="flex flex-col justify-between gap-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-8 shadow-sm md:flex-row md:items-start">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">{lead.full_name}</h1>
            <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-0.5 text-[10px] font-mono text-zinc-400">Read-only contact view</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Updated {formatDate(lead.updated_at)}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-[11px] text-zinc-400">
          <ShieldCheck className="h-3.5 w-3.5 text-zinc-500" /> Opening this URL does not authorize a call.
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-zinc-400">Contact details</h2>
          <dl className="space-y-4 text-xs">
            <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-zinc-500" /><dt className="w-20 text-zinc-500">Phone</dt><dd className="font-mono text-zinc-200">{lead.phone}</dd></div>
            <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-zinc-500" /><dt className="w-20 text-zinc-500">Email</dt><dd className="truncate text-zinc-200">{lead.email || "—"}</dd></div>
            <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-zinc-500" /><dt className="w-20 text-zinc-500">Location</dt><dd className="text-zinc-200">{[lead.city, lead.country].filter(Boolean).join(", ") || "—"}</dd></div>
            <div className="flex items-center gap-3"><Building2 className="h-4 w-4 text-zinc-500" /><dt className="w-20 text-zinc-500">Company</dt><dd className="text-zinc-200">{lead.company || "Independent"}</dd></div>
          </dl>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-zinc-400">CRM state</h2>
          <dl className="space-y-4 text-xs">
            <div className="flex items-center justify-between gap-4"><dt className="text-zinc-500">Status</dt><dd className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-zinc-300">{lead.status}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-zinc-500">AI score</dt><dd className="font-mono text-zinc-200">{lead.ai_score}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="text-zinc-500">Created</dt><dd className="font-mono text-[11px] text-zinc-400">{formatDate(lead.created_at)}</dd></div>
          </dl>
          {lead.notes && <div className="mt-6 border-t border-zinc-800 pt-5"><h3 className="text-[10px] uppercase tracking-wider text-zinc-500">Notes</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{lead.notes}</p></div>}
        </div>
      </div>
    </div>
  );
}
