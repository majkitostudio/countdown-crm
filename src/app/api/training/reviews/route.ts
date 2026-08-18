import { getTrainingSessionReviews } from "@/lib/dal/trainingSessions";
import { isDataAccessError } from "@/lib/dal/errors";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { isUnauthorizedError, trainingJsonError } from "@/lib/training/http";

export async function GET(): Promise<Response> {
  try {
    await requireAuthenticatedUser();
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return trainingJsonError("Authentication is required.", 401);
    }

    console.error("Training review authentication failed:", error);
    return trainingJsonError("Training reviews are unavailable.", 503);
  }

  try {
    const sessions = await getTrainingSessionReviews();
    return Response.json({ ok: true, sessions });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return trainingJsonError("Authentication is required.", 401);
    }

    if (isDataAccessError(error) && error.code === "FORBIDDEN") {
      return trainingJsonError(
        "Training reviews are available to Team Leaders and Administrators only.",
        403,
        "FORBIDDEN"
      );
    }

    console.error("Training reviews could not be loaded:", error);
    return trainingJsonError("Training reviews are unavailable.", 503);
  }
}
