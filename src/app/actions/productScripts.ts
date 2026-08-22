"use server";

import {
  getProductScriptForWorkspace,
  listProductScriptsForWorkspace,
  saveProductScriptForWorkspace,
} from "@/lib/dal/productScripts";
import type { ProductScriptDTO } from "@/lib/dal/productScripts";

export async function listProductScriptsAction(
  workspaceId?: string,
): Promise<ProductScriptDTO[]> {
  return listProductScriptsForWorkspace(workspaceId);
}

export async function getProductScriptAction(
  productId: string,
  workspaceId?: string,
): Promise<ProductScriptDTO | null> {
  return getProductScriptForWorkspace(productId, workspaceId);
}

export async function saveProductScriptAction(
  productId: string,
  contentHtml: string,
  workspaceId?: string,
): Promise<ProductScriptDTO> {
  return saveProductScriptForWorkspace(productId, contentHtml, workspaceId);
}
