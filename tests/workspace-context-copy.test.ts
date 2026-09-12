import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const recentContext = readFileSync(resolve(root, "src/components/workspace/RecentContextRow.tsx"), "utf8");
const brief = readFileSync(resolve(root, "src/components/workspace/ConversationBriefCard.tsx"), "utf8");
const outcomeStyles = readFileSync(resolve(root, "src/lib/callOutcomeStyles.ts"), "utf8");
const drawer = readFileSync(resolve(root, "src/components/calls/CallDetailDrawer.tsx"), "utf8");

describe("workspace and call context copy", () => {
  it("uses callback terminology and treats an absent last order as neutral history", () => {
    expect(recentContext).toContain('label="Callback"');
    expect(recentContext).toContain('kind === "order" ? "Never"');
    expect(recentContext).toContain("Callback set");
    expect(brief).toContain('data-testid="conversation-brief-compact"');
    expect(brief).not.toContain("Last order");
  });

  it("keeps callback outcomes and unavailable transcript evidence visually neutral", () => {
    expect(outcomeStyles).toContain('case "followup_scheduled":\n      return "border-zinc');
    expect(drawer).toContain('>Call review</span>');
    expect(drawer).not.toContain("AI Sentiment");
    expect(drawer).toContain('<StatusAlert tone="neutral">');
  });
});
