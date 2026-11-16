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
    throw new DataAccessError("VALIDATION", "Údaje produktu nejsou platné. Zkontrolujte je.");
  }

  if (typeof input.title !== "string") {
    throw new DataAccessError("VALIDATION", "Vyplňte název produktu.");
  }

  if (input.currency !== undefined && typeof input.currency !== "string") {
    throw new DataAccessError("VALIDATION", "Zadejte platnou měnu produktu.");
  }

  if (input.description !== undefined && input.description !== null && typeof input.description !== "string") {
    throw new DataAccessError("VALIDATION", "Popis produktu musí obsahovat text.");
  }

  if (input.image_url !== undefined && input.image_url !== null && typeof input.image_url !== "string") {
    throw new DataAccessError("VALIDATION", "Zadejte platnou URL obrázku produktu.");
  }

  const title = input.title.trim();
  const currency = input.currency?.trim().toUpperCase() ?? "CZK";
  const description = input.description?.trim() || null;
  const image_url = input.image_url?.trim() || null;

  if (!title || title.length > 300) {
    throw new DataAccessError("VALIDATION", "Název produktu musí mít 1 až 300 znaků.");
  }

  if (!isProductCategory(input.category)) {
    throw new DataAccessError("VALIDATION", "Vyberte platnou kategorii produktu.");
  }

  if (!Number.isFinite(input.price) || input.price < 0 || input.price > 1_000_000_000) {
    throw new DataAccessError("VALIDATION", "Cena produktu musí být číslo od 0 do 1 000 000 000.");
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new DataAccessError("VALIDATION", "Zadejte třípísmenný kód měny, například CZK nebo EUR.");
  }

  if (description && description.length > 5000) {
    throw new DataAccessError("VALIDATION", "Popis produktu může mít nejvýše 5 000 znaků.");
  }

  if (image_url && image_url.length > 2000) {
    throw new DataAccessError("VALIDATION", "URL obrázku produktu může mít nejvýše 2 000 znaků.");
  }

  if (input.in_stock !== undefined && typeof input.in_stock !== "boolean") {
    throw new DataAccessError("VALIDATION", "Vyberte platný stav dostupnosti produktu.");
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
    currency: row.currency,
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
    throw new DataAccessError("DATABASE", "Produkty se nepodařilo načíst. Zkuste to znovu.");
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
  const { workspaceId } = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);
  const validated = validateProductInput(input);
  const supabase = await createDataClient();

  const { data, error } = await supabase
    .from("products")
    .insert({ workspace_id: workspaceId, ...validated })
    .select(PRODUCT_SELECT)
    .single();

  if (error || !data) {
    throw new DataAccessError("DATABASE", "Produkt se nepodařilo vytvořit. Zkuste to znovu.");
  }

  return mapProduct(data as ProductRow);
}

export async function updateProductForWorkspace(
  id: string,
  input: Partial<ProductInput>,
  requestedWorkspaceId?: string
): Promise<ProductDTO> {
  const { workspaceId } = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);

  if (!id.trim()) {
    throw new DataAccessError("VALIDATION", "Je vyžadováno ID produktu.");
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
    throw new DataAccessError("VALIDATION", "Vyplňte alespoň jedno pole produktu.");
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
    throw new DataAccessError("DATABASE", "Produkt se nepodařilo aktualizovat. Zkuste to znovu.");
  }

  if (!data) {
    throw new DataAccessError("NOT_FOUND", "Produkt nebyl v tomto pracovním prostoru nalezen.");
  }

  return mapProduct(data as ProductRow);
}

export async function deleteProductForWorkspace(
  id: string,
  requestedWorkspaceId?: string
): Promise<void> {
  const { workspaceId } = await requireWorkspaceRole(["team_leader", "administrator"], requestedWorkspaceId);

  if (!id.trim()) {
    throw new DataAccessError("VALIDATION", "Je vyžadováno ID produktu.");
  }

  const supabase = await createDataClient();
  const { count: orderCount, error: orderError } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("product_id", id);

  if (orderError) {
    throw new DataAccessError("DATABASE", "Historii objednávek produktu se nepodařilo ověřit.");
  }
  if ((orderCount || 0) > 0) {
    throw new DataAccessError(
      "VALIDATION",
      "Produkt nelze smazat, dokud na něj odkazuje historie objednávek. Nejprve tyto objednávky přeřaďte."
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
    throw new DataAccessError("DATABASE", "Produkt se nepodařilo smazat. Zkuste to znovu.");
  }
  if (!data) {
    throw new DataAccessError("NOT_FOUND", "Produkt nebyl v tomto pracovním prostoru nalezen.");
  }
}
