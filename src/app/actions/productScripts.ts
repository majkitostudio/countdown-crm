"use server";

import {
  createProductScriptDraftForWorkspace,
  getCallScriptSnapshotForCurrentWorkspace,
  getProductScriptForWorkspace,
  listProductScriptsForWorkspace,
  listProductScriptVersionsForWorkspace,
  publishProductScriptVersionForWorkspace,
} from "@/lib/dal/productScripts";
import type { ProductScriptDTO, ProductScriptVersionDTO, ScriptSnapshotDTO } from "@/lib/dal/productScripts";

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

export async function getCallScriptSnapshotAction(productId: string): Promise<ScriptSnapshotDTO> {
  return getCallScriptSnapshotForCurrentWorkspace(productId);
}

export async function listProductScriptVersionsAction(
  workspaceId?: string,
): Promise<ProductScriptVersionDTO[]> {
  return listProductScriptVersionsForWorkspace(workspaceId);
}

export async function createProductScriptDraftAction(
  productId: string,
  contentHtml: string,
  workspaceId?: string,
): Promise<ProductScriptVersionDTO> {
  return createProductScriptDraftForWorkspace(productId, contentHtml, workspaceId);
}

export async function publishProductScriptVersionAction(
  versionId: string,
  workspaceId?: string,
): Promise<ProductScriptVersionDTO> {
  return publishProductScriptVersionForWorkspace(versionId, workspaceId);
}
