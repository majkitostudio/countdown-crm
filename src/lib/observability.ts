/**
 * Countdown CRM — Central Observability & Sanitized Logger
 * 
 * Provides structured logging with automatic PII sanitization to prevent
 * accidental leakage of customer phone numbers, emails, passwords or auth tokens.
 */

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "apikey",
  "api_key",
  "bearer",
  "card_number",
  "cvv",
]);

/**
 * Anonymize or redact sensitive strings
 */
export function sanitizeString(val: string): string {
  // Mask emails (e.g. j***@example.com)
  const emailRegex = /([a-zA-Z0-9_\-.]+)@([a-zA-Z0-9_\-.]+)\.([a-zA-Z]{2,5})/g;
  let masked = val.replace(emailRegex, (_match, user, domain, ext) => {
    const visibleUser = user.slice(0, 1);
    return `${visibleUser}***@${domain}.${ext}`;
  });

  // Mask phone numbers (e.g. +420 777 123 456 -> +420 *** 456)
  const phoneRegex = /(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{3,4}/g;
  masked = masked.replace(phoneRegex, (phone) => {
    const cleaned = phone.replace(/\s+/g, "");
    if (cleaned.length < 6) return phone;
    const tail = cleaned.slice(-4);
    return `***-***-${tail}`;
  });

  return masked;
}

/**
 * Deeply sanitize an arbitrary object or array, stripping secrets and masking PII.
 */
export function sanitizeLogData<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    return sanitizeString(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item)) as unknown as T;
  }

  if (typeof data === "object") {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey)) {
        sanitizedObj[key] = "[REDACTED]";
      } else {
        sanitizedObj[key] = sanitizeLogData(value);
      }
    }
    return sanitizedObj as unknown as T;
  }

  return data;
}

export type LogLevel = "info" | "warn" | "error";

export interface LogContext {
  workspaceId?: string;
  userId?: string;
  component?: string;
  [key: string]: unknown;
}

export const logger = {
  info(message: string, context?: LogContext): void {
    const sanitized = context ? sanitizeLogData(context) : undefined;
    console.info(`[INFO] ${sanitizeString(message)}`, sanitized ?? "");
  },

  warn(message: string, context?: LogContext): void {
    const sanitized = context ? sanitizeLogData(context) : undefined;
    console.warn(`[WARN] ${sanitizeString(message)}`, sanitized ?? "");
  },

  error(message: string, error?: unknown, context?: LogContext): void {
    const sanitizedContext = context ? sanitizeLogData(context) : {};
    const errMessage = error instanceof Error ? error.message : String(error || "");
    const errStack = error instanceof Error ? error.stack : undefined;

    console.error(`[ERROR] ${sanitizeString(message)}: ${sanitizeString(errMessage)}`, {
      ...sanitizedContext,
      ...(errStack ? { stack: errStack.split("\n").slice(0, 5).join("\n") } : {}),
    });
  },
};
