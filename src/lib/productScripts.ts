import { Product } from "./products";

export interface ProductScript {
  opening: string;
  discoveryQuestions: string[];
  approvedBenefits: string[];
  objectionResponses: Record<string, string>;
  nextBestAction: string;
  closing: string;
  guardrails: string[];
}

const jointGelScript: ProductScript = {
  opening:
    "Volám ohledně produktu {{product}}. Než vám jej představím, mohu se zeptat, co od něj očekáváte?",
  discoveryQuestions: [
    "S čím by vám měl produkt především pomoci?",
    "Co jste dosud vyzkoušeli?",
    "Co je pro vás při výběru produktu nejdůležitější?",
  ],
  approvedBenefits: [
    "Gel k zevnímu použití pro snadnou pravidelnou aplikaci.",
    "Představte složení a použití přesně podle schválených údajů u produktu.",
    "Vysvětlete očekávání: výsledky i vhodnost se mohou u různých zákazníků lišit.",
  ],
  objectionResponses: {
    price:
      "Rozumím. Nejprve ověřme, zda produkt odpovídá vašim potřebám, a poté společně projdeme aktuální cenu a dostupné možnosti.",
    effectiveness:
      "To je pochopitelná otázka. Mohu vám vysvětlit schválené informace a způsob použití, ale nechci slibovat výsledek, který nelze zaručit.",
    delivery:
      "Než budeme pokračovat, ověřím cenu dopravy a předpokládaný termín doručení na vaši adresu.",
    hesitation:
      "Samozřejmě. Jaké informace by vám pomohly se rozhodnout?",
  },
  nextBestAction: "Před představením nabídky položte jednu otázku ke zjištění potřeb.",
  closing:
    "Děkuji za popis vaší situace. Pokud chcete, můžeme před vaším rozhodnutím projít další postup a vyjasnit případné otázky.",
  guardrails: [
    "Neslibujte vyléčení, zaručený výsledek ani léčebný účinek.",
    "Nevymýšlejte slevy, doporučení, dodací podmínky ani tvrzení o produktu.",
    "Neoznačujte položku jako bezplatnou, pokud zákazník platí poplatky nebo jinou položku.",
  ],
};

const genericScript: ProductScript = {
  opening:
    "Volám ohledně produktu {{product}}. Než vám jej představím, mohu se zeptat, co hledáte?",
  discoveryQuestions: [
    "Co byste chtěli zlepšit nebo vyřešit?",
    "Co jste již vyzkoušeli?",
    "Co je pro vás při výběru produktu nejdůležitější?",
  ],
  approvedBenefits: [
    "Používejte pouze přínosy a údaje vedené u produktu.",
    "Srozumitelně vysvětlete způsob použití a další postup.",
    "Vysvětlete očekávání bez slibování výsledku.",
  ],
  objectionResponses: {
    price: "Rozumím. Nejprve ověřme, zda produkt odpovídá vašim potřebám, a poté projdeme cenu a možnosti.",
    effectiveness: "To je pochopitelná otázka. Mohu vysvětlit schválené informace o produktu, ale nechci slibovat výsledek, který nelze zaručit.",
    hesitation: "Samozřejmě. Jaké informace by vám pomohly se rozhodnout?",
  },
  nextBestAction: "Před představením nabídky položte jednu otázku ke zjištění potřeb.",
  closing:
    "Děkuji za váš čas a otevřenost. Pokud máte další otázky, mohu vám poskytnout schválené informace o produktu a vysvětlit další postup.",
  guardrails: [
    "Používejte pouze schválené informace o produktu.",
    "Nevymýšlejte tvrzení, slevy, záruky ani dodací podmínky.",
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
  return text.replace("{{product}}", product?.title || "tento produkt");
}
