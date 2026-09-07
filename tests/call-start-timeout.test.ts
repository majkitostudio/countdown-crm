import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

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

  it("threads the selected product and returned snapshot through the live call state", () => {
    const softphone = readFileSync("src/lib/telephony/softphone.ts", "utf8");
    const workspace = readFileSync("src/app/workspace/page.tsx", "utf8");

    expect(softphone).toContain("productId?: string | null");
    expect(softphone).toContain("scriptSnapshot: ScriptSnapshotDTO | null");
    expect(softphone).toContain("productId: context.productId || null");
    expect(softphone).toContain("scriptSnapshot = sessionBody.scriptSnapshot");
    expect(workspace).toContain("productId: products[0]?.id || null");
    expect(workspace).toContain("activeSnapshot={softphoneSession.scriptSnapshot}");
  });
});
