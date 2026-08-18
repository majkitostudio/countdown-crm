import "server-only";

import type { Database } from "@/lib/supabase/types";
import { DataAccessError } from "@/lib/dal/errors";
import { createDataClient } from "@/lib/dal/db";
import { requireWorkspaceContext, requireWorkspaceRole } from "@/lib/dal/workspace";

type ObjectionRow = Database["public"]["Tables"]["objections"]["Row"];

export type ObjectionDTO = Pick<
  ObjectionRow,
  "id" | "workspace_id" | "product_id" | "objection_title" | "rebuttal_args" | "created_at"
>;

export interface ObjectionInput {
  product_id?: string | null;
  objection_title: string;
  rebuttal_args: string[];
}

const OBJECTION_SELECT =
  "id, workspace_id, product_id, objection_title, rebuttal_args, created_at";

function validateInput(input: ObjectionInput): ObjectionInput {
  const objection_title = input.objection_title.trim();
  const rebuttal_args = input.rebuttal_args
    .map((argument) => argument.trim())
    .filter(Boolean);

  if (!objection_title || objection_title.length > 500) {
    throw new DataAccessError("VALIDATION", "Objection title must be between 1 and 500 characters.");
  }

  if (rebuttal_args.length === 0 || rebuttal_args.some((argument) => argument.length > 1000)) {
    throw new DataAccessError(
      "VALIDATION",
      "Add at least one rebuttal argument, each no longer than 1,000 characters."
    );
  }

  return {
    product_id: input.product_id || null,
    objection_title,
    rebuttal_args,
  };
}

async function assertProductInWorkspace(productId: string | null | undefined, workspaceId: string) {
  if (!productId) return;

  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw new DataAccessError("DATABASE", "Unable to verify the selected product.");
  }

  if (!data) {
    throw new DataAccessError("VALIDATION", "The selected product is not in this workspace.");
  }
}

export async function listObjectionsForWorkspace(options: {
  workspaceId?: string;
  productId?: string;
} = {}): Promise<ObjectionDTO[]> {
  const { workspaceId } = await requireWorkspaceContext(options.workspaceId);
  const supabase = await createDataClient();

  let query = supabase
    .from("objections")
    .select(OBJECTION_SELECT)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (options.productId) {
    query = query.eq("product_id", options.productId);
  }

  const { data, error } = await query;
  if (error) {
    throw new DataAccessError("DATABASE", "Unable to load objection cards.");
  }

  return (data || []) as ObjectionDTO[];
}

export async function createObjectionForWorkspace(
  input: ObjectionInput,
  requestedWorkspaceId?: string
): Promise<ObjectionDTO> {
  const { workspaceId } = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);
  const validated = validateInput(input);
  await assertProductInWorkspace(validated.product_id, workspaceId);

  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("objections")
    .insert({
      workspace_id: workspaceId,
      product_id: validated.product_id,
      objection_title: validated.objection_title,
      rebuttal_args: validated.rebuttal_args,
    })
    .select(OBJECTION_SELECT)
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Unable to create the objection card.");
  }

  return data as ObjectionDTO;
}

export async function updateObjectionForWorkspace(
  id: string,
  input: ObjectionInput,
  requestedWorkspaceId?: string
): Promise<ObjectionDTO> {
  const { workspaceId } = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);
  const validated = validateInput(input);
  await assertProductInWorkspace(validated.product_id, workspaceId);

  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("objections")
    .update({
      product_id: validated.product_id,
      objection_title: validated.objection_title,
      rebuttal_args: validated.rebuttal_args,
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select(OBJECTION_SELECT)
    .maybeSingle();

  if (error) {
    throw new DataAccessError("DATABASE", "Unable to update the objection card.");
  }

  if (!data) {
    throw new DataAccessError("NOT_FOUND", "Objection card not found in this workspace.");
  }

  return data as ObjectionDTO;
}

export async function deleteObjectionForWorkspace(
  id: string,
  requestedWorkspaceId?: string
): Promise<void> {
  const { workspaceId } = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("objections")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new DataAccessError("DATABASE", "Unable to delete the objection card.");
  }

  if (!data) {
    throw new DataAccessError("NOT_FOUND", "Objection card not found in this workspace.");
  }
}
