"use server";

import { INDUSTRY_BLUEPRINTS } from "@/lib/blueprints/registry";
import type { IndustryCategory } from "@/lib/blueprints/types";
import { createDataClient } from "@/lib/dal/db";
import { DataAccessError } from "@/lib/dal/errors";
import { requireWorkspaceRole, requireWorkspaceContext } from "@/lib/dal/workspace";

function isIndustryCategory(value: unknown): value is IndustryCategory {
  return INDUSTRY_BLUEPRINTS.some((blueprint) => blueprint.id === value);
}

export async function applyBlueprintAction(blueprintId: IndustryCategory) {
  const { workspaceId } = await requireWorkspaceRole(["team_leader", "administrator"]);
  const blueprint = INDUSTRY_BLUEPRINTS.find((candidate) => candidate.id === blueprintId);
  if (!blueprint) {
    throw new DataAccessError("VALIDATION", "Unknown industry blueprint.");
  }

  const supabase = await createDataClient();
  const { data, error } = await supabase.rpc("apply_blueprint_for_workspace", {
    p_workspace_id: workspaceId,
    p_blueprint_id: blueprint.id,
    p_attributes: blueprint.customAttributes,
    p_workflows: blueprint.defaultWorkflowRules,
  } as never);

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Unable to persist the industry blueprint.");
  }

  const result = Array.isArray(data) ? data[0] : data;
  const attributesApplied = Number(result?.attributes_applied);
  const rulesApplied = Number(result?.rules_applied);
  if (!Number.isInteger(attributesApplied) || !Number.isInteger(rulesApplied)) {
    throw new DataAccessError("DATABASE", "Blueprint persistence returned an invalid result.");
  }

  return {
    blueprintId: blueprint.id,
    attributesApplied,
    rulesApplied,
  };
}

export async function getActiveBlueprintAction(): Promise<IndustryCategory | null> {
  const { workspaceId } = await requireWorkspaceContext();
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("workspace_blueprint_state" as never)
    .select("blueprint_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw new DataAccessError("DATABASE", "Unable to load the active industry blueprint.");
  }

  const blueprintRow = data as unknown as { blueprint_id?: unknown } | null;
  return isIndustryCategory(blueprintRow?.blueprint_id) ? blueprintRow.blueprint_id : null;
}
