"use server";

import { GoogleGenAI } from "@google/genai";
import { TrainingScenario, TrainingMessage } from "@/lib/training";

export interface RoleplayAIResponse {
  text: string;
  sentiment: "positive" | "neutral" | "negative";
  aiSource: "gemini-flash" | "rule-engine";
}

export async function generateTrainingResponseAction(
  scenario: TrainingScenario,
  history: TrainingMessage[],
  userMessage: string
): Promise<RoleplayAIResponse> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (apiKey && apiKey !== "YOUR_GEMINI_API_KEY") {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const historyFormatted = history
        .map((m) => `${m.sender === "user" ? "Operátor" : scenario.customerName}: ${m.text}`)
        .join("\n");

      const prompt = `
Jsi český zákazník v simulovaném prodejním hovoru s operátorem call centra.
Tvoje jméno a profil: ${scenario.customerName} (${scenario.customerPersona})
Tvoje osobnost: ${scenario.personalityType}
Cílový produkt hovoru: ${scenario.targetProduct}

Historie konverzace:
${historyFormatted}

Poslední odpověď operátora:
"${userMessage}"

Tvůj úkol: Odpověz operátorovi přirozeným mluveným českým jazykem v délce 1 až 2 věty přesně podle tvé osobnosti (${scenario.personalityType}).
Pokud operátor kvalitně vysvětlil užitek nebo vyřešil tvoji námitku, buď přístupnější. Pokud operátor mluví vázaně, kličkuje nebo je agresivní, buď skeptičtější nebo nespokojenější.

Vrať ODPOVĚĎ v tomto JSON formátu:
{
  "text": "Tvoje česká odpověď zákazníka (max 2 věty)",
  "sentiment": "positive" | "neutral" | "negative"
}

Odpověz POUZE platným JSON objektem bez označení markdown kódu.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const rawText = response.text || "";
      const cleanJson = rawText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      return {
        text: parsed.text || "Rozumím. Co přesně mi k tomu můžete ještě nabídnout?",
        sentiment: parsed.sentiment || "neutral",
        aiSource: "gemini-flash",
      };
    } catch (err) {
      console.warn("Gemini training response failed, fallback to local engine:", err);
    }
  }

  // Local fallback engine
  const lowerUser = userMessage.toLowerCase();
  let text = "Rozumím. Co dalšího mi k tomu můžete říct?";
  let sentiment: "positive" | "neutral" | "negative" = "neutral";

  if (scenario.id === "supplements-skeptic") {
    if (lowerUser.includes("hydrolyzovaný") || lowerUser.includes("vstřebatelnost") || lowerUser.includes("studie")) {
      text = "Aha, vy říkáte, že hydrolyzovaný se vstřebává lépe? To zní rozumně. A za jak dlouho ucítím úlevu?";
      sentiment = "positive";
    } else if (lowerUser.includes("trojbalení") || lowerUser.includes("sleva") || lowerUser.includes("akce")) {
      text = "Když vezmu to trojbalení, mám dopravu zdarma? A co když mi to nepomůže?";
      sentiment = "neutral";
    } else if (lowerUser.includes("záruka") || lowerUser.includes("vrácení") || lowerUser.includes("14 dnů")) {
      text = "Dobrá tedy, přesvědčil jste mě. Dáme to trojbalení s garancí. Kam mám poslat adresu?";
      sentiment = "positive";
    } else {
      text = "No nevím... všichni tvrdíte to samé. Co je na tom vašem produktu konkrétně jiné než u těch z lékárny?";
      sentiment = "negative";
    }
  } else if (scenario.id === "cosmetics-price") {
    if (lowerUser.includes("denně") || lowerUser.includes("korun") || lowerUser.includes("21")) {
      text = "Když to přepočítáte na 20 korun denně, tak to zní stravitelněji... A opravdu k tomu dáváte tu masku zdarma?";
      sentiment = "positive";
    } else if (lowerUser.includes("dárek") || lowerUser.includes("maska") || lowerUser.includes("zdarma")) {
      text = "To zní lákavě. Mám ráda dárky k nákupu. Platí se předem nebo na dobírku?";
      sentiment = "positive";
    } else {
      text = "Vnímám to, ale pořád je to dost peněz najednou. Máte k tomu nějaký vzorek nebo zvýhodnění?";
      sentiment = "neutral";
    }
  } else if (scenario.id === "electronics-angry") {
    if (lowerUser.includes("servis") || lowerUser.includes("záruka") || lowerUser.includes("lidar")) {
      text = "Český servis s náhradním strojem při reklamaci? To u konkurence nedostanu. Jaká je doručovací lhůta?";
      sentiment = "positive";
    } else if (lowerUser.includes("zítra") || lowerUser.includes("dnes") || lowerUser.includes("ihned")) {
      text = "Pokud mi to doručíte zítra do dopoledne, tak to beru. Pošlete mi potvrzení do mailu.";
      sentiment = "positive";
    } else {
      text = "Nekličkujte a pojďte k věci. Proč LiDAR a ne kamera?";
      sentiment = "negative";
    }
  }

  return {
    text,
    sentiment,
    aiSource: "rule-engine",
  };
}
