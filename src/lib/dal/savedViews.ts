import "server-only";

import { DataAccessError } from "@/lib/dal/errors";
import { createDataClient } from "@/lib/dal/db";
import { requireWorkspaceRole } from "@/lib/dal/workspace";
import { FAIL_REASON_OPTIONS } from "@/lib/postCall";

export const SAVED_VIEW_TYPE_QUALITY = "quality";

const QUALITY_STATUS_VALUES = ["all", "review", "unavailable", "ok", "pending"] as const;
const QUALITY_SIGNAL_VALUES = ["all", "missing_note", "short_note", "short_call", "missing_fail_reason"] as const;
const QUALITY_OUTCOME_VALUES = ["all", "sale", "successful_review", "fail"] as const;
const QUALITY_SEARCH_MAX_LENGTH = 120;

export type QualityReviewFilters = {
  status: string;
  signal: string;
  outcome: string;
  failReason: string;
  search: string;
};

export interface SavedQualityView {
  id: string;
  name: string;
  filters: QualityReviewFilters;
}

interface SavedViewRow {
  id: string;
  name: string;
  filters: QualityReviewFilters;
}

const SAVED_VIEWS_SELECT = "id, name, filters";

export function validateQualityViewInput(input: {
  name: unknown;
  filters: unknown;
}): asserts input is { name: string; filters: QualityReviewFilters } {
  if (
    !input
    || typeof input !== "object"
    || typeof input.name !== "string"
    || input.name.trim().length === 0
    || input.name.trim().length > 60
  ) {
    throw new DataAccessError("VALIDATION", "Saved view name must be 1–60 characters.");
  }

  const filters = input.filters as Record<string, unknown> | null;
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    throw new DataAccessError("VALIDATION", "Saved view filters are required.");
  }

  const status = filters.status;
  const signal = filters.signal;
  const outcome = filters.outcome;
  const failReason = filters.failReason;
  const search = filters.search;

  if (!QUALITY_STATUS_VALUES.includes(status as never)) {
    throw new DataAccessError("VALIDATION", "Unsupported quality status filter.");
  }
  if (!QUALITY_SIGNAL_VALUES.includes(signal as never)) {
    throw new DataAccessError("VALIDATION", "Unsupported quality signal filter.");
  }
  if (!QUALITY_OUTCOME_VALUES.includes(outcome as never)) {
    throw new DataAccessError("VALIDATION", "Unsupported quality outcome filter.");
  }
  if (
    failReason !== "all"
    && !FAIL_REASON_OPTIONS.some((option) => option.value === failReason)
  ) {
    throw new DataAccessError("VALIDATION", "Unsupported fail reason filter.");
  }
  if (typeof search !== "string" || search.length > QUALITY_SEARCH_MAX_LENGTH) {
    throw new DataAccessError("VALIDATION", "Invalid quality search filter.");
  }
}

function mapSavedView(row: SavedViewRow): SavedQualityView {
  return {
    id: row.id,
    name: row.name,
    filters: {
      status: row.filters.status || "all",
      signal: row.filters.signal || "all",
      outcome: row.filters.outcome || "all",
      failReason: row.filters.failReason || "all",
      search: row.filters.search || "",
    },
  };
}

export async function listSavedQualityViewsForWorkspace(): Promise<SavedQualityView[]> {
  const context = await requireWorkspaceRole(["team_leader", "administrator"]);

  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("workspace_saved_views")
    .select(SAVED_VIEWS_SELECT)
    .eq("workspace_id", context.workspaceId)
    .eq("user_id", context.userId)
    .eq("view_type", SAVED_VIEW_TYPE_QUALITY)
    .order("created_at", { ascending: true });

  if (error) {
    throw new DataAccessError("DATABASE", "Saved views could not be loaded.");
  }

  return (data ?? []).map((row) => mapSavedView(row as SavedViewRow));
}

export async function saveQualityViewForWorkspace(input: {
  name: string;
  filters: QualityReviewFilters;
}): Promise<SavedQualityView> {
  validateQualityViewInput(input);

  const context = await requireWorkspaceRole(["team_leader", "administrator"]);
  const { name, filters } = input;

  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("workspace_saved_views")
    .upsert({
      workspace_id: context.workspaceId,
      user_id: context.userId,
      view_type: SAVED_VIEW_TYPE_QUALITY,
      name: name.trim(),
      filters,
    }, { onConflict: "workspace_id,user_id,view_type,name" })
    .select(SAVED_VIEWS_SELECT)
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Saved view could not be saved.");
  }

  return mapSavedView(data as SavedViewRow);
}

export async function deleteSavedQualityViewForWorkspace(viewId: string): Promise<void> {
  if (!viewId || typeof viewId !== "string" || viewId.trim().length === 0) {
    throw new DataAccessError("VALIDATION", "Saved view id is required.");
  }

  const context = await requireWorkspaceRole(["team_leader", "administrator"]);

  const supabase = await createDataClient();
  const { error, count } = await supabase
    .from("workspace_saved_views")
    .delete({ count: "exact" })
    .eq("id", viewId)
    .eq("workspace_id", context.workspaceId)
    .eq("user_id", context.userId);

  if (error) {
    throw new DataAccessError("DATABASE", "Saved view could not be deleted.");
  }
  if (count === 0) {
    throw new DataAccessError("NOT_FOUND", "Saved view was not found.");
  }
}