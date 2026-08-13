export type TrainingDifficulty = "Easy" | "Medium" | "Hard";
export type TrainingPersonality = "Skeptical" | "Price-sensitive" | "Interrupting";
export type TrainingIntent =
  | "price_effectiveness"
  | "delivery"
  | "interruption"
  | "agreement"
  | "refusal"
  | "needs_clarification";
export type TrainingStage = "offer" | "objection" | "resume" | "close";

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
  openingStage: TrainingStage;
  openingIntent: Exclude<TrainingIntent, "needs_clarification">;
  availableResponses: Array<{ id: string; label: string; intent: TrainingIntent }>;
}

export interface TrainingMessage {
  id: string;
  speaker: "operator" | "customer";
  text: string;
  intent?: TrainingIntent;
  stage?: TrainingStage;
}

export interface TrainingTurnAssessment {
  status: "correct" | "partial" | "incorrect";
  score: number;
  expectedIntent: string;
  detectedIntent: string;
  feedback: string;
}

export interface TrainingReply {
  text: string;
  intent: TrainingIntent;
  nextResponses: Array<{ id: string; label: string; intent: TrainingIntent }>;
  patienceDelta: number;
  nextStage: TrainingStage;
  nextBestAction: string;
}

export interface TrainingIntentDetection {
  intent: TrainingIntent;
  confidence: "high" | "medium" | "low";
  label: string;
}

export interface TrainingScorecard {
  overallScore: number;
  grade: "A" | "B" | "C" | "D";
  dimensions: Array<{ label: string; score: number; note: string }>;
  strengths: string[];
  improvements: string[];
  summary: string;
  transitionScore: number;
  transitionFeedback: string[];
}

const sharedResponses = {
  price: { id: "price", label: "Address price or effectiveness", intent: "price_effectiveness" as const },
  delivery: { id: "delivery", label: "Address delivery terms", intent: "delivery" as const },
  interrupt: { id: "interrupt", label: "Use an attention hook", intent: "interruption" as const },
  agree: { id: "agree", label: "Move to the close", intent: "agreement" as const },
  refuse: { id: "refuse", label: "Close respectfully", intent: "refusal" as const },
};

const intentLabels: Record<TrainingIntent, string> = {
  price_effectiveness: "Price / effectiveness",
  delivery: "Delivery",
  interruption: "Interruption / attention hook",
  agreement: "Agreement",
  refusal: "Refusal",
  needs_clarification: "Needs clarification",
};

const intentPatterns: Array<{ intent: Exclude<TrainingIntent, "needs_clarification">; pattern: RegExp }> = [
  { intent: "delivery", pattern: /deliver|courier|arriv|tomorrow|shipping|fee|doruč|kurýr|zítra|poplatek/i },
  { intent: "agreement", pattern: /yes|okay|agree|continue|order|take it|sounds good|beru|souhlas|objedn|pokrač/i },
  { intent: "refusal", pattern: /no thanks|not interested|too expensive|do not want|decline|nechci|nemám zájem|odmít|drah/i },
  { intent: "interruption", pattern: /finish|let me speak|one moment|listen|hold on|interrupt|dokonč|poslouchej|moment/i },
  { intent: "price_effectiveness", pattern: /price|cost|expensive|work|effective|result|proof|evidence|cena|fung|účinek|výsledek|důkaz/i },
];

export function detectTrainingIntent(text: string): TrainingIntentDetection {
  const normalized = text.trim();
  if (!normalized) return { intent: "needs_clarification", confidence: "low", label: intentLabels.needs_clarification };
  const matches = intentPatterns.filter(({ pattern }) => pattern.test(normalized));
  if (matches.length !== 1) return { intent: "needs_clarification", confidence: "low", label: intentLabels.needs_clarification };
  return { intent: matches[0].intent, confidence: "medium", label: intentLabels[matches[0].intent] };
}

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
    openingStage: "offer",
    openingIntent: "price_effectiveness",
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
    openingStage: "offer",
    openingIntent: "interruption",
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
    openingStage: "offer",
    openingIntent: "delivery",
    availableResponses: [sharedResponses.delivery, sharedResponses.price, sharedResponses.interrupt, sharedResponses.agree, sharedResponses.refuse],
  },
];

export interface TrainingProvider {
  respond(scenario: TrainingScenario, response: { intent: TrainingIntent; text: string }): TrainingReply;
}

const responseCopy: Record<TrainingIntent, (scenario: TrainingScenario) => TrainingReply> = {
  price_effectiveness: () => ({
    text: "That is my main concern. What can you actually tell me about the product, without promising that it will definitely work?",
    intent: "price_effectiveness",
    nextResponses: [sharedResponses.delivery, sharedResponses.agree, sharedResponses.refuse],
    patienceDelta: 4,
    nextStage: "objection",
    nextBestAction: "Clarify whether the concern is price or suitability, then use an approved product benefit.",
  }),
  delivery: (scenario) => ({
    text: `Please separate the ${scenario.productName} price from the delivery fee. If the total is clear, I can decide.`,
    intent: "delivery",
    nextResponses: [sharedResponses.price, sharedResponses.agree, sharedResponses.refuse],
    patienceDelta: 3,
    nextStage: "objection",
    nextBestAction: "Separate the product price, delivery fee, and total before moving on.",
  }),
  interruption: () => ({
    text: "I am listening, but please be quick. Finish the important point and then I will ask my question.",
    intent: "interruption",
    nextResponses: [sharedResponses.price, sharedResponses.delivery, sharedResponses.agree, sharedResponses.refuse],
    patienceDelta: 0,
    nextStage: "objection",
    nextBestAction: "Use an attention hook, finish the key point, then invite the customer's question.",
  }),
  agreement: () => ({
    text: "All right, that is clear. I am willing to continue with the stated total.",
    intent: "agreement",
    nextResponses: [],
    patienceDelta: 20,
    nextStage: "close",
    nextBestAction: "Confirm the exact total and the next operational step.",
  }),
  refusal: () => ({
    text: "I understand. I do not want to continue today.",
    intent: "refusal",
    nextResponses: [],
    patienceDelta: -10,
    nextStage: "close",
    nextBestAction: "Respect the refusal and close the training call clearly.",
  }),
  needs_clarification: () => ({
    text: "I am not sure which part you are addressing. Could you clarify whether you mean the price, delivery, product information, or whether you want to continue?",
    intent: "needs_clarification",
    nextResponses: [sharedResponses.price, sharedResponses.delivery, sharedResponses.interrupt, sharedResponses.agree, sharedResponses.refuse],
    patienceDelta: -2,
    nextStage: "objection",
    nextBestAction: "Ask one focused question before choosing an objection branch.",
  }),
};

export const deterministicTrainingProvider: TrainingProvider = {
  respond(scenario, response) {
    return responseCopy[response.intent](scenario);
  },
};

const intentDisplayLabels: Record<TrainingIntent, string> = {
  price_effectiveness: "Price / effectiveness",
  delivery: "Delivery",
  interruption: "Interruption",
  agreement: "Agreement",
  refusal: "Refusal",
  needs_clarification: "Needs clarification",
};

export function assessLatestTrainingTurn(scenario: TrainingScenario, messages: TrainingMessage[]): TrainingTurnAssessment | null {
  const operatorIndex = messages.map((message) => message.speaker).lastIndexOf("operator");
  if (operatorIndex < 0) return null;
  const operatorMessage = messages[operatorIndex];
  const previousCustomer = [...messages.slice(0, operatorIndex)].reverse().find((message) => message.speaker === "customer");
  const expectedIntent = previousCustomer?.intent && previousCustomer.intent !== "needs_clarification" ? previousCustomer.intent : scenario.openingIntent;
  const detectedIntent = operatorMessage.intent || "needs_clarification";
  if (detectedIntent === expectedIntent) {
    return { status: "correct", score: 100, expectedIntent: intentDisplayLabels[expectedIntent], detectedIntent: intentDisplayLabels[detectedIntent], feedback: "Correct branch selected. Your response matches the customer's main concern." };
  }
  if (detectedIntent === "needs_clarification") {
    return { status: "partial", score: 55, expectedIntent: intentDisplayLabels[expectedIntent], detectedIntent: intentDisplayLabels[detectedIntent], feedback: "Needs clarification is safer than choosing the wrong branch, but the customer's concern is still unresolved." };
  }
  return { status: "incorrect", score: 25, expectedIntent: intentDisplayLabels[expectedIntent], detectedIntent: intentDisplayLabels[detectedIntent], feedback: `You addressed ${intentDisplayLabels[detectedIntent].toLowerCase()}, but the customer was asking about ${intentDisplayLabels[expectedIntent].toLowerCase()}.` };
}

export function evaluateTrainingSession(scenario: TrainingScenario, messages: TrainingMessage[]): TrainingScorecard {
  const operatorText = messages.filter((message) => message.speaker === "operator").map((message) => message.text.toLowerCase()).join(" ");
  const usedAttentionHook = /finish|come back|question|important|note/.test(operatorText);
  const separatedTotal = /delivery|fee|total|separate/.test(operatorText);
  const avoidedPromise = !/cure|guarantee|zero pain|definitely work|100%/.test(operatorText);
  const closedClearly = /continue|order|stated total|shall we|would you like/.test(operatorText);
  const customerReachedDecision = messages.some((message) => message.intent === "agreement" || message.intent === "refusal");
  const operatorMessages = messages.filter((message) => message.speaker === "operator");
  const turnScores = operatorMessages.map((_, index) => assessLatestTrainingTurn(scenario, messages.slice(0, messages.findIndex((message) => message === operatorMessages[index]) + 2))?.score ?? 0);
  const transitionScore = turnScores.length ? Math.round(turnScores.reduce((sum, score) => sum + score, 0) / turnScores.length) : 0;
  const transitionFeedback = operatorMessages.length && transitionScore >= 80
    ? ["You selected branches that matched the customer's stated intent."]
    : ["Review the customer's last intent before choosing the next script branch."];

  const dimensions = [
    { label: "Structure", score: usedAttentionHook ? 90 : 62, note: usedAttentionHook ? "You kept the conversation organized." : "Use an attention hook when the customer interrupts." },
    { label: "Objection handling", score: transitionScore >= 80 ? 88 : separatedTotal ? 78 : 64, note: transitionScore >= 80 ? "Your selected branches matched the customer's intent." : "Address the customer's exact concern before moving on." },
    { label: "Transition accuracy", score: transitionScore, note: transitionScore >= 80 ? "You selected the branch that matched the customer's intent." : "Review the customer's last intent before choosing the next branch." },
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
    transitionScore,
    transitionFeedback,
  };
}
