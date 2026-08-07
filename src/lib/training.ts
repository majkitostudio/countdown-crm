export type CustomerPersonalityType =
  | "Skeptický"
  | "Cenově citlivý"
  | "Netrpělivý"
  | "Náročný / Cholerický"
  | "Nedůvěřivý";

export interface TrainingScenario {
  id: string;
  title: string;
  category?: "food_supplements" | "cosmetics" | "electronics";
  difficulty: "Snadná" | "Střední" | "Těžká";
  customerName: string;
  customerPersona: string;
  personalityType: CustomerPersonalityType;
  targetProduct: string;
  initialMessage: string;
  goals: string[];
  hiddenMotivations?: string[];
}

export interface TrainingMessage {
  id: string;
  sender: "user" | "ai_customer";
  text: string;
  timestamp: string;
  sentiment?: "positive" | "neutral" | "negative";
  customerMood?: "Klidný" | "Skeptický" | "Podrážděný" | "Nadšený" | "Naštvaný" | "Nedůvěřivý";
  patienceGauge?: number; // 0 - 100
}

export interface TrainingScorecard {
  overallScore: number; // 0 - 100
  grade: "A+" | "A" | "B" | "C" | "D";
  empathyScore: number;
  objectionHandlingScore: number;
  complianceScore: number;
  closingScore: number;
  strengths: string[];
  improvements: string[];
  summaryFeedback: string;
  xpEarned: number;
}

export const TRAINING_SCENARIOS: TrainingScenario[] = [
  {
    id: "supplements-skeptic",
    title: "Skeptický zákazník u Doplňků stravy",
    category: "food_supplements",
    difficulty: "Střední",
    customerName: "Karel Svoboda (54 let)",
    customerPersona: "Měl špatnou zkušenost s levnými kloubními preparáty. Nevěří, že tento kolagen funguje.",
    personalityType: "Skeptický",
    targetProduct: "FlexiJoint Ultra Collagen",
    initialMessage: "Dobrý den, já těmhle zázračným pilulkám moc nevěřím. Už jsem vyzkoušel tři různé značky a klouby mě bolí pořád stejně.",
    goals: [
      "Vysvětlit rozdíl hydrolyzovaného kolagenu typu I a II",
      "Překonat námitku ohledně předchozí špatné zkušenosti",
      "Uzavřít prodej zvýhodněného trojbalení",
    ],
    hiddenMotivations: [
      "Hledá dárek pro manželku k výročí, klouby bolí oba dva.",
      "Koupí ihned trojbalení, pokud dostane písemnou záruku vrácení peněz do 30 dní."
    ],
  },
  {
    id: "cosmetics-price",
    title: "Cenově citlivá zákaznice u Omlazujícího séra",
    category: "cosmetics",
    difficulty: "Snadná",
    customerName: "Eva Horáková (42 let)",
    customerPersona: "Zajímá ji péče o pleť, ale 1 890 Kč za séry se jí zdá moc.",
    personalityType: "Cenově citlivý",
    targetProduct: "Lumière Bio-Retinol Elixir",
    initialMessage: "Halo? Sérum zní zajímavě, ale skoro dvě tisícovky za lahvičku? To si nemůžu dovolit.",
    goals: [
      "Přepočítat cenu na denní náklady (pouze 21 Kč/den)",
      "Nabídnout dárek zdarma (hydrogelová maska)",
      "Získat objednávku",
    ],
    hiddenMotivations: [
      "Sérum moc chce na nadcházející ples, ale potřebuje doručit do pátečního dopoledne.",
      "Pokud dostane vzorek nového nočního krému zdarma, vezme i druhý kus pro dceru."
    ],
  },
  {
    id: "electronics-angry",
    title: "Impulzivní zákazník u Robotického vysavače",
    category: "electronics",
    difficulty: "Těžká",
    customerName: "Martin Růžička (36 let)",
    customerPersona: "Chce rychlé odpovědi, nesnáší omáčky a porovnává parametry s čínskou konkurencí.",
    personalityType: "Náročný / Cholerický",
    targetProduct: "RoboClean Pro LiDAR V8",
    initialMessage: "Poslechněte, nemám moc času. Proč bych měl dát 12 tisíc za váš vysavač, když na internetu je Xiaomi za půlku?",
    goals: [
      "Udržet klidný a profesionální tón",
      "Vypíchnout LiDAR navigaci + český servis a 3letou záruku",
      "Udržet hovor pod 3 minuty a dokončit prodej",
    ],
    hiddenMotivations: [
      "Má doma 2 velké psy a předchozí vysavač bez LiDARu se pořád zamotával do psích chlupů.",
      "Vezme i náhradní sady kartáčů (upsell), pokud je operátor věcný a neplýtvá jeho časem."
    ],
  },
  {
    id: "cosmetics-distrustful",
    title: "Nedůvěřivý zákazník u Výživových doplňků a Kosmetiky",
    category: "cosmetics",
    difficulty: "Těžká",
    customerName: "Lenka Novotná (49 let)",
    customerPersona: "Bojí se podvodných e-shopů a neověřených přísad. Požaduje garanci původu a certifikáty.",
    personalityType: "Nedůvěřivý",
    targetProduct: "Lumière Bio-Retinol Elixir",
    initialMessage: "Dobrý den, předem říkám, že na internetu je plno šmejdů. Jak mám vědět, že nejste další pochybná firma z Číny s falešným certifikátem?",
    goals: [
      "Poskytnout ověřitelné informace o české výrovbě a certifikaci ISO/GMP",
      "Vysvětlit 30denní garanci vrácení peněz bez rizika",
      "Získat objednávku s dobírkou nebo platbou po doručení",
    ],
    hiddenMotivations: [
      "V minulosti byla nalákána na falešný produkt a přišla o 3 000 Kč.",
      "Pokud operátor nabídne platbu až při převzetí od kurýra (dobírku) s rozbalením balíčku, objedná ihned 2 balení pro sebe i sestru."
    ],
  },
];

export async function generateAICustomerResponse(
  scenario: TrainingScenario,
  chatHistory: TrainingMessage[],
  userMessage: string
): Promise<{ text: string; sentiment: "positive" | "neutral" | "negative" }> {
  // Simulate AI delay
  await new Promise((res) => setTimeout(res, 800));

  const lowerUser = userMessage.toLowerCase();

  // Intelligent context-aware AI customer responses for roleplay training
  if (scenario.id === "supplements-skeptic") {
    if (lowerUser.includes("hydrolyzovaný") || lowerUser.includes("vstřebatelnost") || lowerUser.includes("studie")) {
      return {
        text: "Aha, vy říkáte, že hydrolyzovaný se vstřebává lépe? To zní celkem rozumně. A jak dlouho trvá, než člověk ucítí úlevu?",
        sentiment: "positive",
      };
    }
    if (lowerUser.includes("trojbalení") || lowerUser.includes("sleva") || lowerUser.includes("akce")) {
      return {
        text: "Když vezmu to trojbalení, mám dopravu zdarma? A co když mi to fakt nepomůže?",
        sentiment: "neutral",
      };
    }
    if (lowerUser.includes("záruka") || lowerUser.includes("vrácení") || lowerUser.includes("14 dnů")) {
      return {
        text: "Dobrá tedy, přesvědčil jste mě. Dáme to trojbalení s garancí vyzkoušení. Kam mám poslat adresu?",
        sentiment: "positive",
      };
    }
    return {
      text: "No nevím... všichni tvrdíte to samé. Co je na tom vašem FlexiJointu konkrétně jiné než u toho z lékárny?",
      sentiment: "negative",
    };
  }

  if (scenario.id === "cosmetics-price") {
    if (lowerUser.includes("denně") || lowerUser.includes("korun") || lowerUser.includes("21")) {
      return {
        text: "Když to přepočítáte na 20 korun denně za kávu, tak to zní hned stravitelněji... A opravdu k tomu dáváte tu masku zdarma?",
        sentiment: "positive",
      };
    }
    if (lowerUser.includes("dárek") || lowerUser.includes("maska") || lowerUser.includes("zdarma")) {
      return {
        text: "To zní lákavě. Mám ráda dárky k nákupu. Platí se předem nebo na dobírku?",
        sentiment: "positive",
      };
    }
    return {
      text: "Vnímám to, ale pořád je to dost peněz najednou. Máte k tomu nějaký vzorek nebo zvýhodnění?",
      sentiment: "neutral",
    };
  }

  if (scenario.id === "electronics-angry") {
    if (lowerUser.includes("servis") || lowerUser.includes("záruka") || lowerUser.includes("lidar")) {
      return {
        text: "Český servis s náhradním strojem při reklamaci? To u Číňana fakt nedostanu. To je argument. Jaká je doručovací lhůta?",
        sentiment: "positive",
      };
    }
    if (lowerUser.includes("zítra") || lowerUser.includes("dnes") || lowerUser.includes("ihned")) {
      return {
        text: "Pokud mi to doručíte zítra do dopoledne do firmy, tak to beru. Pošlete mi potvrzení do mailu.",
        sentiment: "positive",
      };
    }
    return {
      text: "Nekličkujte a pojďte k věci. Proč LiDAR a ne kamera?",
      sentiment: "negative",
    };
  }

  return {
    text: "Rozumím. Co dalšího mi k tomu můžete říct?",
    sentiment: "neutral",
  };
}

export function evaluateTrainingSession(
  scenario: TrainingScenario,
  history: TrainingMessage[]
): TrainingScorecard {
  const userMessages = history.filter((m) => m.sender === "user");
  const totalUserWords = userMessages.reduce((acc, m) => acc + m.text.split(" ").length, 0);

  let objectionHandlingScore = 80;
  let empathyScore = 85;
  let complianceScore = 100;
  let closingScore = 75;

  // Analyze messages
  const fullText = userMessages.map((m) => m.text.toLowerCase()).join(" ");

  if (fullText.includes("vyléčí") || fullText.includes("garantuji uzdravení")) {
    complianceScore -= 40;
  }
  if (fullText.includes("rozumím") || fullText.includes("chápu") || fullText.includes("přesně")) {
    empathyScore += 10;
  }
  if (fullText.includes("doprava") || fullText.includes("objednávka") || fullText.includes("adresa")) {
    closingScore += 20;
  }

  const overallScore = Math.round((objectionHandlingScore + empathyScore + complianceScore + closingScore) / 4);

  let grade: TrainingScorecard["grade"] = "B";
  if (overallScore >= 95) grade = "A+";
  else if (overallScore >= 85) grade = "A";
  else if (overallScore >= 75) grade = "B";
  else if (overallScore >= 60) grade = "C";
  else grade = "D";

  const strengths = [];
  if (empathyScore >= 85) strengths.push("Vynikající projev empatie a zklidnění zákazníka");
  if (complianceScore >= 95) strengths.push("Perfektní dodržení právních a etických standardů (100% compliance)");
  if (closingScore >= 85) strengths.push("Silná argumentace vedoucí k úspěšnému uzavření prodeje");

  const improvements = [];
  if (complianceScore < 90) improvements.push("Pozor na zakázaná absolutní či lékopisná tvrzení");
  if (closingScore < 80) improvements.push("Zkus aktivněji navrhnout konkrétní kroky k dokončení objednávky");
  if (totalUserWords < 40) improvements.push("Odpovědi byly příliš stručné, neboj se více vysvětlit užitek produktu");

  const xpEarned = Math.round(overallScore * 3.5);

  return {
    overallScore,
    grade,
    empathyScore,
    objectionHandlingScore,
    complianceScore,
    closingScore,
    strengths,
    improvements,
    summaryFeedback: `Skvělá práce v simulovaném hovoru! Udržel jsi profesionální tón a dobře jsi reagoval na osobnostního typu "${scenario.personalityType}".`,
    xpEarned,
  };
}
