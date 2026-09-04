import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const activity = readFileSync(resolve(process.cwd(), "src/lib/dal/activity.ts"), "utf8");
const calls = readFileSync(resolve(process.cwd(), "src/lib/calls.ts"), "utf8");
const drawer = readFileSync(resolve(process.cwd(), "src/components/calls/CallDetailDrawer.tsx"), "utf8");

describe("post-call Fail read model contract", () => {
  it("keeps Fail details in workspace call DTO mappings", () => {
    expect(activity).toContain("fail_reason: CallRow[\"fail_reason\"];");
    expect(activity).toContain("operator_note: string | null;");
    expect(activity.match(/fail_reason: call\.fail_reason/g)?.length).toBe(3);
    expect(activity.match(/operator_note: call\.operator_note/g)?.length).toBe(3);
  });

  it("keeps Fail details available to call records and their detail view", () => {
    expect(calls).toContain("fail_reason: WorkspaceCallDTO[\"fail_reason\"];");
    expect(calls).toContain("operator_note: WorkspaceCallDTO[\"operator_note\"];");
    expect(drawer).toContain("Fail details");
    expect(drawer).toContain("getFailReasonLabel");
  });
});
