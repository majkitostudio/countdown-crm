"use server";

import {
  createRecordForWorkspace,
  deleteSchemaForWorkspace,
  listRecordsForWorkspace,
  listSchemasForWorkspace,
  saveAttributeForWorkspace,
  saveSchemaForWorkspace,
} from "@/lib/dal/schema";
import { isDataAccessError } from "@/lib/dal/errors";
import type {
  AttributeDefinition,
  CustomObjectActionFailure,
  CustomObjectActionResult,
  CustomObjectPageData,
  ObjectSchema,
} from "@/lib/schema/types";

function mapCustomObjectActionError(error: unknown): CustomObjectActionFailure {
  if (isDataAccessError(error)) {
    switch (error.code) {
      case "UNAUTHORIZED":
        return {
          ok: false,
          code: "UNAUTHORIZED",
          status: 401,
          message: "Custom objects are unavailable until the current workspace session is authenticated.",
        };
      case "FORBIDDEN":
        return {
          ok: false,
          code: "FORBIDDEN",
          status: 403,
          message: "Custom objects are unavailable for your current workspace role.",
        };
      case "NOT_FOUND":
        return {
          ok: false,
          code: "NOT_FOUND",
          status: 404,
          message: "This custom object is unavailable in the current workspace.",
        };
      case "VALIDATION":
        return {
          ok: false,
          code: "VALIDATION",
          status: 422,
          message: "The custom object request is invalid.",
        };
      case "DATABASE":
        break;
    }
  }

  return {
    ok: false,
    code: "UNAVAILABLE",
    status: 503,
    message: "Custom objects are temporarily unavailable. No object data was shown.",
  };
}

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

export async function loadCustomObjectPageAction(
  objectSlug: string
): Promise<CustomObjectActionResult<CustomObjectPageData>> {
  try {
    const [schemas, records] = await Promise.all([
      listSchemasForWorkspace(),
      listRecordsForWorkspace(objectSlug),
    ]);

    return { ok: true, data: { schemas, records } };
  } catch (error) {
    return mapCustomObjectActionError(error);
  }
}

export async function createCustomObjectRecordAction(
  objectSlug: string,
  values: Record<string, unknown>
): Promise<CustomObjectActionResult<Awaited<ReturnType<typeof createRecordForWorkspace>>>> {
  try {
    return { ok: true, data: await createRecordForWorkspace(objectSlug, values) };
  } catch (error) {
    return mapCustomObjectActionError(error);
  }
}
