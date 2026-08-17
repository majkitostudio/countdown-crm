"use server";

import {
  createRecordForWorkspace,
  deleteSchemaForWorkspace,
  listRecordsForWorkspace,
  listSchemasForWorkspace,
  saveAttributeForWorkspace,
  saveSchemaForWorkspace,
} from "@/lib/dal/schema";
import type { AttributeDefinition, ObjectSchema } from "@/lib/schema/types";

export async function listSchemasAction(workspaceId?: string) {
  return listSchemasForWorkspace(workspaceId);
}

export async function saveSchemaAction(schema: ObjectSchema, workspaceId?: string) {
  return saveSchemaForWorkspace(schema, workspaceId);
}

export async function saveAttributeAction(
  objectSlug: string,
  attribute: AttributeDefinition,
  workspaceId?: string
) {
  return saveAttributeForWorkspace(objectSlug, attribute, workspaceId);
}

export async function deleteSchemaAction(objectSlug: string, workspaceId?: string) {
  return deleteSchemaForWorkspace(objectSlug, workspaceId);
}

export async function listRecordsAction(objectSlug: string, workspaceId?: string) {
  return listRecordsForWorkspace(objectSlug, workspaceId);
}

export async function createRecordAction(
  objectSlug: string,
  values: Record<string, unknown>,
  workspaceId?: string
) {
  return createRecordForWorkspace(objectSlug, values, workspaceId);
}
