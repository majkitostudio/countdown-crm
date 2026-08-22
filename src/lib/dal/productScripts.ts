import "server-only";

import type { Database } from "@/lib/supabase/types";
import { createDataClient } from "@/lib/dal/db";
import { DataAccessError } from "@/lib/dal/errors";
import { requireWorkspaceContext, requireWorkspaceRole } from "@/lib/dal/workspace";
import { validateScriptHtml } from "@/lib/scriptContent";

type ProductScriptRow = Database["public"]["Tables"]["product_scripts"]["Row"];

export type ProductScriptDTO = Pick<
  ProductScriptRow,
  "id" | "workspace_id" | "product_id" | "content_html" | "updated_by" | "created_at" | "updated_at"
>;

const SCRIPT_SELECT =
  "id, workspace_id, product_id, content_html, updated_by, created_at, updated_at";

function mapProductScript(row: ProductScriptRow): ProductScriptDTO {
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

export async function saveProductScriptForWorkspace(
  productId: string,
  contentHtml: string,
  requestedWorkspaceId?: string,
): Promise<ProductScriptDTO> {
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
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("workspace_id", context.workspaceId)
    .maybeSingle();

  if (productError) {
    throw new DataAccessError("DATABASE", "Unable to verify the selected product.");
  }
  if (!product) {
    throw new DataAccessError("NOT_FOUND", "Product not found in this workspace.");
  }

  const { data, error } = await supabase
    .from("product_scripts")
    .upsert(
      {
        workspace_id: context.workspaceId,
        product_id: productId,
        content_html: sanitizedHtml,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,product_id" },
    )
    .select(SCRIPT_SELECT)
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Unable to save the product script.");
  }

  return mapProductScript(data as ProductScriptRow);
}
