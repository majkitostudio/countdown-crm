import "server-only";

export type DataAccessErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "DATABASE";

export class DataAccessError extends Error {
  readonly code: DataAccessErrorCode;

  constructor(code: DataAccessErrorCode, message: string) {
    super(message);
    this.name = "DataAccessError";
    this.code = code;
  }
}

export function isDataAccessError(error: unknown): error is DataAccessError {
  return error instanceof DataAccessError;
}
