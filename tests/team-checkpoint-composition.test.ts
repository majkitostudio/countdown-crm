import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const assistance = readFileSync("src/components/team/TeamAssistancePanel.tsx", "utf8");
const checkpoint = readFileSync("src/components/team/TeamDailyCheckpointPanel.tsx", "utf8");
const detail = readFileSync("src/components/team/TeamOperatorDetailPanel.tsx", "utf8");
const handover = readFileSync("src/components/team/TeamCheckpointHandoverPanel.tsx", "utf8");
const content = readFileSync("src/components/team/TeamPageContent.tsx", "utf8");
const workspaceDal = readFileSync("src/lib/dal/teamWorkspace.ts", "utf8");
const liveOpsStrip = readFileSync("src/components/team/TeamLiveOpsStrip.tsx", "utf8");
const queueAgingStrip = readFileSync("src/components/team/TeamQueueAgingStrip.tsx", "utf8");
const failureReasons = readFileSync("src/components/team/TeamFailureReasonStrip.tsx", "utf8");

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
    expect(handover).toContain("Otevřít Naplánované hovory a týmovou frontu");
    expect(handover).not.toContain("Dokončit checkpoint");
  });

  it("wires detail and handover into the checkpoint tab", () => {
    expect(content).toContain("TeamOperatorDetailPanel");
    expect(content).toContain("TeamCheckpointHandoverPanel");
    expect(content).toContain("selectedOperatorId");
  });

  it("uses no decorative colors outside the shared semantic tones", () => {
    for (const source of [assistance, checkpoint, detail, handover, liveOpsStrip, queueAgingStrip, failureReasons]) {
      expect(source).not.toContain("emerald");
      expect(source).not.toContain("text-sky");
      expect(source).not.toContain("bg-sky");
      expect(source).not.toContain("text-rose");
      expect(source).not.toContain("bg-rose");
    }
  });
});

describe("team checkpoint operational metrics (live ops, queue aging, failure reasons)", () => {
  it("shows live operator counts on the checkpoint", () => {
    expect(content).toContain("TeamLiveOpsStrip");
    expect(liveOpsStrip).toContain("Provoz na lince teď");
    expect(liveOpsStrip).toContain("Provoz na lince není dostupný.");
  });

  it("shows queue aging on the checkpoint", () => {
    expect(content).toContain("TeamQueueAgingStrip");
    expect(queueAgingStrip).toContain("Stárnutí fronty");
    expect(queueAgingStrip).toContain("Stárnutí fronty není dostupné.");
  });

  it("derives failure reasons from the team-scoped checkpoint read model", () => {
    expect(workspaceDal).toContain("fail_reason");
    expect(workspaceDal).toContain("buildFailureReasonRanking");
    expect(checkpoint).toContain("TeamFailureReasonStrip");
    expect(failureReasons).toContain("Důvody neúspěchu");
    expect(failureReasons).toContain("Důvody neúspěchu nejsou dostupné.");
  });
});

describe("team checkpoint follow-ups (recent calls and upcoming scheduledCalls)", () => {
  it("derives operator recent calls from the team-scoped checkpoint read model", () => {
    expect(workspaceDal).toContain("recentCallsByOperator");
    expect(workspaceDal).toContain("TEAM_WORKSPACE_RECENT_CALLS_PER_OPERATOR");
    expect(workspaceDal).toContain("duration_seconds");
    expect(detail).toContain("Poslední hovory");
    expect(detail).toContain("/call-logs/${call.id}/review");
    expect(detail).not.toContain("posledních 10");
    expect(detail).not.toContain("Posledních 10");
    expect(content).toContain("recentCallsByOperator[selectedOperatorId]");
  });

  it("reports upcoming scheduled calls in the period without fabricating them", () => {
    expect(workspaceDal).toContain("upcomingScheduledCalls");
    expect(workspaceDal).toContain("splitScheduledCallSummaries");
    expect(workspaceDal).toContain("splitScheduledCallsByDue");
    expect(checkpoint).toContain("Naplánované v období");
    expect(handover).toContain("naplánované");
  });
});
