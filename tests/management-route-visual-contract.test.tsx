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
});
