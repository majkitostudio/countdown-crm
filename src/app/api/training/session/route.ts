import {
  saveTrainingSessionAction,
  type SaveTrainingSessionInput,
} from "@/app/actions/trainingSession";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { isUnauthorizedError, trainingJsonError } from "@/lib/training/http";

function getResultStatus(code: "UNAVAILABLE" | "DATABASE" | "VALIDATION"): number {
  return code === "VALIDATION" ? 400 : 503;
}

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAuthenticatedUser();
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return trainingJsonError("Authentication is required.", 401);
    }

    console.error("Training session authentication failed:", error);
    return trainingJsonError("Training session is unavailable.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return trainingJsonError("Request body must be valid JSON.", 400);
  }

  let result: Awaited<ReturnType<typeof saveTrainingSessionAction>>;
  try {
    result = await saveTrainingSessionAction(body as SaveTrainingSessionInput);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return trainingJsonError("Authentication is required.", 401);
    }

    console.error("Training session save failed:", error);
    return trainingJsonError("Training session is unavailable.", 503);
  }

  if (!result.ok) {
    return Response.json(result, { status: getResultStatus(result.code) });
  }

  return Response.json(result, { status: 201 });
}
