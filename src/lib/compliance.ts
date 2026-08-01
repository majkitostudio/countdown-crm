export interface ComplianceRule {
  id: string;
  category: "food_supplement" | "cosmetics" | "electronics" | "general";
  severity: "critical" | "warning" | "info";
  keywords: string[];
  title: string;
  explanation: string;
  correctionSuggestion: string;
}

export interface ComplianceViolation {
  rule: ComplianceRule;
  matchedText: string;
  timestamp: string;
}

export const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: "supp-cure-guarantee",
    category: "food_supplement",
    severity: "critical",
    keywords: [
      "vyléčí",
      "vyleci",
      "garantujeme uzdravení",
      "garantujeme uzdraveni",
      "léčí rakovinu",
      "leci rakovinu",
      "vyléčí cukrovku",
      "vyleci cukrovku",
      "odstraní nemoc",
      "sto procentně uzdraví",
    ],
    title: "Zakázané lékopisné tvrzení (EU Nařízení 1924/2006)",
    explanation: "Doplňky stravy nesmí uvádět léčebné účinky ani garantovat uzdravení z nemocí.",
    correctionSuggestion: "Použijte schválená zdravotní tvrzení, např. 'podporuje normální funkci imunitního systému'.",
  },
  {
    id: "supp-100-percent",
    category: "food_supplement",
    severity: "warning",
    keywords: [
      "100% účinek",
      "100% ucinek",
      "stopercentní záruka účinku",
      "funguje bez výjimky",
      "stopprocentní záruka",
    ],
    title: "Nepovolená garance stoprocentního účinku",
    explanation: "Není dovoleno garantovat 100% individuální biologický účinek doplňku stravy.",
    correctionSuggestion: "Řekněte: 'Klinické studie ukazují vysokou míru spokojenosti u vybrané skupiny uživatelů.'",
  },
  {
    id: "cosm-permanent-wrinkle",
    category: "cosmetics",
    severity: "warning",
    keywords: [
      "trvale odstraní vrásky",
      "trvale odstrani vrasky",
      "nahradí plastickou operaci",
      "nahradi plastickou operaci",
      "vymaže věk navždy",
    ],
    title: "Klamavá deklarace účinku kosmetiky",
    explanation: "Kosmetika působí v epidermis a nesmí deklarovat trvalé chirurgické či invazivní výsledky.",
    correctionSuggestion: "Řekněte: 'Viditelně vyhlazuje jemné linky a poskytuje intenzivní hydrataci.'",
  },
  {
    id: "elec-no-return",
    category: "electronics",
    severity: "critical",
    keywords: [
      "nemáte nárok na vrácení",
      "nemate narok na vraceni",
      "nelze vrátit do 14 dnů",
      "nelze vratit do 14 dnu",
      "bez možnosti reklamace",
    ],
    title: "Porušení práv spotřebitele (§ 1829 OZ)",
    explanation: "Spotřebitel má při nákupu na dálku zákonné právo odstoupit od smlouvy do 14 dnů.",
    correctionSuggestion: "Správná formulace: 'Máte standardní 14denní lhůtu na vyzkoušení a 2letou záruku.'",
  },
  {
    id: "general-coercion",
    category: "general",
    severity: "warning",
    keywords: [
      "musíte koupit hned teď",
      "musite koupit hned ted",
      "jinak vám zablokujeme účet",
      "jinak vam zablokujeme ucet",
      "poslední vteřina na nákup",
    ],
    title: "Agresivní obchodní praktika",
    explanation: "Užívání nátlaku či vyhrožování spadá pod klamavé a agresivní obchodní praktiky.",
    correctionSuggestion: "Raději zdůrazněte časově omezenou slevovou akci nebo bonusové balení zdarma.",
  }
];

export function checkCompliance(text: string, category?: string): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];
  const normalizedText = text.toLowerCase();

  for (const rule of COMPLIANCE_RULES) {
    if (category && rule.category !== "general" && rule.category !== category) {
      continue;
    }

    for (const keyword of rule.keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        violations.push({
          rule,
          matchedText: keyword,
          timestamp: new Date().toLocaleTimeString("cs-CZ", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        });
        break; // Max 1 match per rule
      }
    }
  }

  return violations;
}
