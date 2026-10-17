/**
 * Souhrn „kdo je právě teď na lince" pro denní checkpoint Team Leadera.
 *
 * Čistá funkce bez přístupu do databáze: dostane operátory v rozsahu a jejich
 * poslední signál a spočítá, kdo může vzít hovor. Signál starší než pět minut
 * se nepočítá jako aktuální — stejné pravidlo jako v panelu „Operator status",
 * aby číslo na dvou místech neznamenalo něco jiného.
 */

export type LiveOpsPresenceState = "offline" | "available" | "break" | "in_call" | "after_call";

/** Po pěti minutách bez signálu operátora nepočítáme jako aktuálně dostupného. */
export const PRESENCE_FRESHNESS_WINDOW_MS = 5 * 60 * 1000;

export interface LiveOpsOperatorInput {
  operatorId: string;
}

export interface LiveOpsPresenceInput {
  operatorId: string;
  state: LiveOpsPresenceState;
  lastHeartbeatAt: string;
}

export interface LiveOpsCounts {
  available: number;
  inCall: number;
  afterCall: number;
  break: number;
  offline: number;
}

export interface LiveOpsSummary {
  /** Všichni operátoři v rozsahu, včetně těch bez záznamu o signálu. */
  total: number;
  counts: LiveOpsCounts;
  /**
   * Kolik operátorů má záznam o signálu, ale ten už je starší než pět minut.
   * Počítají se do „offline“ — jen upozorňujeme, že jde o vyprchavší signál,
   * ne o potvrzené odhlášení.
   */
  staleSignals: number;
  /**
   * Kolik operátorů nemá žádný záznam o signálu. Také se počítají do „offline“,
   * ale je to jiná situace než vyprchavší signál — proto se počítají zvlášť, aby
   * se o nich dalo říct, že o nich nic nevíme, místo abychom tvrdili, že mají
   * signál aktuální.
   */
  missingSignals: number;
}

/** Hranice je ostrá: signál přesně pět minut starý už jako aktuální nebereme. */
export function isPresenceSignalFresh(lastHeartbeatAt: string, now: Date): boolean {
  const timestamp = Date.parse(lastHeartbeatAt);
  return Number.isFinite(timestamp) && timestamp > now.getTime() - PRESENCE_FRESHNESS_WINDOW_MS;
}

export function buildLiveOpsSummary(
  operators: LiveOpsOperatorInput[],
  presence: LiveOpsPresenceInput[],
  now: Date,
): LiveOpsSummary {
  const presenceByOperator = new Map(presence.map((entry) => [entry.operatorId, entry]));
  const counts: LiveOpsCounts = { available: 0, inCall: 0, afterCall: 0, break: 0, offline: 0 };
  let staleSignals = 0;
  let missingSignals = 0;

  for (const operator of operators) {
    const entry = presenceByOperator.get(operator.operatorId);
    const fresh = entry ? isPresenceSignalFresh(entry.lastHeartbeatAt, now) : false;
    if (!entry) missingSignals += 1;
    else if (!fresh) staleSignals += 1;

    const state: LiveOpsPresenceState = entry && fresh ? entry.state : "offline";
    switch (state) {
      case "available":
        counts.available += 1;
        break;
      case "in_call":
        counts.inCall += 1;
        break;
      case "after_call":
        counts.afterCall += 1;
        break;
      case "break":
        counts.break += 1;
        break;
      default:
        counts.offline += 1;
    }
  }

  return { total: operators.length, counts, staleSignals, missingSignals };
}
