import { afterEach, describe, expect, it, vi } from "vitest";

import { OperationTimeoutError, withTimeout } from "@/lib/withTimeout";

describe("call-start async timeout contract", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects a never-settling operation with a recoverable timeout", async () => {
    vi.useFakeTimers();
    const operation = new Promise<boolean>(() => {});
    const timedOperation = withTimeout(operation, 1_000, "Call start timed out");

    const assertion = expect(timedOperation).rejects.toBeInstanceOf(OperationTimeoutError);
    await vi.advanceTimersByTimeAsync(1_000);
    await assertion;
  });

  it("preserves the underlying result when it completes before the timeout", async () => {
    vi.useFakeTimers();
    const operation = Promise.resolve(true);

    await expect(withTimeout(operation, 1_000, "Call start timed out")).resolves.toBe(true);
  });
});
