import { submitTrainingTurnAction, type SubmitTrainingTurnInput } from "@/app/actions/training";
import { requireAuthenticatedUser } from "@/lib/auth/server";

function jsonError(message: string, status: number): Response {
  return Response.json(
    {
      ok: false,
      code: status === 401 ? "UNAUTHORIZED" : status === 400 ? "VALIDATION" : "UNAVAILABLE",
      message,
    },
    { status }
  );
}

function getResultStatus(code: "VALIDATION" | "UNAVAILABLE" | "PROVIDER"): number {
  if (code === "VALIDATION") return 400;
  return 503;
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === "Unauthorized";
}

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAuthenticatedUser();
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return jsonError("Authentication is required.", 401);
    }

    console.error("Training turn authentication failed:", error);
    return jsonError("Training turn is unavailable.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  let result: Awaited<ReturnType<typeof submitTrainingTurnAction>>;
  try {
    result = await submitTrainingTurnAction(body as SubmitTrainingTurnInput);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return jsonError("Authentication is required.", 401);
    }

    console.error("Training turn execution failed:", error);
    return jsonError("Training turn is unavailable.", 503);
  }

  if (!result.ok) {
    return Response.json(result, { status: getResultStatus(result.code) });
  }

  return Response.json(result, { status: 200 });
}
