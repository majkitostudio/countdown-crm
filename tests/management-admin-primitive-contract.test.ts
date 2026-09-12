import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("management admin primitive contract", () => {
  it("uses shared UI primitives for the remaining management panels", () => {
    const readiness = source("src/components/readiness/WorkspaceReadinessPanel.tsx");
    const scripts = source("src/components/settings/ProductScriptManager.tsx");
    const telephony = source("src/components/settings/TelephonyAdapterSettings.tsx");
    const ruleBuilder = source("src/components/workflows/RuleBuilderModal.tsx");

    expect(readiness).toContain('from "@/components/ui/Surface"');
    expect(readiness).toContain('from "@/components/ui/Button"');
    expect(readiness).toContain('from "@/components/ui/Status"');
    expect(readiness).toContain('from "@/components/ui/MetricCard"');
    expect(scripts).toContain('from "@/components/ui/Surface"');
    expect(scripts).toContain('from "@/components/ui/Button"');
    expect(scripts).toContain('from "@/components/ui/Status"');
    expect(telephony).toContain('from "@/components/ui/Surface"');
    expect(telephony).toContain('from "@/components/ui/Status"');
    expect(ruleBuilder).toContain('from "@/components/ui/Surface"');
    expect(ruleBuilder).toContain('from "@/components/ui/Button"');
  });
});
