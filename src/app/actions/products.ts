"use server";

import {
  createProductForWorkspace,
  deleteProductForWorkspace,
  listProductsForWorkspace,
  updateProductForWorkspace,
} from "@/lib/dal/products";
import type {
  ProductDTO,
  ProductInput,
  ProductListOptions,
} from "@/lib/dal/products";

export async function listProductsAction(
  options?: ProductListOptions
): Promise<ProductDTO[]> {
  return listProductsForWorkspace(options);
}

export async function createProductAction(
  input: ProductInput,
  workspaceId?: string
): Promise<ProductDTO> {
  return createProductForWorkspace(input, workspaceId);
}

export async function updateProductAction(
  id: string,
  input: Partial<ProductInput>,
  workspaceId?: string
): Promise<ProductDTO> {
  return updateProductForWorkspace(id, input, workspaceId);
}

export async function deleteProductAction(id: string, workspaceId?: string): Promise<void> {
  return deleteProductForWorkspace(id, workspaceId);
}
