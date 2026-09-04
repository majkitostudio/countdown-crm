import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  getAllowedPreviousStatuses,
  isSessionStatus,
} from "@/lib/telephony/sessionTransitions";

describe("telephony session transitions", () => {
  it("accepts only the persisted CRM status values", () => {
    expect(isSessionStatus("connected")).toBe(true);
    expect(isSessionStatus("call.completed")).toBe(false);
    expect(isSessionStatus(undefined)).toBe(false);
  });

  it("does not allow a terminal session to reopen", () => {
    expect(getAllowedPreviousStatuses("connected")).not.toContain("ended");
    expect(getAllowedPreviousStatuses("ringing")).not.toContain("failed");
    expect(getAllowedPreviousStatuses("ended")).toContain("connected");
  });

  it("keeps session updates scoped to the current workspace and operator", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "app", "api", "telephony", "telnyx", "session", "route.ts"),
      "utf8",
    );

    expect(source).toContain('.eq("workspace_id", context.workspaceId)');
    expect(source).toContain('.eq("operator_id", context.userId)');
    expect(source).toContain('.in("status", getAllowedPreviousStatuses(status))');
  });
});
