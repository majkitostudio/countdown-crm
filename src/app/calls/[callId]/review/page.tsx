import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { CallReviewWorkspace } from "@/components/calls/CallReviewWorkspace";
import { PageHeader } from "@/components/layout/PageHeader";
import { getCallReview } from "@/lib/dal/callReviews";
import { isDataAccessError } from "@/lib/dal/errors";
import { requireWorkspaceRole } from "@/lib/dal/workspace";
import { Surface } from "@/components/ui/Surface";

async function loadCallReview(callId: string) {
  try {
    return await getCallReview(callId);
  } catch (error) {
    if (isDataAccessError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }
}

export default async function CallReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ callId: string }>;
  searchParams: Promise<{ return?: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  const returnToCallsHref = query.return === "unreviewed" ? "/calls?review=unreviewed" : "/calls";

  try {
    await requireWorkspaceRole(["team_leader", "administrator"]);
  } catch (error) {
    if (isDataAccessError(error) && error.code === "FORBIDDEN") {
      return (
        <Surface variant="empty" className="w-full">
          <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
          <h1 className="text-base font-semibold text-zinc-100">Team Leader Review unavailable</h1>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
            This area is available to Team Leaders and Administrators only.
          </p>
          <Link
            href={returnToCallsHref}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to calls
          </Link>
        </Surface>
      );
    }
    throw error;
  }
  const { callId } = await params;

  const review = await loadCallReview(callId);
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        icon={ShieldCheck}
        title="Call review"
        description={`Review recorded evidence for call #${review.call.id}.`}
        badge={{ label: "Real call evidence", tone: "neutral" }}
        actions={
          <Link href={returnToCallsHref} className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Back to calls
          </Link>
        }
      />
      <CallReviewWorkspace initialReview={review} />
    </div>
  );
}
