import { Product } from "./products";

export interface ProductScript {
  opening: string;
  discoveryQuestions: string[];
  approvedBenefits: string[];
  objectionResponses: Record<string, string>;
  nextBestAction: string;
  guardrails: string[];
}

const jointGelScript: ProductScript = {
  opening:
    "I’m calling about {{product}}. Before I explain the product, may I ask what result you are hoping to achieve?",
  discoveryQuestions: [
    "What is the main issue you would like this product to help with?",
    "What have you tried so far?",
    "What is most important to you when choosing a product?",
  ],
  approvedBenefits: [
    "Topical gel format designed for an easy application routine.",
    "Present the product ingredients and usage instructions exactly as approved in the product record.",
    "Set expectations clearly: results and suitability can differ between customers.",
  ],
  objectionResponses: {
    price:
      "I understand. Let me first make sure the product is relevant to what you need, then we can review the current price and available options clearly.",
    effectiveness:
      "That is a fair question. I can explain the approved product information and how it is intended to be used, but I do not want to promise a result that cannot be guaranteed.",
    delivery:
      "Let me confirm the delivery cost and expected timing for your address before we continue.",
    hesitation:
      "Of course. What information would help you make a comfortable decision?",
  },
  nextBestAction: "Ask one discovery question before presenting the offer.",
  guardrails: [
    "Do not promise a cure, guaranteed result, or medical outcome.",
    "Do not invent discounts, referral details, delivery terms, or product claims.",
    "Do not describe an item as free when the customer still pays fees or another item.",
  ],
};

const genericScript: ProductScript = {
  opening:
    "I’m calling about {{product}}. May I ask what you are looking for before I walk you through the product?",
  discoveryQuestions: [
    "What are you hoping to improve or solve?",
    "What have you tried before?",
    "What matters most when choosing a product?",
  ],
  approvedBenefits: [
    "Use only benefits and product details maintained in the product record.",
    "Explain the intended use and next step in plain language.",
    "Set expectations without promising an outcome.",
  ],
  objectionResponses: {
    price: "I understand. Let’s first confirm that the product fits your needs, then review the price and options clearly.",
    effectiveness: "That is a fair question. I can explain the approved product information, but I do not want to promise a result that cannot be guaranteed.",
    hesitation: "Of course. What information would help you make a comfortable decision?",
  },
  nextBestAction: "Ask one discovery question before presenting the offer.",
  guardrails: [
    "Use only approved product information.",
    "Do not invent claims, discounts, guarantees, or delivery terms.",
  ],
};

export function getProductScript(product: Product | undefined): ProductScript {
  if (!product) return genericScript;

  const normalized = `${product.title} ${product.description}`.toLowerCase();
  return normalized.includes("gel") || normalized.includes("joint") || normalized.includes("kloub")
    ? jointGelScript
    : genericScript;
}

export function interpolateScript(text: string, product: Product | undefined): string {
  return text.replace("{{product}}", product?.title || "this product");
}
