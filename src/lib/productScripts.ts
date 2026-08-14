import { Product } from "./products";

export type ScriptStage = "offer" | "objection" | "resume" | "close";
export type ObjectionKey = "price_effectiveness" | "delivery" | "not_free";

export interface ProductScript {
  opening: string;
  openingOffer: string;
  discoveryQuestions: string[];
  approvedBenefits: string[];
  attentionHooks: string[];
  objectionBranches: Record<ObjectionKey, { label: string; prompt: string; response: string; nextStep: string }>;
  resumeSteps: string[];
  close: string;
  nextBestAction: string;
  guardrails: string[];
}

const jointGelScript: ProductScript = {
  opening: "I’m calling about {{product}}. Before I explain it, may I ask what result you are hoping to achieve?",
  openingOffer: "Based on what you have told me, the full course is 3,940 CZK, and courier delivery may be available as early as tomorrow. Would that work for you?",
  discoveryQuestions: [
    "What is the main issue you would like this product to help with?",
    "What have you tried so far?",
    "What is most important to you when choosing a product?",
  ],
  approvedBenefits: [
    "Topical gel format designed for an easy application routine.",
    "Present the ingredients and usage instructions exactly as approved in the product record.",
    "Set expectations clearly: results and suitability can differ between customers.",
  ],
  attentionHooks: [
    "May I finish this one point, then I will come straight back to your question?",
    "That is important. Let me note it and answer it after this short explanation.",
    "I want to make sure I explain the price and delivery clearly before we decide the next step.",
  ],
  objectionBranches: {
    price_effectiveness: {
      label: "Price / effectiveness",
      prompt: "I understand. Is the main concern the price, or whether the product will be right for you?",
      response: "That is a fair concern. I can explain the approved product information and the current price, but I do not want to promise a result that cannot be guaranteed.",
      nextStep: "Ask which part needs clarification, then return to the product script after the customer accepts the price.",
    },
    delivery: {
      label: "Delivery cost",
      prompt: "Let me confirm the delivery cost and expected timing for your address before we continue.",
      response: "I will state the delivery cost separately and clearly. The product price and delivery fee should not be presented as the same thing.",
      nextStep: "Confirm the delivery terms, then return to the product script.",
    },
    not_free: {
      label: "Not free",
      prompt: "You are right to ask. I will separate the product price from any delivery or service fee so the total is clear.",
      response: "I should not describe a product as free when the customer still pays a fee or another item. Let’s review the exact total before continuing.",
      nextStep: "Confirm the exact total and ask whether the customer wants to continue.",
    },
  },
  resumeSteps: [
    "Return to the approved product benefits.",
    "Confirm the customer’s main priority.",
    "Present the available offer and exact total clearly.",
  ],
  close: "Would you like to continue with the product at the stated total?",
  nextBestAction: "Ask one discovery question before presenting the offer.",
  guardrails: [
    "Do not promise a cure, guaranteed result, or medical outcome.",
    "Do not invent discounts, referral details, delivery terms, or product claims.",
    "Do not describe an item as free when the customer still pays fees or another item.",
  ],
};

const genericScript: ProductScript = {
  opening: "I’m calling about {{product}}. May I ask what you are looking for before I walk you through the product?",
  openingOffer: "Let me first confirm that the product fits your needs, then I will explain the exact price and delivery terms.",
  discoveryQuestions: ["What are you hoping to improve or solve?", "What have you tried before?", "What matters most when choosing a product?"],
  approvedBenefits: ["Use only benefits and product details maintained in the product record.", "Explain the intended use and next step in plain language.", "Set expectations without promising an outcome."],
  attentionHooks: ["May I finish this one point, then I will come straight back to your question?", "That is important. Let me note it before we continue."],
  objectionBranches: {
    price_effectiveness: { label: "Price / effectiveness", prompt: "Is the main concern the price, or whether the product will be right for you?", response: "I can explain the approved product information, but I do not want to promise a result that cannot be guaranteed.", nextStep: "Clarify the concern, then return to the product script." },
    delivery: { label: "Delivery cost", prompt: "Let me confirm the delivery cost and expected timing for your address.", response: "I will state the product price and delivery fee separately so the total is clear.", nextStep: "Confirm delivery terms, then return to the product script." },
    not_free: { label: "Not free", prompt: "You are right to ask. Let’s separate the product price from any fee.", response: "I should not describe a product as free when a fee still applies.", nextStep: "Confirm the exact total before continuing." },
  },
  resumeSteps: ["Return to the approved product benefits.", "Confirm the customer’s priority.", "Present the exact total clearly."],
  close: "Would you like to continue with the product at the stated total?",
  nextBestAction: "Ask one discovery question before presenting the offer.",
  guardrails: ["Use only approved product information.", "Do not invent claims, discounts, guarantees, or delivery terms."],
};

export function getProductScript(product: Product | undefined): ProductScript {
  if (!product) return genericScript;
  const normalized = `${product.title} ${product.description}`.toLowerCase();
  return normalized.includes("gel") || normalized.includes("joint") || normalized.includes("kloub") ? jointGelScript : genericScript;
}

export function interpolateScript(text: string, product: Product | undefined): string {
  return text.replace("{{product}}", product?.title || "this product");
}
