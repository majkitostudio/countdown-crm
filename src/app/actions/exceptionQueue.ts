"use server";

import {
  listTeamLeaderExceptions,
  resolveException,
  snoozeException,
} from "@/lib/dal/exceptionQueue";
import type { ExceptionActionSourceRow, ExceptionQueueDTO } from "@/lib/dal/exceptionQueue";

export async function listTeamLeaderExceptionsAction(): Promise<ExceptionQueueDTO> {
  return listTeamLeaderExceptions();
}

export async function resolveExceptionAction(
  exceptionId: string,
  resolution: string,
): Promise<ExceptionActionSourceRow> {
  return resolveException(exceptionId, resolution);
}

export async function snoozeExceptionAction(
  exceptionId: string,
  until: string,
  reason: string,
): Promise<ExceptionActionSourceRow> {
  return snoozeException(exceptionId, until, reason);
}
