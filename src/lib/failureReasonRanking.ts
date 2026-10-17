/**
 * Žebříček důvodů neúspěchu — na co má Team Leader školit tým.
 *
 * Čistá funkce nad hovory v už zúženém období a týmovém rozsahu. Bere jen
 * hovory s výsledkem `objection`. Volající sem posílá stejnou množinu, ze které
 * se počítá sloupec „Neúspěšné hovory“ — tedy jen hovory přiřaditelné
 * operátorovi v rozsahu (viz `filterAttributedCalls`) — takže součet v žebříčku
 * odpovídá číslu, které má TL v tabulce výše. Sama funkce rozsah nezná a jen
 * věrně spočítá, co dostane.
 *
 * Každý řádek nese ovlivnitelnost typu (`getFailReasonGroup`), aby vedoucí viděl,
 * kolik neúspěchů operátor mohl ovlivnit a kolik ne. Neznámý nebo nezapsaný
 * důvod se nedomýšlí: neznámý text se zobrazí tak, jak přišel, chybějící důvod má
 * vlastní řádek „Neuvedeno“ a oba mají ovlivnitelnost `null` („neurčeno“).
 */

import { getFailReasonGroup, getFailReasonLabel, isFailReason, type FailReasonGroup } from "@/lib/postCall";

/** Popisek pro hovor bez zapsaného důvodu neúspěchu. */
export const FAILURE_REASON_UNRECORDED_LABEL = "Neuvedeno";

export interface FailureReasonCallInput {
  /** Výsledek hovoru; počítá se jen `objection`. */
  outcome: string;
  failReason: string | null;
}

export interface FailureReasonCount {
  /** Surová hodnota z databáze; null, když důvod chybí. */
  reason: string | null;
  label: string;
  count: number;
  /** Podíl z všech neúspěšných hovorů v období, zaokrouhleno na jedno desetinné místo. */
  percent: number;
  /** Ovlivnitelnost typu operátorem; `null` pro neznámý nebo nezaznamenaný důvod. */
  group: FailReasonGroup | null;
}

export interface FailureReasonRanking {
  /** Všechny neúspěšné hovory v období a rozsahu. */
  total: number;
  /** Jen důvody, které se skutečně vyskytly; seřazené od nejčastějšího. */
  reasons: FailureReasonCount[];
  /** Kolik neúspěchů měl operátor možnost ovlivnit. */
  influenceableTotal: number;
  /** Kolik neúspěchů operátor ovlivnit nemohl. */
  notInfluenceableTotal: number;
  /** Podíl ovlivnitelných z celku, zaokrouhleno na jedno desetinné místo. */
  influenceablePercent: number;
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeReason(failReason: string | null): string | null {
  const trimmed = failReason?.trim();
  return trimmed ? trimmed : null;
}

function labelFor(reason: string | null): string {
  if (reason === null) return FAILURE_REASON_UNRECORDED_LABEL;
  return isFailReason(reason) ? getFailReasonLabel(reason) : reason;
}

export function buildFailureReasonRanking(
  calls: readonly FailureReasonCallInput[],
): FailureReasonRanking {
  const counts = new Map<string | null, number>();
  let total = 0;

  for (const call of calls) {
    if (call.outcome !== "objection") continue;
    total += 1;
    const reason = normalizeReason(call.failReason);
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }

  let influenceableTotal = 0;
  let notInfluenceableTotal = 0;

  const reasons = [...counts.entries()]
    .map(([reason, count]) => {
      const group = getFailReasonGroup(reason);
      if (group === "influenceable") influenceableTotal += count;
      if (group === "not_influenceable") notInfluenceableTotal += count;
      return {
        reason,
        label: labelFor(reason),
        count,
        percent: total > 0 ? roundPercent((count / total) * 100) : 0,
        group,
      };
    })
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "cs"));

  return {
    total,
    reasons,
    influenceableTotal,
    notInfluenceableTotal,
    influenceablePercent: total > 0 ? roundPercent((influenceableTotal / total) * 100) : 0,
  };
}
