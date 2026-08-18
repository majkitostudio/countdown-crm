import "server-only";

import type { Database } from "@/lib/supabase/types";
import { createDataClient } from "./db";
import { DataAccessError } from "./errors";
import { requireWorkspaceRole } from "./workspace";

type TrainingSessionRow = Database["public"]["Tables"]["training_sessions"]["Row"];
type TrainingTurnRow = Database["public"]["Tables"]["training_session_turns"]["Row"];

export interface TrainingSessionReview extends TrainingSessionRow {
  operator_name: string;
  operator_email: string;
  turn_count: number;
}

export interface TrainingSessionReviewDetail extends TrainingSessionReview {
  turns: TrainingTurnRow[];
}

async function getOperatorProfiles(
  operatorIds: string[]
): Promise<Map<string, { full_name: string; email: string }>> {
  if (operatorIds.length === 0) return new Map();

  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", operatorIds);

  if (error) {
    throw new DataAccessError("DATABASE", "Training operator lookup failed");
  }

  return new Map((data || []).map((profile) => [profile.id, { full_name: profile.full_name, email: profile.email }]));
}

export async function getTrainingSessionReviews(): Promise<TrainingSessionReview[]> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"]);
  const supabase = await createDataClient();
  const { data: sessions, error: sessionsError } = await supabase
    .from("training_sessions")
    .select("*")
    .eq("workspace_id", context.workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (sessionsError) {
    throw new DataAccessError("DATABASE", "Training sessions could not be loaded");
  }

  const sessionRows = (sessions || []) as TrainingSessionRow[];
  const sessionIds = sessionRows.map((session) => session.id);
  const operatorProfiles = await getOperatorProfiles(sessionRows.map((session) => session.operator_id));
  const turnCounts = new Map<string, number>();

  if (sessionIds.length > 0) {
    const { data: turns, error: turnsError } = await supabase
      .from("training_session_turns")
      .select("session_id")
      .in("session_id", sessionIds);

    if (turnsError) {
      throw new DataAccessError("DATABASE", "Training transcript counts could not be loaded");
    }

    for (const turn of turns || []) {
      turnCounts.set(turn.session_id, (turnCounts.get(turn.session_id) || 0) + 1);
    }
  }

  return sessionRows.map((session) => {
    const operator = operatorProfiles.get(session.operator_id);
    return {
      ...session,
      operator_name: operator?.full_name || "Unknown operator",
      operator_email: operator?.email || "",
      turn_count: turnCounts.get(session.id) || 0,
    };
  });
}

export async function getTrainingSessionReview(
  sessionId: string
): Promise<TrainingSessionReviewDetail | null> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"]);
  const supabase = await createDataClient();
  const { data: session, error: sessionError } = await supabase
    .from("training_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("workspace_id", context.workspaceId)
    .maybeSingle();

  if (sessionError) {
    throw new DataAccessError("DATABASE", "Training session could not be loaded");
  }
  if (!session) return null;

  const { data: turns, error: turnsError } = await supabase
    .from("training_session_turns")
    .select("*")
    .eq("session_id", session.id)
    .eq("workspace_id", context.workspaceId)
    .order("sequence_number", { ascending: true });

  if (turnsError) {
    throw new DataAccessError("DATABASE", "Training transcript could not be loaded");
  }

  const operatorProfiles = await getOperatorProfiles([session.operator_id]);
  const operator = operatorProfiles.get(session.operator_id);

  return {
    ...(session as TrainingSessionRow),
    operator_name: operator?.full_name || "Unknown operator",
    operator_email: operator?.email || "",
    turn_count: turns?.length || 0,
    turns: (turns || []) as TrainingTurnRow[],
  };
}
