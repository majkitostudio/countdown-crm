export function trainingJsonError(message: string, status: number): Response {
  return Response.json(
    {
      ok: false,
      code: status === 401 ? "UNAUTHORIZED" : status === 400 ? "VALIDATION" : "UNAVAILABLE",
      message,
    },
    { status }
  );
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === "Unauthorized";
}
