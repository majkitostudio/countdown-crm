"use server";

import { revalidatePath } from "next/cache";
import { recordTrainingReviewRevision } from "@/lib/dal/trainingSessions";

export async function recordTrainingReviewAction(input: {
  sessionId: string;
  expectedRevision: number;
  verdict: string;
  coachingNote: string;
  correctionReason?: string | null;
}) {
  const revision = await recordTrainingReviewRevision(input);
  revalidatePath(`/team/reviews/${input.sessionId}`);
  revalidatePath("/team/reviews");
  revalidatePath("/call-logs");
  return revision;
}
