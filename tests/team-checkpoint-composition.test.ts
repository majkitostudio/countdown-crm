import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const assistance = readFileSync("src/components/team/TeamAssistancePanel.tsx", "utf8");
const checkpoint = readFileSync("src/components/team/TeamDailyCheckpointPanel.tsx", "utf8");
const detail = readFileSync("src/components/team/TeamOperatorDetailPanel.tsx", "utf8");
const handover = readFileSync("src/components/team/TeamCheckpointHandoverPanel.tsx", "utf8");
const content = readFileSync("src/components/team/TeamPageContent.tsx", "utf8");
const workspaceDal = readFileSync("src/lib/dal/teamWorkspace.ts", "utf8");

describe("team checkpoint composition (approved Macaly layout, app design language)", () => {
  it("keeps the existing assistance contract and adds the 5-minute attention threshold", () => {
    expect(assistance).toContain("Co vyžaduje pozornost");
    expect(assistance).toContain("Přebírám");
    expect(assistance).toContain("Vyřešeno");
    expect(assistance).toContain("ASSISTANCE_WAIT_THRESHOLD_MS");
    expect(assistance).toContain("déle než 5 min");
  });

  it("makes operator result rows open a detail without changing the orders view", () => {
    expect(checkpoint).toContain("onSelectOperator");
    expect(checkpoint).toContain("rozklikne detail");
    expect(checkpoint).toContain("Detail operátora");
  });

  it("shows operator detail only from the existing checkpoint read model", () => {
    expect(detail).toContain("Zpět na checkpoint");
    expect(detail).toContain("Kvalita hovorů");
    expect(detail).not.toContain("posledních 10");
    expect(detail).not.toContain("Posledních 10");
  });

  it("hands over the shift as a read-only summary without a fake completion workflow", () => {
    expect(handover).toContain("Konec směny");
    expect(handover).toContain("přenáší");
    expect(handover).toContain("Otevřít Callbacky a týmovou frontu");
    expect(handover).not.toContain("Dokončit checkpoint");
  });

  it("wires detail and handover into the checkpoint tab", () => {
    expect(content).toContain("TeamOperatorDetailPanel");
    expect(content).toContain("TeamCheckpointHandoverPanel");
    expect(content).toContain("selectedOperatorId");
  });

  it("uses no decorative colors outside the shared semantic tones", () => {
    for (const source of [assistance, checkpoint, detail, handover]) {
      expect(source).not.toContain("emerald");
      expect(source).not.toContain("text-sky");
      expect(source).not.toContain("bg-sky");
      expect(source).not.toContain("text-rose");
      expect(source).not.toContain("bg-rose");
    }
  });
});

describe("team checkpoint follow-ups (recent calls and upcoming callbacks)", () => {
  it("derives operator recent calls from the team-scoped checkpoint read model", () => {
    expect(workspaceDal).toContain("recentCallsByOperator");
    expect(workspaceDal).toContain("TEAM_WORKSPACE_RECENT_CALLS_PER_OPERATOR");
    expect(workspaceDal).toContain("duration_seconds");
    expect(detail).toContain("Poslední hovory");
    expect(detail).toContain("/calls/${call.id}/review");
    expect(detail).not.toContain("posledních 10");
    expect(detail).not.toContain("Posledních 10");
    expect(content).toContain("recentCallsByOperator[selectedOperatorId]");
  });

  it("reports upcoming callbacks in the period without fabricating them", () => {
    expect(workspaceDal).toContain("upcomingCallbacks");
    expect(workspaceDal).toContain("mapUpcomingCallbacks");
    expect(checkpoint).toContain("Naplánované v období");
    expect(handover).toContain("naplánované");
  });
});
