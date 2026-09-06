import { notFound } from "next/navigation";
import { CallReviewWorkspace } from "@/components/calls/CallReviewWorkspace";
import { getCallReview } from "@/lib/dal/callReviews";
import { isDataAccessError } from "@/lib/dal/errors";
import { requireWorkspaceRole } from "@/lib/dal/workspace";

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
}: {
  params: Promise<{ callId: string }>;
}) {
  await requireWorkspaceRole(["team_leader", "administrator"]);
  const { callId } = await params;

  const review = await loadCallReview(callId);
  return <CallReviewWorkspace initialReview={review} />;
}
