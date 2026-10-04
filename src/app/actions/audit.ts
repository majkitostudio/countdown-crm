"use server";

import {
  createAuditLogForWorkspace,
  listAuditLogsForWorkspace,
} from "@/lib/dal/audit";
import type {
  AuditLogDTO,
  CreateAuditLogInput,
} from "@/lib/dal/audit";

import { isDataAccessError } from "@/lib/dal/errors";

export async function listAuditLogsAction(): Promise<AuditLogDTO[]> {
  try {
    return await listAuditLogsForWorkspace();
  } catch (error) {
    if (isDataAccessError(error) && error.code === "FORBIDDEN") {
      return [];
    }
    throw error;
  }
}

export async function createAuditLogAction(
  input: CreateAuditLogInput
): Promise<AuditLogDTO> {
  return createAuditLogForWorkspace(input);
}
