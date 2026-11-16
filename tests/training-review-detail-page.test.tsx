import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrainingSessionReviewDetail } from "@/lib/dal/trainingSessions";

const mocks = vi.hoisted(() => ({
  getTrainingSessionReview: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal/trainingSessions", () => ({
  getTrainingSessionReview: mocks.getTrainingSessionReview,
}));
vi.mock("@/components/training/TrainingHumanReview", () => ({
  TrainingHumanReview: () => null,
}));

import TrainingReviewDetailPage from "@/app/team/reviews/[sessionId]/page";

const session: TrainingSessionReviewDetail = {
  id: "session-1",
  workspace_id: "workspace-1",
  operator_id: "operator-1",
  scenario_id: "scenario-1",
  scenario_title: "Úvodní rozhovor",
  customer_name: "Testovací zákazník",
  target_product: "Testovací produkt",
  status: "completed",
  duration_seconds: 75,
  ai_source: null,
  feedback: [],
  completion_key: null,
  script_snapshot: {},
  started_at: "2026-09-01T10:00:00.000Z",
  completed_at: "2026-09-01T10:01:15.000Z",
  created_at: "2026-09-01T10:00:00.000Z",
  operator_name: "Testovací operátor",
  operator_email: "operator@example.test",
  turn_count: 0,
  turns: [],
  revisions: [],
};

describe("training review detail page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTrainingSessionReview.mockResolvedValue(session);
  });

  it("uses neutral access information on a review visible to authorized roles", async () => {
    const html = renderToStaticMarkup(
      await TrainingReviewDetailPage({
        params: Promise.resolve({ sessionId: session.id }),
      }),
    );

    expect(html).toContain("Kdo může kontrolu zobrazit");
    expect(html).toContain(
      "Kontrolu mohou zobrazit vedoucí týmů a administrátoři ve stejném pracovním prostoru.",
    );
    expect(html).not.toContain(
      "Tato kontrola je dostupná pouze vedoucím týmů a administrátorům ve stejném pracovním prostoru.",
    );
  });
});
