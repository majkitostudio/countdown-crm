import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getMetricValueClassName } from "@/components/ui/MetricCard";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("CRM color hierarchy", () => {
  it("uses subdued shared status badges instead of saturated card-like fills", () => {
    const pageHeader = source("src/components/layout/PageHeader.tsx");

    expect(pageHeader).toContain('success: "border-emerald-800/50 bg-emerald-950/20 text-emerald-200/90"');
    expect(pageHeader).toContain('warning: "border-amber-800/50 bg-amber-950/20 text-amber-200/90"');
  });

  it("keeps ordinary workspace context neutral", () => {
    const globalStyles = source("src/app/globals.css");
    const brief = source("src/components/workspace/ConversationBriefCard.tsx");
    const profile = source("src/components/workspace/ClientProfileCard.tsx");
    const callback = source("src/components/workspace/CallbackScheduleModal.tsx");
    const drawer = source("src/components/calls/CallDetailDrawer.tsx");
    const review = source("src/components/calls/CallReviewWorkspace.tsx");

    expect(globalStyles).toContain("color: rgba(161, 161, 170, 0.85);");
    expect(brief).toContain('className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 shadow-sm"');
    expect(brief).toContain('className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3"');
    expect(profile).toContain('border border-zinc-800 bg-zinc-900 text-zinc-200');
    expect(profile).toContain('className="h-full rounded-full bg-zinc-500"');
    expect(callback).toContain('className="rounded-lg bg-zinc-900 p-2 text-zinc-300"');
    expect(drawer).toContain('border border-zinc-700 bg-zinc-900');
    expect(drawer).toContain('text-zinc-200 hover:bg-zinc-800');
    expect(review).toContain('border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-300');
    expect(getMetricValueClassName()).toBe("text-zinc-100");
  });

  it("keeps Call Outcome selection visually meaningful", () => {
    const controls = source("src/components/workspace/OperatorCallControls.tsx");

    expect(controls).toContain("border-sky-300 bg-sky-950/60 text-sky-100");
  });
});
