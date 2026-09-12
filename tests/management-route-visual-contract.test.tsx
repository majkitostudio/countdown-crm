import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getButtonClassName } from "@/components/ui/Button";
import { getMetricValueClassName } from "@/components/ui/MetricCard";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("management route visual contract", () => {
  it("keeps default metrics neutral and destructive controls on the shared danger recipe", () => {
    expect(getMetricValueClassName("neutral")).toBe("text-zinc-100");
    expect(getMetricValueClassName("success")).toBe("text-emerald-200");
    expect(getButtonClassName("danger")).toContain("bg-rose-950/20");
    expect(getButtonClassName("danger")).toContain("text-rose-200");
  });

  it("uses shared surfaces for management unavailable states and wallet metrics", () => {
    const readiness = source("src/app/readiness/page.tsx");
    const team = source("src/app/team/page.tsx");
    const telephony = source("src/app/telephony/page.tsx");
    const wallet = source("src/app/wallet/page.tsx");

    expect(readiness).toContain('import { Surface } from "@/components/ui/Surface"');
    expect(readiness).toContain('variant="empty"');
    expect(team).toContain('import { Surface } from "@/components/ui/Surface"');
    expect(team).toContain('variant="empty"');
    expect(telephony).toContain('import { Surface } from "@/components/ui/Surface"');
    expect(telephony).toContain('variant="empty"');
    expect(wallet).toContain('import { MetricCard } from "@/components/ui/MetricCard"');
    expect(wallet).toContain('import { StatusAlert } from "@/components/ui/Status"');
  });

  it("keeps unavailable wallet amounts neutral instead of implying a financial outcome", () => {
    const wallet = source("src/app/wallet/page.tsx");

    expect(wallet).toContain('const creditsTone = totalCredits === null ? "neutral" : "success";');
    expect(wallet).toContain('const debitsTone = totalDebits === null ? "neutral" : "danger";');
    expect(wallet).toContain('valueTone={creditsTone}');
    expect(wallet).toContain('valueTone={debitsTone}');
  });

  it("uses the common action and feedback recipes inside administrative panels", () => {
    const members = source("src/components/team/TeamMembersPanel.tsx");
    const queue = source("src/components/team/TeamQueuePanel.tsx");
    const walletManager = source("src/components/wallet/WalletManagerPanel.tsx");

    for (const panel of [members, queue, walletManager]) {
      expect(panel).toContain('import { Button } from "@/components/ui/Button"');
      expect(panel).toContain('import { StatusAlert } from "@/components/ui/Status"');
      expect(panel).toContain('import { Surface } from "@/components/ui/Surface"');
    }
  });

  it("keeps telephony administration on the shared metric, surface, action, and feedback recipes", () => {
    const telephony = source("src/components/telephony/TelephonyAdminPanel.tsx");

    expect(telephony).toContain('import { Button } from "@/components/ui/Button"');
    expect(telephony).toContain('import { MetricCard } from "@/components/ui/MetricCard"');
    expect(telephony).toContain('import { StatusAlert } from "@/components/ui/Status"');
    expect(telephony).toContain('import { Surface } from "@/components/ui/Surface"');
    expect(telephony).toContain('status?.asterisk === "Unavailable" ? "danger" : "neutral"');
  });

  it("announces neutral analytics loading and empty states without interrupting assistive technology", () => {
    const analytics = source("src/app/analytics/page.tsx");

    expect(analytics).toContain('<StatusAlert tone="neutral" role="status">Loading workspace analytics...</StatusAlert>');
    expect(analytics).toContain('<StatusAlert tone="neutral" role="status">No persisted calls or completed-order activity is available for this workspace yet.</StatusAlert>');
    expect(analytics).toContain('const resultTone = result?.ok === false && result.code === "FORBIDDEN" ? "neutral" : "danger";');
  });

  it("keeps the product catalog on shared action, metric, surface, and feedback recipes", () => {
    const products = source("src/app/products/page.tsx");

    expect(products).toContain('import { Button } from "@/components/ui/Button"');
    expect(products).toContain('import { MetricCard } from "@/components/ui/MetricCard"');
    expect(products).toContain('import { StatusAlert } from "@/components/ui/Status"');
    expect(products).toContain('import { Surface } from "@/components/ui/Surface"');
  });
});
