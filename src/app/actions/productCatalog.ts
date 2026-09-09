"use server";

import { loadProductCatalog } from "@/lib/dal/productCatalog";
import { requireWorkspaceContext } from "@/lib/dal/workspace";

export async function loadProductCatalogAction() {
  const context = await requireWorkspaceContext();
  return loadProductCatalog(context);
}
