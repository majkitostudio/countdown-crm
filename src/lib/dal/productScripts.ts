import "server-only";

import type { Database } from "@/lib/supabase/types";
import { createDataClient } from "@/lib/dal/db";
import { DataAccessError } from "@/lib/dal/errors";
import { requireWorkspaceContext, requireWorkspaceRole } from "@/lib/dal/workspace";
import { validateScriptHtml } from "@/lib/scriptContent";

type ProductScriptRow = Database["public"]["Tables"]["product_scripts"]["Row"];
type ProductScriptVersionRow = Database["public"]["Tables"]["product_script_versions"]["Row"];

export type ProductScriptDTO = Pick<
  ProductScriptRow,
  "id" | "workspace_id" | "product_id" | "content_html" | "updated_by" | "created_at" | "updated_at"
>;

export type ProductScriptVersionDTO = Pick<
  ProductScriptVersionRow,
  | "id"
  | "workspace_id"
  | "product_id"
  | "version_number"
  | "status"
  | "content_html"
  | "created_by"
  | "published_by"
  | "created_at"
  | "published_at"
>;

const SCRIPT_SELECT =
  "id, workspace_id, product_id, content_html, updated_by, created_at, updated_at";
const VERSION_SELECT =
  "id, workspace_id, product_id, version_number, status, content_html, created_by, published_by, created_at, published_at";

function mapProductScript(row: ProductScriptRow): ProductScriptDTO {
  return row;
}

function mapProductScriptVersion(row: ProductScriptVersionRow): ProductScriptVersionDTO {
  return row;
}

export async function listProductScriptsForWorkspace(
  requestedWorkspaceId?: string,
): Promise<ProductScriptDTO[]> {
  const { workspaceId } = await requireWorkspaceContext(requestedWorkspaceId);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("product_scripts")
    .select(SCRIPT_SELECT)
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new DataAccessError("DATABASE", "Unable to load product scripts.");
  }

  return ((data || []) as ProductScriptRow[]).map(mapProductScript);
}

export async function getProductScriptForWorkspace(
  productId: string,
  requestedWorkspaceId?: string,
): Promise<ProductScriptDTO | null> {
  const { workspaceId } = await requireWorkspaceContext(requestedWorkspaceId);
  if (!productId.trim()) {
    throw new DataAccessError("VALIDATION", "Product ID is required.");
  }

  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("product_scripts")
    .select(SCRIPT_SELECT)
    .eq("workspace_id", workspaceId)
    .eq("product_id", productId)
    .maybeSingle();

  if (error) {
    throw new DataAccessError("DATABASE", "Unable to load the product script.");
  }

  return data ? mapProductScript(data as ProductScriptRow) : null;
}

export async function listProductScriptVersionsForWorkspace(
  requestedWorkspaceId?: string,
): Promise<ProductScriptVersionDTO[]> {
  const { workspaceId } = await requireWorkspaceContext(requestedWorkspaceId);
  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("product_script_versions")
    .select(VERSION_SELECT)
    .eq("workspace_id", workspaceId)
    .order("version_number", { ascending: false });

  if (error) {
    throw new DataAccessError("DATABASE", "Unable to load product script versions.");
  }

  return ((data || []) as ProductScriptVersionRow[]).map(mapProductScriptVersion);
}

export async function createProductScriptDraftForWorkspace(
  productId: string,
  contentHtml: string,
  requestedWorkspaceId?: string,
): Promise<ProductScriptVersionDTO> {
  const context = await requireWorkspaceRole(["administrator"], requestedWorkspaceId);
  if (!productId.trim()) {
    throw new DataAccessError("VALIDATION", "Product ID is required.");
  }

  let sanitizedHtml: string;
  try {
    sanitizedHtml = validateScriptHtml(contentHtml);
  } catch {
    throw new DataAccessError(
      "VALIDATION",
      "Script content must be between 1 and 100,000 safe HTML characters.",
    );
  }

  const supabase = await createDataClient();
  const { data, error } = await supabase
    .rpc("create_product_script_draft", {
      p_workspace_id: context.workspaceId,
      p_product_id: productId,
      p_content_html: sanitizedHtml,
    })
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Unable to save the product script draft.");
  }

  return mapProductScriptVersion(data as ProductScriptVersionRow);
}

export async function publishProductScriptVersionForWorkspace(
  versionId: string,
  requestedWorkspaceId?: string,
): Promise<ProductScriptVersionDTO> {
  const context = await requireWorkspaceRole(["administrator"], requestedWorkspaceId);
  if (!versionId.trim()) {
    throw new DataAccessError("VALIDATION", "Version ID is required.");
  }

  const supabase = await createDataClient();
  const { data: version, error: versionError } = await supabase
    .from("product_script_versions")
    .select("id")
    .eq("id", versionId)
    .eq("workspace_id", context.workspaceId)
    .maybeSingle();

  if (versionError) {
    throw new DataAccessError("DATABASE", "Unable to verify the product script version.");
  }
  if (!version) {
    throw new DataAccessError("NOT_FOUND", "Product script version not found in this workspace.");
  }

  const { data, error } = await supabase
    .rpc("publish_product_script_version", { p_version_id: versionId })
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Unable to publish the product script version.");
  }

  return mapProductScriptVersion(data as ProductScriptVersionRow);
}
