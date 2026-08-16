"use server";

import {
  createObjectionForWorkspace,
  deleteObjectionForWorkspace,
  listObjectionsForWorkspace,
  updateObjectionForWorkspace,
  type ObjectionInput,
} from "@/lib/dal/objections";

export async function listObjectionsAction(options?: {
  workspaceId?: string;
  productId?: string;
}) {
  return listObjectionsForWorkspace(options);
}

export async function createObjectionAction(input: ObjectionInput, workspaceId?: string) {
  return createObjectionForWorkspace(input, workspaceId);
}

export async function updateObjectionAction(
  id: string,
  input: ObjectionInput,
  workspaceId?: string
) {
  return updateObjectionForWorkspace(id, input, workspaceId);
}

export async function deleteObjectionAction(id: string, workspaceId?: string) {
  return deleteObjectionForWorkspace(id, workspaceId);
}
