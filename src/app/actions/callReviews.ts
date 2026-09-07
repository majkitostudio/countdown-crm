"use server";

import { revalidatePath } from "next/cache";
import {
  getCallReview,
  recordCallReview,
  type RecordCallReviewInput,
} from "@/lib/dal/callReviews";

export async function getCallReviewAction(callId: string) {
  return getCallReview(callId);
}

export async function recordCallReviewAction(input: RecordCallReviewInput) {
  const result = await recordCallReview(input);
  revalidatePath(`/calls/${result.callId}/review`);
  revalidatePath("/exceptions");
  revalidatePath("/audit");
  return result;
}
