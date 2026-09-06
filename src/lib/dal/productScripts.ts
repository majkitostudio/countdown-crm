import "server-only";

import type { Database } from "@/lib/supabase/types";
import { createDataClient } from "@/lib/dal/db";
import { DataAccessError } from "@/lib/dal/errors";
import { requireWorkspaceContext, requireWorkspaceRole } from "@/lib/dal/workspace";
import { buildDefaultScriptHtml, validateScriptHtml } from "@/lib/scriptContent";
import type { Product } from "@/lib/products";

type ProductScriptRow = Database["public"]["Tables"]["product_scripts"]["Row"];
type ProductScriptVersionRow = Database["public"]["Tables"]["product_script_versions"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];

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

export type ScriptSnapshotDTO =
  | {
      source: "published_version";
      productId: string;
      productTitle: string;
      versionId: string;
      versionNumber: number;
      html: string;
      capturedAt: string;
    }
  | {
      source: "built_in_fallback";
      productId: string;
      productTitle: string;
      versionId: null;
      versionNumber: null;
      html: string;
      capturedAt: string;
    }
  | {
      source: "unavailable";
      productId: null;
      productTitle: null;
      versionId: null;
      versionNumber: null;
      html: null;
      capturedAt: string;
    };

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

function mapScriptProduct(row: ProductRow): Product {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    price: Number(row.price),
    currency: row.currency || "USD",
    description: row.description || "",
    image_url: row.image_url || "",
    in_stock: row.in_stock ?? true,
    created_at: row.created_at,
  };
}

export async function resolveCallScriptSnapshot(
  productId: string | null,
  workspaceId: string,
): Promise<ScriptSnapshotDTO> {
  const capturedAt = new Date().toISOString();
  if (productId === null) {
    return {
      source: "unavailable",
      productId: null,
      productTitle: null,
      versionId: null,
      versionNumber: null,
      html: null,
      capturedAt,
    };
  }
  if (!productId.trim()) {
    throw new DataAccessError("VALIDATION", "Product ID is required when a call script is shown.");
  }

  const supabase = await createDataClient();
  const { data: productData, error: productError } = await supabase
    .from("products")
    .select("id, workspace_id, title, category, price, currency, description, image_url, in_stock, created_at")
    .eq("workspace_id", workspaceId)
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    throw new DataAccessError("DATABASE", "Unable to verify the call script product.");
  }
  if (!productData) {
    throw new DataAccessError("NOT_FOUND", "Product is not available in this workspace.");
  }

  const product = mapScriptProduct(productData as ProductRow);
  const { data: versionData, error: versionError } = await supabase
    .from("product_script_versions")
    .select("id, version_number, content_html")
    .eq("workspace_id", workspaceId)
    .eq("product_id", productId)
    .eq("status", "published")
    .maybeSingle();

  if (versionError) {
    throw new DataAccessError("DATABASE", "Unable to load the published call script.");
  }

  if (versionData) {
    let html: string;
    try {
      html = validateScriptHtml(versionData.content_html);
    } catch {
      throw new DataAccessError("DATABASE", "The published call script contains invalid content.");
    }
    return {
      source: "published_version",
      productId: product.id,
      productTitle: product.title,
      versionId: versionData.id,
      versionNumber: versionData.version_number,
      html,
      capturedAt,
    };
  }

  return {
    source: "built_in_fallback",
    productId: product.id,
    productTitle: product.title,
    versionId: null,
    versionNumber: null,
    html: buildDefaultScriptHtml(product),
    capturedAt,
  };
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
