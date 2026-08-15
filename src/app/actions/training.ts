"use server";

import OpenAI from "openai";
import { TrainingScenario, TrainingMessage } from "@/lib/training";
import { requireAuthenticatedUser } from "@/lib/auth/server";

export interface RoleplayAIResponse {
  text: string;
  sentiment: "positive" | "neutral" | "negative";
  customerMood: "Klidný" | "Skeptický" | "Podrážděný" | "Nadšený" | "Naštvaný" | "Nedůvěřivý";
  patienceDelta: number; // e.g. -25 to +20
  aiSource: "openai-responses" | "rule-engine";
  aiNotice?: string;
}

export async function generateTrainingResponseAction(
  scenario: TrainingScenario,
  history: TrainingMessage[],
  userMessage: string
): Promise<RoleplayAIResponse> {
  await requireAuthenticatedUser();

  if (
    !scenario ||
    typeof scenario !== "object" ||
    typeof scenario.id !== "string" ||
    typeof scenario.customerName !== "string" ||
    typeof scenario.customerPersona !== "string" ||
    typeof scenario.personalityType !== "string" ||
    typeof scenario.targetProduct !== "string" ||
    !Array.isArray(history)
  ) {
    throw new Error("Invalid training request");
  }

  const normalizedMessage = userMessage?.trim() ?? "";
  if (normalizedMessage.length === 0 || normalizedMessage.length > 4_000) {
    throw new Error("Training message is invalid or too long");
  }

  if (
    history.length > 50 ||
    history.some(
      (message) =>
        !message ||
        typeof message !== "object" ||
        !["user", "ai_customer"].includes(message.sender) ||
        typeof message.text !== "string" ||
        message.text.length > 4_000
    )
  ) {
    throw new Error("Training history is invalid or too long");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  let aiNotice: string | undefined;

  if (apiKey) {
    try {
      const client = new OpenAI({ apiKey });
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
        "${normalizedMessage}"

Tvůj úkol: Odpověz operátorovi přirozeným mluveným českým jazykem v délce 1 až 2 věty přesně podle tvé osobnosti (${scenario.personalityType}).
Vyhodnoť také svoji aktuální náladu a změnu trpělivosti (patienceDelta od -30 do +20).
Pokud operátor kvalitně vyřešil námitku nebo projevil empatii, zvyš trpělivost (+10 až +20) a nastav náladu na "Klidný" nebo "Nadšený".
Pokud operátor kličkuje, ignoruje otázku nebo je agresivní, sniž trpělivost (-15 až -30) a nastav náladu na "Podrážděný" nebo "Naštvaný".

Vrať ODPOVĚĎ v tomto JSON formátu:
{
  "text": "Tvoje česká odpověď zákazníka (max 2 věty)",
  "sentiment": "positive" | "neutral" | "negative",
  "customerMood": "Klidný" | "Skeptický" | "Podrážděný" | "Nadšený" | "Naštvaný" | "Nedůvěřivý",
  "patienceDelta": číslo v rozmezí -30 až +20
}

Odpověz POUZE platným JSON objektem bez označení markdown kódu.
`;

      const response = await client.responses.create({
        model: process.env.OPENAI_TRAINING_MODEL || "gpt-5.4-mini",
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "training_customer_response",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                text: { type: "string" },
                sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                customerMood: { type: "string", enum: ["Klidný", "Skeptický", "Podrážděný", "Nadšený", "Naštvaný", "Nedůvěřivý"] },
                patienceDelta: { type: "number", minimum: -30, maximum: 20 },
              },
              required: ["text", "sentiment", "customerMood", "patienceDelta"],
            },
          },
        },
      });

      const parsed = JSON.parse(response.output_text);
      const sentiments = ["positive", "neutral", "negative"] as const;
      const moods = ["Klidný", "Skeptický", "Podrážděný", "Nadšený", "Naštvaný", "Nedůvěřivý"] as const;
      const sentiment = sentiments.includes(parsed.sentiment) ? parsed.sentiment : "neutral";
      const customerMood = moods.includes(parsed.customerMood) ? parsed.customerMood : "Skeptický";
      const text = typeof parsed.text === "string" && parsed.text.trim() ? parsed.text.trim() : "Rozumím. Co přesně mi k tomu můžete ještě nabídnout?";
      const patienceDelta = typeof parsed.patienceDelta === "number" ? Math.max(-30, Math.min(20, parsed.patienceDelta)) : 0;

      return {
        text,
        sentiment,
        customerMood,
        patienceDelta,
        aiSource: "openai-responses",
      };
    } catch (err) {
      const errorStatus = typeof err === "object" && err !== null && "status" in err ? err.status : undefined;
      aiNotice = errorStatus === 429
        ? "OpenAI quota is unavailable. This turn used the local training engine."
        : "OpenAI response was unavailable. This turn used the local training engine.";
      console.warn("OpenAI training response failed, using the local training engine:", err);
    }
  }

  // Local fallback engine
  const lowerUser = normalizedMessage.toLowerCase();
  let text = "Rozumím. Co dalšího mi k tomu můžete říct?";
  let sentiment: "positive" | "neutral" | "negative" = "neutral";
  let customerMood: RoleplayAIResponse["customerMood"] = "Skeptický";
  let patienceDelta = 0;

  if (scenario.id === "supplements-skeptic") {
    if (lowerUser.includes("hydrolyzovaný") || lowerUser.includes("vstřebatelnost") || lowerUser.includes("studie")) {
      text = "Aha, vy říkáte, že hydrolyzovaný se vstřebává lépe? To zní rozumně. A za jak dlouho ucítím úlevu?";
      sentiment = "positive";
      customerMood = "Klidný";
      patienceDelta = +15;
    } else if (lowerUser.includes("trojbalení") || lowerUser.includes("sleva") || lowerUser.includes("akce")) {
      text = "Když vezmu to trojbalení, mám dopravu zdarma? A co když mi to nepomůže?";
      sentiment = "neutral";
      customerMood = "Skeptický";
      patienceDelta = +5;
    } else if (lowerUser.includes("záruka") || lowerUser.includes("vrácení") || lowerUser.includes("14 dnů")) {
      text = "Dobrá tedy, přesvědčil jste mě. Dáme to trojbalení s garancí. Kam mám poslat adresu?";
      sentiment = "positive";
      customerMood = "Nadšený";
      patienceDelta = +20;
    } else {
      text = "No nevím... všichni tvrdíte to samé. Co je na tom vašem produktu konkrétně jiné než u těch z lékárny?";
      sentiment = "negative";
      customerMood = "Podrážděný";
      patienceDelta = -15;
    }
  } else if (scenario.id === "cosmetics-price") {
    if (lowerUser.includes("denně") || lowerUser.includes("korun") || lowerUser.includes("21")) {
      text = "Když to přepočítáte na 20 korun denně, tak to zní stravitelněji... A opravdu k tomu dáváte tu masku zdarma?";
      sentiment = "positive";
      customerMood = "Nadšený";
      patienceDelta = +15;
    } else if (lowerUser.includes("dárek") || lowerUser.includes("maska") || lowerUser.includes("zdarma")) {
      text = "To zní lákavě. Mám ráda dárky k nákupu. Platí se předem nebo na dobírku?";
      sentiment = "positive";
      customerMood = "Klidný";
      patienceDelta = +10;
    } else {
      text = "Vnímám to, ale pořád je to dost peněz najednou. Máte k tomu nějaký vzorek nebo zvýhodnění?";
      sentiment = "neutral";
      customerMood = "Skeptický";
      patienceDelta = -5;
    }
  } else if (scenario.id === "electronics-angry") {
    if (lowerUser.includes("servis") || lowerUser.includes("záruka") || lowerUser.includes("lidar")) {
      text = "Český servis s náhradním strojem při reklamaci? To u konkurence nedostanu. Jaká je doručovací lhůta?";
      sentiment = "positive";
      customerMood = "Klidný";
      patienceDelta = +20;
    } else if (lowerUser.includes("zítra") || lowerUser.includes("dnes") || lowerUser.includes("ihned")) {
      text = "Pokud mi to doručíte zítra do dopoledne, tak to beru. Pošlete mi potvrzení do mailu.";
      sentiment = "positive";
      customerMood = "Nadšený";
      patienceDelta = +20;
    } else {
      text = "Nekličkujte a pojďte k věci. Proč LiDAR a ne kamera?";
      sentiment = "negative";
      customerMood = "Naštvaný";
      patienceDelta = -20;
    }
  } else if (scenario.id === "cosmetics-distrustful") {
    if (lowerUser.includes("certifikát") || lowerUser.includes("iso") || lowerUser.includes("gmp") || lowerUser.includes("výroba") || lowerUser.includes("české")) {
      text = "Česká šarže s ISO certifikátem? To už zní trochu důvěryhodněji. Můžete mi ten certifikát poslat do mailu?";
      sentiment = "positive";
      customerMood = "Klidný";
      patienceDelta = +20;
    } else if (lowerUser.includes("dobírka") || lowerUser.includes("platba při převzetí") || lowerUser.includes("kurýr")) {
      text = "Když to můžu zaplatit až kurýrovi při převzetí na dobírku, tak je to v pořádku. Vezmu 2 balení pro mě i pro sestru!";
      sentiment = "positive";
      customerMood = "Nadšený";
      patienceDelta = +25;
    } else {
      text = "Pořád se mi to nezdá. Kde mám jistotu, že to není z falšovaných surovin?";
      sentiment = "negative";
      customerMood = "Nedůvěřivý";
      patienceDelta = -15;
    }
  }

  return {
    text,
    sentiment,
    customerMood,
    patienceDelta,
    aiSource: "rule-engine",
    aiNotice,
  };
}
