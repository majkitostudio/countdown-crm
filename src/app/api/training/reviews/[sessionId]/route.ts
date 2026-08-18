import { getTrainingSessionReview } from "@/lib/dal/trainingSessions";
import { isDataAccessError } from "@/lib/dal/errors";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { isUnauthorizedError, trainingJsonError } from "@/lib/training/http";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<Response> {
  try {
    await requireAuthenticatedUser();
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return trainingJsonError("Authentication is required.", 401);
    }

    console.error("Training review authentication failed:", error);
    return trainingJsonError("Training review is unavailable.", 503);
  }

  const { sessionId } = await params;
  if (!isUuid(sessionId)) {
    return trainingJsonError("Training session ID is invalid.", 400);
  }

  try {
    const session = await getTrainingSessionReview(sessionId);
    if (!session) {
      return trainingJsonError("Training session not found.", 404, "NOT_FOUND");
    }

    return Response.json({ ok: true, session });
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

    console.error("Training review could not be loaded:", error);
    return trainingJsonError("Training review is unavailable.", 503);
  }
}
