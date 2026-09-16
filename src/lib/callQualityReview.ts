export type CallQualityReviewStatus = "pending" | "ok" | "review" | "unavailable";

export type CallQualitySection =
  | "client_problems"
  | "discovered_information"
  | "client_goal"
  | "offers_and_prices"
  | "offer_reactions"
  | "outcome_and_next_step";

export type CallQualitySignal =
  | "missing_note"
  | "short_note"
  | "short_call"
  | "missing_fail_reason";

export type CallQualityInput = {
  operatorNote: string | null;
  transcript: string | null;
  durationSeconds: number;
  outcome: string;
  failReason: string | null;
};

export type DeterministicCallQualityResult = {
  status: "ok" | "review";
  signals: CallQualitySignal[];
  missingSections: CallQualitySection[];
  reasons: string[];
};

export type GeminiCallQualityResult = {
  recommendation: "ok" | "review";
  missingSections: CallQualitySection[];
  reasons: string[];
  confidence: number | null;
};

export type CallQualityReviewResult = {
  status: CallQualityReviewStatus;
  signals: CallQualitySignal[];
  missingSections: CallQualitySection[];
  reasons: string[];
  confidence: number | null;
};

export const CALL_QUALITY_SECTIONS: readonly CallQualitySection[] = [
  "client_problems",
  "discovered_information",
  "client_goal",
  "offers_and_prices",
  "offer_reactions",
  "outcome_and_next_step",
];

const SHORT_NOTE_LIMIT = 120;

function normalized(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function unique<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

export function evaluateDeterministicCallQuality(input: CallQualityInput): DeterministicCallQualityResult {
  const note = normalized(input.operatorNote);
  const signals: CallQualitySignal[] = [];
  const missingSections: CallQualitySection[] = [];
  const reasons: string[] = [];
  let requiresReview = false;

  if (!note) {
    signals.push("missing_note");
    requiresReview = true;
    missingSections.push(...CALL_QUALITY_SECTIONS);
    reasons.push("Poznámka u hovoru chybí.");
  } else if (note.length < SHORT_NOTE_LIMIT) {
    signals.push("short_note");
    requiresReview = true;
    reasons.push(`Poznámka je velmi krátká (méně než ${SHORT_NOTE_LIMIT} znaků).`);
  }

  if (!Number.isFinite(input.durationSeconds) || input.durationSeconds < 30) {
    signals.push("short_call");
    reasons.push("Hovor trval méně než 30 sekund.");
  }

  if (input.outcome === "objection" && !normalized(input.failReason)) {
    signals.push("missing_fail_reason");
    requiresReview = true;
    reasons.push("Fail nemá vyplněný důvod.");
  }

  return {
    status: requiresReview ? "review" : "ok",
    signals: unique(signals),
    missingSections: unique(missingSections),
    reasons: unique(reasons),
  };
}

function isCallQualitySection(value: unknown): value is CallQualitySection {
  return typeof value === "string" && CALL_QUALITY_SECTIONS.includes(value as CallQualitySection);
}

function boundedReason(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const reason = value.trim();
  return reason ? reason.slice(0, 300) : null;
}

export function normalizeGeminiCallQualityResult(value: unknown): GeminiCallQualityResult | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const recommendation = record.recommendation;
  if (recommendation !== "ok" && recommendation !== "review") return null;

  if (!Array.isArray(record.missing_sections) || record.missing_sections.some((entry) => !isCallQualitySection(entry))) {
    return null;
  }
  if (!Array.isArray(record.reasons) || record.reasons.length > 6) return null;
  const reasons = record.reasons.map(boundedReason);
  if (reasons.some((reason): reason is null => reason === null)) return null;
  const uniqueReasons = unique(reasons as string[]);
  if (recommendation === "review" && uniqueReasons.length === 0) return null;

  const confidence = record.confidence;
  if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return null;
  }

  return {
    recommendation,
    missingSections: unique(record.missing_sections),
    reasons: uniqueReasons,
    confidence,
  };
}

export function combineCallQualityResults(
  deterministic: DeterministicCallQualityResult,
  gemini: GeminiCallQualityResult | null,
): CallQualityReviewResult {
  if (!gemini) {
    return {
      status: "unavailable",
      signals: deterministic.signals,
      missingSections: deterministic.missingSections,
      reasons: deterministic.reasons,
      confidence: null,
    };
  }

  const status: CallQualityReviewStatus = deterministic.status === "review" || gemini.recommendation === "review"
    ? "review"
    : "ok";

  return {
    status,
    signals: deterministic.signals,
    missingSections: unique([...deterministic.missingSections, ...gemini.missingSections]),
    reasons: unique([...deterministic.reasons, ...gemini.reasons]).slice(0, 8),
    confidence: gemini.confidence,
  };
}

const MAX_NOTE_CHARS = 4_000;
const MAX_TRANSCRIPT_CHARS = 12_000;

export function sanitizeCallQualityText(value: string | null | undefined, maxLength: number): string {
  return normalized(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi, "[e-mail odstraněn]")
    .replace(/(?<!\\d)(?:\\+?420[\\s./-]?)?(?:\\d[\\s./-]?){9,13}(?!\\d)/g, "[telefon odstraněn]")
    .slice(0, maxLength);
}

export function buildCallQualityPrompt(input: CallQualityInput): string {
  const note = sanitizeCallQualityText(input.operatorNote, MAX_NOTE_CHARS) || "(poznámka chybí)";
  const transcript = sanitizeCallQualityText(input.transcript, MAX_TRANSCRIPT_CHARS) || "(přepis není k dispozici)";
  const failReason = normalized(input.failReason) || "(neuveden)";

  return `
Jsi interní kontrola kvality poznámek v českém call centru. Posuzuješ pouze úplnost
záznamu hovoru pro Team Leadera. Nehodnoť osobnost ani výkon operátora, nevydávej lékařský nebo právní závěr a neměň výsledek hovoru ani objednávku.

Dobrá poznámka má podle dostupných informací zachytit:
- problémy a potřeby klienta,
- důležité zjištěné informace,
- cíl nebo očekávání klienta,
- všechny nabídnuté varianty a ceny,
- reakci klienta na jednotlivé nabídky,
- konečný výsledek, důvod rozhodnutí a další krok nebo předání.

Pokud některá informace není v hovoru dostupná, neoznačuj ji automaticky jako chybu.
Rozhoduj pouze mezi recommendation=ok a recommendation=review. Doporučení review
znamená, že by Team Leader měl záznam při běžné kontrole otevřít; není to sankce.

Výsledek vrať výhradně jako JSON podle tohoto tvaru:
{
  "recommendation": "ok" | "review",
  "missing_sections": ["client_problems", "discovered_information", "client_goal", "offers_and_prices", "offer_reactions", "outcome_and_next_step"],
  "reasons": ["stručný důvod v češtině"],
  "confidence": 0.0
}

Metadata hovoru:
- délka v sekundách: ${Math.max(0, Math.round(input.durationSeconds))}
- výsledek: ${input.outcome}
- důvod Failu: ${failReason}

Poznámka operátora:
${note}

Přepis hovoru:
${transcript}
`;
}
