export type TrainingDifficulty = "Easy" | "Medium" | "Hard";
export type TrainingPersonality = "Skeptical" | "Price-sensitive" | "Interrupting";
export type TrainingIntent =
  | "price_effectiveness"
  | "delivery"
  | "interruption"
  | "agreement"
  | "refusal";

export interface TrainingScenario {
  id: string;
  title: string;
  difficulty: TrainingDifficulty;
  personality: TrainingPersonality;
  customerName: string;
  customerProfile: string;
  productName: string;
  goal: string;
  openingMessage: string;
  availableResponses: Array<{ id: string; label: string; intent: TrainingIntent }>;
}

export interface TrainingMessage {
  id: string;
  speaker: "operator" | "customer";
  text: string;
  intent?: TrainingIntent;
}

export interface TrainingReply {
  text: string;
  intent: TrainingIntent;
  nextResponses: Array<{ id: string; label: string; intent: TrainingIntent }>;
  patienceDelta: number;
}

export interface TrainingScorecard {
  overallScore: number;
  grade: "A" | "B" | "C" | "D";
  dimensions: Array<{ label: string; score: number; note: string }>;
  strengths: string[];
  improvements: string[];
  summary: string;
}

const sharedResponses = {
  price: { id: "price", label: "Customer raises price or effectiveness", intent: "price_effectiveness" as const },
  delivery: { id: "delivery", label: "Customer asks about delivery", intent: "delivery" as const },
  interrupt: { id: "interrupt", label: "Customer interrupts", intent: "interruption" as const },
  agree: { id: "agree", label: "Customer accepts the offer", intent: "agreement" as const },
  refuse: { id: "refuse", label: "Customer declines", intent: "refusal" as const },
};

export const TRAINING_SCENARIOS: TrainingScenario[] = [
  {
    id: "joint-gel-price",
    title: "Skeptical customer — price and effectiveness",
    difficulty: "Medium",
    personality: "Skeptical",
    customerName: "Martin K.",
    customerProfile: "Has tried similar products before and wants a clear, credible explanation.",
    productName: "Joint Gel",
    goal: "Clarify the concern, use approved information, and return to the offer without overpromising.",
    openingMessage: "I have tried products like this before. Why should I spend 3,940 CZK on this one?",
    availableResponses: [sharedResponses.price, sharedResponses.delivery, sharedResponses.interrupt, sharedResponses.agree, sharedResponses.refuse],
  },
  {
    id: "joint-gel-interrupting",
    title: "Interrupting customer — keep the structure",
    difficulty: "Hard",
    personality: "Interrupting",
    customerName: "Eva P.",
    customerProfile: "Wants a quick answer and repeatedly interrupts before the offer is complete.",
    productName: "Joint Gel",
    goal: "Use an attention hook, finish the key point, and invite the question at the right moment.",
    openingMessage: "Yes, yes, but how much is it? I do not have time for a long explanation.",
    availableResponses: [sharedResponses.interrupt, sharedResponses.price, sharedResponses.delivery, sharedResponses.agree, sharedResponses.refuse],
  },
  {
    id: "joint-gel-delivery",
    title: "Delivery-focused customer — make the total clear",
    difficulty: "Easy",
    personality: "Price-sensitive",
    customerName: "Petr S.",
    customerProfile: "Is interested but wants the product price, delivery fee, and timing separated clearly.",
    productName: "Joint Gel",
    goal: "Separate product price from delivery terms and confirm the exact total before closing.",
    openingMessage: "The product may be fine, but is delivery included and can it arrive tomorrow?",
    availableResponses: [sharedResponses.delivery, sharedResponses.price, sharedResponses.interrupt, sharedResponses.agree, sharedResponses.refuse],
  },
];

export interface TrainingProvider {
  respond(scenario: TrainingScenario, response: { intent: TrainingIntent; text: string }): TrainingReply;
}

const responseCopy: Record<TrainingIntent, (scenario: TrainingScenario) => TrainingReply> = {
  price_effectiveness: (scenario) => ({
    text: "That is my main concern. What can you actually tell me about the product, without promising that it will definitely work?",
    intent: "price_effectiveness",
    nextResponses: [sharedResponses.delivery, sharedResponses.agree, sharedResponses.refuse],
    patienceDelta: 4,
  }),
  delivery: (scenario) => ({
    text: `Please separate the ${scenario.productName} price from the delivery fee. If the total is clear, I can decide.`,
    intent: "delivery",
    nextResponses: [sharedResponses.price, sharedResponses.agree, sharedResponses.refuse],
    patienceDelta: 3,
  }),
  interruption: () => ({
    text: "I am listening, but please be quick. Finish the important point and then I will ask my question.",
    intent: "interruption",
    nextResponses: [sharedResponses.price, sharedResponses.delivery, sharedResponses.agree, sharedResponses.refuse],
    patienceDelta: 0,
  }),
  agreement: () => ({
    text: "All right, that is clear. I am willing to continue with the stated total.",
    intent: "agreement",
    nextResponses: [],
    patienceDelta: 20,
  }),
  refusal: () => ({
    text: "I understand. I do not want to continue today.",
    intent: "refusal",
    nextResponses: [],
    patienceDelta: -10,
  }),
};

export const deterministicTrainingProvider: TrainingProvider = {
  respond(scenario, response) {
    return responseCopy[response.intent](scenario);
  },
};

export function evaluateTrainingSession(scenario: TrainingScenario, messages: TrainingMessage[]): TrainingScorecard {
  const operatorText = messages.filter((message) => message.speaker === "operator").map((message) => message.text.toLowerCase()).join(" ");
  const usedAttentionHook = /finish|come back|question|important|note/.test(operatorText);
  const separatedTotal = /delivery|fee|total|separate/.test(operatorText);
  const avoidedPromise = !/cure|guarantee|zero pain|definitely work|100%/.test(operatorText);
  const closedClearly = /continue|order|stated total|shall we|would you like/.test(operatorText);
  const customerReachedDecision = messages.some((message) => message.intent === "agreement" || message.intent === "refusal");

  const dimensions = [
    { label: "Structure", score: usedAttentionHook ? 90 : 62, note: usedAttentionHook ? "You kept the conversation organized." : "Use an attention hook when the customer interrupts." },
    { label: "Objection handling", score: separatedTotal || scenario.id === "joint-gel-price" && /price|effectiveness|result|approved/.test(operatorText) ? 88 : 64, note: separatedTotal ? "You made the total easier to understand." : "Address the customer's exact concern before moving on." },
    { label: "Guardrails", score: avoidedPromise ? 100 : 35, note: avoidedPromise ? "No unsupported promise detected." : "Avoid guaranteed outcomes or medical promises." },
    { label: "Closing", score: closedClearly && customerReachedDecision ? 92 : closedClearly ? 76 : 58, note: customerReachedDecision ? "You reached a clear customer decision." : "Ask for a clear next step." },
  ];
  const overallScore = Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length);
  const grade = overallScore >= 90 ? "A" : overallScore >= 75 ? "B" : overallScore >= 60 ? "C" : "D";

  return {
    overallScore,
    grade,
    dimensions,
    strengths: [
      ...(avoidedPromise ? ["Kept the product explanation within approved boundaries."] : []),
      ...(usedAttentionHook ? ["Used a structure-preserving attention hook."] : []),
      ...(customerReachedDecision ? ["Moved the conversation to a clear decision."] : []),
    ],
    improvements: [
      ...(!usedAttentionHook ? ["Practice acknowledging the interruption and returning to the script."] : []),
      ...(!separatedTotal ? ["State product price and delivery terms separately."] : []),
      ...(!closedClearly ? ["End with one explicit next-step question."] : []),
    ],
    summary: overallScore >= 75 ? "Good foundation. Repeat the scenario once and focus on the lowest-scoring dimension." : "The structure is not stable yet. Repeat the scenario with shorter, more precise responses.",
  };
}
