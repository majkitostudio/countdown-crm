import type { Product } from "@/lib/products";
import { getProductScript, interpolateScript } from "@/lib/productScripts";

const ALLOWED_TAGS = "p|br|strong|b|em|i|mark|ul|ol|li|hr";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildDefaultScriptHtml(product: Product | undefined): string {
  const script = getProductScript(product);
  const paragraph = (text: string) => `<p>${escapeHtml(interpolateScript(text, product))}</p>`;
  const labeledParagraph = (label: string, text: string) =>
    `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(interpolateScript(text, product))}</p>`;
  const sectionHeading = (number: number, label: string) =>
    `<p><strong>${escapeHtml(`${number}. ${label}`)}</strong></p>`;

  return [
    sectionHeading(1, "První pozitivní dojem"),
    paragraph(script.opening),
    sectionHeading(2, "Zjištění potřeb"),
    ...script.discoveryQuestions.map(paragraph),
    sectionHeading(3, "Představení řešení"),
    ...script.approvedBenefits.map(paragraph),
    ...Object.entries(script.objectionResponses).map(([key, value]) =>
      labeledParagraph(key.replaceAll("_", " "), value),
    ),
    labeledParagraph("Internal guidance", script.nextBestAction),
    sectionHeading(4, "Závěrečný pozitivní dojem"),
    paragraph(script.closing),
    ...script.guardrails.map((guardrail) => labeledParagraph("Script guidance", guardrail)),
  ].join("");
}

/**
 * Keeps the stored script intentionally small and predictable. The editor only
 * needs text marks and paragraph/list structure; links, styles and event
 * attributes are not part of the script contract.
 */
export function sanitizeScriptHtml(value: string): string {
  if (typeof value !== "string") return "";

  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|form|input|button)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|input|button)[^>]*\/?\s*>/gi, "")
    .replace(/\s+on[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:style|href|src|class|id|name|target|rel)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(new RegExp(`<(?!/?(?:${ALLOWED_TAGS})(?:\\s|>|/))[^>]*>`, "gi"), "")
    .trim();
}

export function validateScriptHtml(value: string): string {
  const sanitized = sanitizeScriptHtml(value);
  if (!sanitized || sanitized.length > 100000) {
    throw new Error("Script content must be between 1 and 100,000 characters.");
  }
  return sanitized;
}
