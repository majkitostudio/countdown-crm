import "server-only";

import { listObjectionsForWorkspace, type ObjectionDTO } from "@/lib/dal/objections";
import { listOrderProductCountsForWorkspace } from "@/lib/dal/orders";
import { listProductsForWorkspace, type ProductDTO } from "@/lib/dal/products";
import { isDataAccessError } from "@/lib/dal/errors";
import type { WorkspaceContext } from "@/lib/dal/workspace";
import type { Product } from "@/lib/products";

export type ProductCatalogSource<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable"; reason: "database" };

export type ProductCatalogEnrichment<T> =
  | { requested: false; reason: "no_products" | "catalog_unavailable" }
  | { requested: true; source: ProductCatalogSource<T> };

export interface ProductCatalogLoadResult {
  catalog: ProductCatalogSource<Product[]>;
  objections: ProductCatalogEnrichment<ObjectionDTO[]>;
  orderCounts: ProductCatalogEnrichment<Record<string, number>>;
  state: "ready" | "partial" | "unavailable";
  isEmpty: boolean;
}

function mapProduct(product: ProductDTO): Product {
  return {
    id: product.id,
    title: product.title,
    category: product.category,
    price: Number(product.price),
    currency: product.currency || "USD",
    description: product.description || "",
    image_url: product.image_url || "",
    in_stock: product.in_stock ?? true,
    created_at: product.created_at,
  };
}

async function loadSource<T>(read: () => Promise<T>): Promise<ProductCatalogSource<T>> {
  try {
    return { status: "ready", data: await read() };
  } catch (error) {
    if (isDataAccessError(error) && error.code === "DATABASE") {
      return { status: "unavailable", reason: "database" };
    }

    throw error;
  }
}

export async function loadProductCatalog(context: WorkspaceContext): Promise<ProductCatalogLoadResult> {
  const catalog = await loadSource(async () => {
    const products = await listProductsForWorkspace({ workspaceId: context.workspaceId });
    return products.map(mapProduct);
  });

  if (catalog.status === "unavailable") {
    return {
      catalog,
      objections: { requested: false, reason: "catalog_unavailable" },
      orderCounts: { requested: false, reason: "catalog_unavailable" },
      state: "unavailable",
      isEmpty: false,
    };
  }

  if (catalog.data.length === 0) {
    return {
      catalog,
      objections: { requested: false, reason: "no_products" },
      orderCounts: { requested: false, reason: "no_products" },
      state: "ready",
      isEmpty: true,
    };
  }

  const [objectionsSource, orderCountsSource] = await Promise.all([
    loadSource(() => listObjectionsForWorkspace({ workspaceId: context.workspaceId })),
    loadSource(() => listOrderProductCountsForWorkspace(context.workspaceId)),
  ]);

  return {
    catalog,
    objections: { requested: true, source: objectionsSource },
    orderCounts: { requested: true, source: orderCountsSource },
    state: objectionsSource.status === "ready" && orderCountsSource.status === "ready" ? "ready" : "partial",
    isEmpty: false,
  };
}
