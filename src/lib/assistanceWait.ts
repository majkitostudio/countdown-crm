/** Schválená hranice z Team Checkpoint předlohy: čekání déle než 5 minut vyžaduje pozornost. */
export const ASSISTANCE_WAIT_THRESHOLD_MS = 5 * 60 * 1000;

export function assistanceWaitingMs(createdAt: string, now: number = Date.now()): number {
  return Math.max(0, now - Date.parse(createdAt));
}

export function isAssistanceOverdue(createdAt: string, now: number = Date.now()): boolean {
  return assistanceWaitingMs(createdAt, now) >= ASSISTANCE_WAIT_THRESHOLD_MS;
}

export function formatAssistanceWait(createdAt: string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - Date.parse(createdAt)) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
