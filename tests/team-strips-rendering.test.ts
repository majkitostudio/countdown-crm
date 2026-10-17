import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TeamLiveOpsStrip } from "@/components/team/TeamLiveOpsStrip";
import { TeamQueueAgingStrip } from "@/components/team/TeamQueueAgingStrip";
import { TeamFailureReasonStrip } from "@/components/team/TeamFailureReasonStrip";
import { buildFailureReasonRanking } from "@/lib/failureReasonRanking";
import type { WorkspaceMemberDTO } from "@/lib/dal/memberships";
import type { OperatorPresenceDTO } from "@/lib/dal/operatorPresence";
import type { QueueItemDTO } from "@/lib/dal/leadQueue";

describe("TeamLiveOpsStrip component rendering", () => {
  it("renders live status metrics when data is provided", () => {
    const operators: WorkspaceMemberDTO[] = [
      { user_id: "op-1", role: "operator", team_id: "team-1" } as unknown as WorkspaceMemberDTO,
      { user_id: "op-2", role: "operator", team_id: "team-1" } as unknown as WorkspaceMemberDTO,
    ];
    const presence: OperatorPresenceDTO[] = [
      { operator_id: "op-1", state: "available", last_heartbeat_at: new Date().toISOString() } as unknown as OperatorPresenceDTO,
      { operator_id: "op-2", state: "in_call", last_heartbeat_at: new Date().toISOString() } as unknown as OperatorPresenceDTO,
    ];

    const html = renderToStaticMarkup(
      React.createElement(TeamLiveOpsStrip, { operators, presence })
    );

    expect(html).toContain("Provoz na lince teď");
    expect(html).toContain("Volní");
    expect(html).toContain("V hovoru");
    expect(html).toContain("Signály všech 2 operátorů v rozsahu jsou aktuální.");
  });

  it("renders a neutral status alert when operators or presence is null", () => {
    const html = renderToStaticMarkup(
      React.createElement(TeamLiveOpsStrip, { operators: null, presence: null })
    );
    expect(html).toContain("Provoz na lince není dostupný.");
  });
});

describe("TeamQueueAgingStrip component rendering", () => {
  it("renders aging buckets when queue items are provided", () => {
    const queueItems: QueueItemDTO[] = [
      {
        id: "item-1",
        state: "available",
        available_at: new Date(Date.now() - 3600 * 1000).toISOString(),
        created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
      } as QueueItemDTO,
    ];

    const html = renderToStaticMarkup(
      React.createElement(TeamQueueAgingStrip, { queueItems })
    );

    expect(html).toContain("Stárnutí fronty");
    expect(html).toContain("Do 24 h");
    expect(html).toContain("1–3 dny");
    expect(html).toContain("3+ dny");
    expect(html).toContain("Nejstarší čeká");
  });

  it("renders a neutral status alert when queueItems is null", () => {
    const html = renderToStaticMarkup(
      React.createElement(TeamQueueAgingStrip, { queueItems: null })
    );
    expect(html).toContain("Stárnutí fronty není dostupné.");
  });
});

describe("TeamFailureReasonStrip component rendering", () => {
  it("renders failure reasons ranking when ranking is provided", () => {
    const ranking = buildFailureReasonRanking([
      { outcome: "objection", failReason: "unsuccessful_sale" },
      { outcome: "objection", failReason: "duplicate" },
    ]);

    const html = renderToStaticMarkup(
      React.createElement(TeamFailureReasonStrip, { ranking, periodLabel: "Dnes" })
    );

    expect(html).toContain("Důvody neúspěchu");
    expect(html).toContain("Neuzavřený obchod");
    expect(html).toContain("ovlivnitelné");
    expect(html).toContain("Duplikát");
    expect(html).toContain("neovlivnitelné");
  });

  it("renders empty state notice when ranking has 0 calls", () => {
    const ranking = buildFailureReasonRanking([]);
    const html = renderToStaticMarkup(
      React.createElement(TeamFailureReasonStrip, { ranking, periodLabel: "Dnes" })
    );

    expect(html).toContain("tým nemá žádné neúspěšné hovory");
    expect(html).toContain("Neexistují žádné záznamy důvodů neúspěchu");
  });

  it("renders a neutral status alert when ranking is null", () => {
    const html = renderToStaticMarkup(
      React.createElement(TeamFailureReasonStrip, { ranking: null })
    );
    expect(html).toContain("Důvody neúspěchu nejsou dostupné.");
  });
});
