/**
 * Stárnutí fronty — jak dlouho už čekají leady, které ještě nikdo nevzal.
 *
 * Čistá funkce nad řádky fronty (bez databáze), aby se dala testovat a použít
 * na serveru i v klientu.
 *
 * „Čeká" je přesně stejná množina jako u souhrnu front oddělení
 * (`DEPARTMENT_QUEUE_WAITING_STATES`, tedy stav `available`), aby na jedné
 * obrazovce nebyla dvě různá čísla pro totéž.
 *
 * Pozor: `available_at` může být i v budoucnosti — recyklace do P4 se plánuje
 * na další den, retence do P3 na 21 dní po doručení. Takové leady ještě
 * nečekají, proto mají vlastní přihrádku (`deferred`) a nezkreslují stáří.
 */

import {
  DEPARTMENT_QUEUE_WAITING_STATES,
  type DepartmentQueueItemState,
} from "@/lib/departmentQueues";

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
export const THREE_DAYS_MS = 3 * DAY_MS;

export interface QueueAgingItemInput {
  state: DepartmentQueueItemState;
  available_at: string;
}

export interface QueueAgingBuckets {
  under24h: number;
  dayTo3: number;
  over3d: number;
}

export interface QueueAgingSummary {
  /** Všechny leady čekající na operátora (stav `available`). */
  waiting: number;
  /** Rozpad čekajících podle stáří; hranice jsou ostré od 24 h a od 72 h. */
  buckets: QueueAgingBuckets;
  /** Leady, kterým čas ještě nenastal (známé i nečitelné časy). */
  deferred: number;
  /** Nejstarší lead, kterému už čas nastal. Null, když nic nečeká. */
  oldest: { availableAt: string; ageMs: number } | null;
}

function isWaitingState(state: DepartmentQueueItemState): boolean {
  return (DEPARTMENT_QUEUE_WAITING_STATES as readonly string[]).includes(state);
}

/**
 * `waiting` se vždy rovná `buckets.under24h + buckets.dayTo3 +
 * buckets.over3d + deferred` — žádná položka se neztrácí ani nepočítá dvakrát.
 */
export function buildQueueAging(
  items: readonly QueueAgingItemInput[],
  now: Date,
): QueueAgingSummary {
  const nowMs = now.getTime();
  const buckets: QueueAgingBuckets = { under24h: 0, dayTo3: 0, over3d: 0 };
  let waiting = 0;
  let deferred = 0;
  let oldestTimestamp: number | null = null;

  for (const item of items) {
    if (!isWaitingState(item.state)) continue;
    waiting += 1;

    const timestamp = Date.parse(item.available_at);
    if (!Number.isFinite(timestamp) || timestamp > nowMs) {
      deferred += 1;
      continue;
    }

    const ageMs = nowMs - timestamp;
    if (ageMs < DAY_MS) buckets.under24h += 1;
    else if (ageMs < THREE_DAYS_MS) buckets.dayTo3 += 1;
    else buckets.over3d += 1;

    if (oldestTimestamp === null || timestamp < oldestTimestamp) {
      oldestTimestamp = timestamp;
    }
  }

  return {
    waiting,
    buckets,
    deferred,
    oldest: oldestTimestamp === null
      ? null
      : { availableAt: new Date(oldestTimestamp).toISOString(), ageMs: nowMs - oldestTimestamp },
  };
}
