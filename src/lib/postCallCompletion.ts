export function createPostCallRetry<TPayload, TResult>(
  execute: (payload: TPayload) => Promise<TResult>,
  payload: TPayload,
): () => Promise<TResult> {
  const preservedPayload = { ...payload };
  return () => execute({ ...preservedPayload });
}
