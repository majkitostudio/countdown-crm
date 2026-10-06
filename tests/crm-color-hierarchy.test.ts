import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getPageHeaderBadgeClassName } from "@/components/layout/PageHeader";
import { getMetricValueClassName } from "@/components/ui/MetricCard";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("CRM color hierarchy", () => {
  it("uses subdued shared status badges instead of saturated card-like fills", () => {
    expect(getPageHeaderBadgeClassName("success")).toBe("border-status-success-border bg-status-success text-status-success-text");
    expect(getPageHeaderBadgeClassName("warning")).toBe("border-status-warning-border bg-status-warning text-status-warning-text");
  });

  it("keeps ordinary workspace context neutral", () => {
    const globalStyles = source("src/app/globals.css");
    const brief = source("src/components/workspace/ConversationBriefCard.tsx");
    const profile = source("src/components/workspace/ClientProfileCard.tsx");
    const callback = source("src/components/workspace/CallbackScheduleModal.tsx");
    const drawer = source("src/components/calls/CallDetailDrawer.tsx");
    const review = source("src/components/calls/CallReviewWorkspace.tsx");

    expect(globalStyles).toContain("color: rgba(161, 161, 170, 0.85);");
    expect(brief).toContain('import { Surface } from "@/components/ui/Surface"');
    expect(brief).toContain('variant="page"');
    expect(brief).toContain('variant="inset"');
    expect(profile).toContain('border border-zinc-800 bg-zinc-900 text-zinc-200');
    expect(profile).toContain('className="h-full rounded-full bg-zinc-500"');
    expect(callback).toContain('className="rounded-lg bg-zinc-900 p-2 text-zinc-300"');
    expect(drawer).toContain('border border-zinc-700 bg-zinc-900');
    expect(drawer).toContain('text-zinc-200 hover:bg-zinc-800');
    expect(review).toContain('import { Surface } from "@/components/ui/Surface"');
    expect(review).toContain('<Surface variant="inset">');
    expect(getMetricValueClassName()).toBe("text-text-primary");
  });

  it("keeps Call Outcome selection visually meaningful", () => {
    const controls = source("src/components/workspace/OperatorCallControls.tsx");

    expect(controls).toContain("border-sky-300 bg-sky-950/60 text-sky-100");
  });

  it("strictly separates fail alerts from informational training call notes in CallDetailDrawer", () => {
    const drawer = source("src/components/calls/CallDetailDrawer.tsx");

    // Fails use danger, while training notes use info
    expect(drawer).toContain('tone="danger"');
    expect(drawer).toContain('tone={call.record_kind === "training" ? "info" : "neutral"}');
    expect(drawer).toContain('Informace o tréninkovém hovoru');
  });

  it("enforces no decorative emojis across UI components and saved views ('NECHCEME CIRKUS')", () => {
    const filterEngine = source("src/components/views/FilterEngineBar.tsx");
    const ruleBuilder = source("src/components/workflows/RuleBuilderModal.tsx");
    const workspace = source("src/app/workspace/page.tsx");
    const scriptPanel = source("src/components/workspace/ProductScriptPanel.tsx");
    const blueprints = source("src/lib/blueprints/registry.ts");

    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

    expect(emojiRegex.test(filterEngine)).toBe(false);
    expect(emojiRegex.test(ruleBuilder)).toBe(false);
    expect(emojiRegex.test(workspace)).toBe(false);
    expect(emojiRegex.test(blueprints)).toBe(false);

    // No raw checkmark or unicode arrows used as buttons/actions
    expect(ruleBuilder).not.toContain("✓");
    expect(workspace).not.toContain("✕");

    // Script panel uses subdued amber highlight, never neon yellow
    expect(scriptPanel).not.toContain("bg-yellow-300");
    expect(scriptPanel).toContain("bg-amber-500/20");
  });
});

