import { describe, expect, it } from "vitest";
import {
  buildCallQualityPrompt,
  combineCallQualityResults,
  evaluateDeterministicCallQuality,
  normalizeGeminiCallQualityResult,
  sanitizeCallQualityText,
} from "@/lib/callQualityReview";

describe("call quality review", () => {
  it("flags a missing note without pretending the AI is available", () => {
    const deterministic = evaluateDeterministicCallQuality({
      operatorNote: null,
      transcript: "Klient odmítl nabídku.",
      durationSeconds: 90,
      outcome: "objection",
      failReason: "price",
    });

    expect(deterministic.status).toBe("review");
    expect(deterministic.signals).toContain("missing_note");
    expect(combineCallQualityResults(deterministic, null)).toMatchObject({
      status: "unavailable",
      signals: ["missing_note"],
    });
  });

  it("keeps a short-call signal separate from a quality verdict", () => {
    const result = evaluateDeterministicCallQuality({
      operatorNote: "Klient chtěl zavolat později, domluvili jsme přesný termín callbacku a poznámka zachycuje výsledek i další krok podle domluvy s klientem.",
      transcript: null,
      durationSeconds: 12,
      outcome: "followup_scheduled",
      failReason: null,
    });

    expect(result.status).toBe("ok");
    expect(result.signals).toContain("short_call");
  });

  it("combines deterministic warnings with a valid Gemini recommendation", () => {
    const deterministic = evaluateDeterministicCallQuality({
      operatorNote: "Obezita, chce zhubnout. Nabídka 1400 Kč, souhlasí.",
      transcript: "Klient popsal potřeby a reagoval na nabídku.",
      durationSeconds: 240,
      outcome: "order_placed",
      failReason: null,
    });
    const result = combineCallQualityResults(deterministic, {
      recommendation: "review",
      missingSections: ["offer_reactions"],
      reasons: ["Chybí reakce na jednotlivé nabídky."],
      confidence: 0.87,
    });

    expect(result.status).toBe("review");
    expect(result.missingSections).toContain("offer_reactions");
    expect(result.confidence).toBe(0.87);
  });

  it("rejects unsupported or incomplete model output instead of storing it", () => {
    expect(normalizeGeminiCallQualityResult({ recommendation: "maybe" })).toBeNull();
    expect(normalizeGeminiCallQualityResult({
      recommendation: "review",
      missing_sections: ["medical_diagnosis"],
      reasons: [42],
      confidence: 0.8,
    })).toBeNull();
    expect(normalizeGeminiCallQualityResult({
      recommendation: "review",
      missing_sections: [],
      reasons: [],
      confidence: 0.8,
    })).toBeNull();
    expect(normalizeGeminiCallQualityResult({
      recommendation: "ok",
      missing_sections: [],
      reasons: [],
      confidence: 1.2,
    })).toBeNull();
  });

  it("redacts contact data and bounds text sent to Gemini", () => {
    const sanitized = sanitizeCallQualityText("Kontakt jan.novak@example.com nebo +420 777 123 456", 20);
    expect(sanitized).not.toContain("jan.novak@example.com");
    expect(sanitized).not.toContain("777 123 456");
    expect(sanitized.length).toBe(20);
  });

  it("does not turn the note into a medical or legal judgement prompt", () => {
    const prompt = buildCallQualityPrompt({
      operatorNote: "Klient má bolesti zad.",
      transcript: "Klient popsal svůj problém.",
      durationSeconds: 60,
      outcome: "objection",
      failReason: "health_concern",
    });

    expect(prompt).toContain("nevydávej lékařský nebo právní závěr");
    expect(prompt).toContain("recommendation");
  });
});
