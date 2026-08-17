"use server";

import {
  createAuditLogForWorkspace,
  listAuditLogsForWorkspace,
} from "@/lib/dal/audit";
import type {
  AuditLogDTO,
  CreateAuditLogInput,
} from "@/lib/dal/audit";

export async function listAuditLogsAction(): Promise<AuditLogDTO[]> {
  return listAuditLogsForWorkspace();
}

export async function createAuditLogAction(
  input: CreateAuditLogInput
): Promise<AuditLogDTO> {
  return createAuditLogForWorkspace(input);
}
