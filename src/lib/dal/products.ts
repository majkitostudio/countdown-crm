import "server-only";

import type { Database } from "@/lib/supabase/types";
import { createDataClient } from "@/lib/dal/db";
import { DataAccessError } from "@/lib/dal/errors";
import { requireWorkspaceContext, requireWorkspaceRole } from "@/lib/dal/workspace";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];

export type ProductCategory = ProductRow["category"];

export type ProductDTO = Pick<
  ProductRow,
  | "id"
  | "workspace_id"
  | "title"
  | "category"
  | "price"
  | "currency"
  | "description"
  | "image_url"
  | "in_stock"
  | "created_at"
>;

export interface ProductInput {
  title: string;
  category: ProductCategory;
  price: number;
  currency?: string;
  description?: string | null;
  image_url?: string | null;
  in_stock?: boolean;
}

export interface ProductListOptions {
  workspaceId?: string;
  category?: ProductCategory | "all";
  search?: string;
  inStockOnly?: boolean;
}

const PRODUCT_SELECT =
  "id, workspace_id, title, category, price, currency, description, image_url, in_stock, created_at";

function isProductCategory(value: unknown): value is ProductCategory {
  return value === "supplements" || value === "cosmetics" || value === "electronics";
}

function validateProductInput(input: ProductInput): ProductInput {
  if (!input || typeof input !== "object") {
    throw new DataAccessError("VALIDATION", "Product input is invalid.");
  }

  if (typeof input.title !== "string") {
    throw new DataAccessError("VALIDATION", "Product title is required.");
  }

  if (input.currency !== undefined && typeof input.currency !== "string") {
    throw new DataAccessError("VALIDATION", "Product currency is invalid.");
  }

  if (input.description !== undefined && input.description !== null && typeof input.description !== "string") {
    throw new DataAccessError("VALIDATION", "Product description is invalid.");
  }

  if (input.image_url !== undefined && input.image_url !== null && typeof input.image_url !== "string") {
    throw new DataAccessError("VALIDATION", "Product image URL is invalid.");
  }

  const title = input.title.trim();
  const currency = input.currency?.trim() || "USD";
  const description = input.description?.trim() || null;
  const image_url = input.image_url?.trim() || null;

  if (!title || title.length > 300) {
    throw new DataAccessError("VALIDATION", "Product title must be between 1 and 300 characters.");
  }

  if (!isProductCategory(input.category)) {
    throw new DataAccessError("VALIDATION", "Product category is invalid.");
  }

  if (!Number.isFinite(input.price) || input.price < 0 || input.price > 1_000_000_000) {
    throw new DataAccessError("VALIDATION", "Product price must be a non-negative number.");
  }

  if (currency.length > 10) {
    throw new DataAccessError("VALIDATION", "Product currency is too long.");
  }

  if (description && description.length > 5000) {
    throw new DataAccessError("VALIDATION", "Product description is too long.");
  }

  if (image_url && image_url.length > 2000) {
    throw new DataAccessError("VALIDATION", "Product image URL is too long.");
  }

  if (input.in_stock !== undefined && typeof input.in_stock !== "boolean") {
    throw new DataAccessError("VALIDATION", "Product stock status is invalid.");
  }

  return {
    title,
    category: input.category,
    price: input.price,
    currency,
    description,
    image_url,
    in_stock: input.in_stock ?? true,
  };
}

function mapProduct(row: ProductRow): ProductDTO {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    title: row.title,
    category: row.category,
    price: Number(row.price),
    currency: row.currency || "USD",
    description: row.description,
    image_url: row.image_url,
    in_stock: row.in_stock ?? true,
    created_at: row.created_at,
  };
}

export async function listProductsForWorkspace(
  options: ProductListOptions = {}
): Promise<ProductDTO[]> {
  const { workspaceId } = await requireWorkspaceContext(options.workspaceId);
  const supabase = await createDataClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new DataAccessError("DATABASE", "Unable to load products.");
  }

  let products = ((data || []) as ProductRow[]).map(mapProduct);

  if (options.category && options.category !== "all") {
    products = products.filter((product) => product.category === options.category);
  }

  if (options.inStockOnly) {
    products = products.filter((product) => product.in_stock);
  }

  const search = options.search?.trim().toLowerCase();
  if (search) {
    products = products.filter((product) =>
      [product.title, product.description || "", product.category].some((value) =>
        value.toLowerCase().includes(search)
      )
    );
  }

  return products;
}

export async function createProductForWorkspace(
  input: ProductInput,
  requestedWorkspaceId?: string
): Promise<ProductDTO> {
  const { workspaceId } = await requireWorkspaceRole(["manager", "admin"], requestedWorkspaceId);
  const validated = validateProductInput(input);
  const supabase = await createDataClient();

  const { data, error } = await supabase
    .from("products")
    .insert({ workspace_id: workspaceId, ...validated })
    .select(PRODUCT_SELECT)
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Unable to create the product.");
  }

  return mapProduct(data as ProductRow);
}

export async function updateProductForWorkspace(
  id: string,
  input: Partial<ProductInput>,
  requestedWorkspaceId?: string
): Promise<ProductDTO> {
  const { workspaceId } = await requireWorkspaceRole(["manager", "admin"], requestedWorkspaceId);

  if (!id.trim()) {
    throw new DataAccessError("VALIDATION", "Product ID is required.");
  }

  const candidate: ProductInput = {
    title: input.title ?? "Existing product",
    category: input.category ?? "supplements",
    price: input.price ?? 0,
    currency: input.currency,
    description: input.description,
    image_url: input.image_url,
    in_stock: input.in_stock,
  };
  const validated = validateProductInput(candidate);
  const payload = Object.fromEntries(
    Object.entries(validated).filter(([key]) => input[key as keyof ProductInput] !== undefined)
  );

  if (Object.keys(payload).length === 0) {
    throw new DataAccessError("VALIDATION", "At least one product field is required.");
  }

  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select(PRODUCT_SELECT)
    .maybeSingle();

  if (error) {
    throw new DataAccessError("DATABASE", "Unable to update the product.");
  }

  if (!data) {
    throw new DataAccessError("NOT_FOUND", "Product not found in this workspace.");
  }

  return mapProduct(data as ProductRow);
}

export async function deleteProductForWorkspace(
  id: string,
  requestedWorkspaceId?: string
): Promise<void> {
  const { workspaceId } = await requireWorkspaceRole(["manager", "admin"], requestedWorkspaceId);

  if (!id.trim()) {
    throw new DataAccessError("VALIDATION", "Product ID is required.");
  }

  const supabase = await createDataClient();
  const { count: orderCount, error: orderError } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("product_id", id);

  if (orderError) {
    throw new DataAccessError("DATABASE", "Unable to verify product order history.");
  }
  if ((orderCount || 0) > 0) {
    throw new DataAccessError(
      "VALIDATION",
      "Product cannot be deleted while it is referenced by order history. Reassign those orders first."
    );
  }

  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new DataAccessError("DATABASE", "Unable to delete the product.");
  }
  if (!data) {
    throw new DataAccessError("NOT_FOUND", "Product not found in this workspace.");
  }
}
