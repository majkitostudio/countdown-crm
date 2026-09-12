export type TrainingDifficulty = "easy" | "standard";

export type TrainingMessage = {
  id: string;
  sender: "user" | "ai_customer";
  text: string;
  timestamp: string;
  occurredAt?: string;
  source?: "typed" | "browser_speech" | "ai_customer" | "scenario";
  confidence?: number | null;
  sentiment?: "positive" | "neutral" | "negative";
};

export type TrainingPersona = {
  id: string;
  name: string;
  profile: string;
  deliveryAddress: string;
};

export type TrainingScriptSection = { title: string; text: string };

export type TrainingScript = {
  id: string;
  title: string;
  productLabel: string;
  purpose: string;
  opening: string;
  sections: TrainingScriptSection[];
};

export type TrainingScenario = TrainingScript & {
  difficulty: TrainingDifficulty;
  customer: TrainingPersona;
  initialMessage: string;
};

export type ComplianceFinding = {
  phrase: string;
  reason: string;
  saferAlternative: string;
  severity: "serious";
  occurrences: number;
};

export type TrainingScorecard = {
  overallScore: number;
  grade: "A" | "B" | "C" | "D";
  passed: boolean;
  discoveryScore: number;
  scriptScore: number;
  offerScore: number;
  closingScore: number;
  complianceScore: number;
  complianceFindings: ComplianceFinding[];
  strengths: string[];
  improvements: string[];
  summaryFeedback: string;
};

export const P2_TRAINING_SCRIPTS: TrainingScript[] = [
  {
    id: "p2-joints-free-sample",
    title: "P2 · Klouby · první kontakt",
    productLabel: "Kloubní program – bezplatný vzorek",
    purpose: "První bezpečný nácvik P2 odchozího hovoru: zjištění potíží, nabídka vzorku a dokončení údajů.",
    opening: "Dobrý den, tady [vaše jméno] z Countdown. Mluvím prosím s {{customer_name}}? Volám krátce k vašemu zájmu o vzorek pro podporu kloubů. Hodí se vám teď minuta?",
    sections: [
      { title: "Zjištění situace", text: "Zeptej se, jak dlouho obtíže trvají, v čem zákazníka omezují a co by pro něj znamenala změna. Naslouchej; nediagnostikuj." },
      { title: "Představení nabídky", text: "Drž se schválených informací. Nabídni bezplatný vzorek jako možnost vyzkoušení, bez slibování konkrétního účinku nebo výsledku." },
      { title: "Závěr hovoru", text: "Po souhlasu ověř jméno a doručovací adresu. Poděkuj, shrň domluvu a přirozeně se rozluč." },
    ],
  },
  {
    id: "p2-vitality-free-sample",
    title: "P2 · Vitalita · první kontakt",
    productLabel: "Program vitality – bezplatný vzorek",
    purpose: "Nácvik citlivého, věcného P2 rozhovoru bez medicínských slibů a bez tlaku na zákazníka.",
    opening: "Dobrý den, tady [vaše jméno] z Countdown. Mluvím prosím s {{customer_name}}? Volám krátce k vašemu zájmu o vzorek programu vitality. Hodí se vám teď minuta?",
    sections: [
      { title: "Zjištění situace", text: "Ptej se citlivě, jak dlouho zákazník řeší svůj komfort, v čem jej omezuje a co by chtěl ve svém běžném dni zlepšit. Netlač na odpověď." },
      { title: "Představení nabídky", text: "Používej pouze schválený popis programu. Nevydávej se za lékaře, nedávej zdravotní doporučení a negarantuj výsledek." },
      { title: "Závěr hovoru", text: "Po souhlasu ověř jméno a doručovací adresu. Poděkuj, shrň domluvu a přirozeně se rozluč." },
    ],
  },
];

export const TRAINING_PERSONAS: TrainingPersona[] = [
  { id: "marie-kralova", name: "Marie Králová", profile: "Má občasné potíže s koleny při delší chůzi. Chce si nejdřív v klidu zjistit, co přesně jí nabízíte.", deliveryAddress: "Jabloňová 18, 779 00 Olomouc" },
  { id: "petr-sedlacek", name: "Petr Sedláček", profile: "Dlouhodobě řeší únavu a nechce naletět marketingovým slibům. Ocení stručné, normální vysvětlení.", deliveryAddress: "Křižíkova 42, 301 00 Plzeň" },
  { id: "jana-dvorakova", name: "Jana Dvořáková", profile: "Zajímá ji, zda jde vzorek doručit bez složitého objednávání. Potřebuje mít jistotu, že na ni nikdo netlačí.", deliveryAddress: "Na Výsluní 7, 460 01 Liberec" },
];

const seriousComplianceRules: Array<Omit<ComplianceFinding, "phrase" | "occurrences"> & { patterns: RegExp[] }> = [
  {
    patterns: [/jsem (váš |)lékař/i, /jako lékař/i, /doktor vám to doporuč/i],
    reason: "Operátor se nesmí vydávat za lékaře ani vytvářet dojem odborné zdravotní autority.",
    saferAlternative: "Mohu vám popsat schválené informace o programu; zdravotní otázky prosím konzultujte s lékařem.",
    severity: "serious",
  },
  {
    patterns: [/garantuji.{0,40}(výsledek|účinek|zlepšení|uzdravení)/i, /(určitě|stoprocentně|na 100 ?%).{0,40}(pomůže|zabere|vyléčí)/i],
    reason: "Nesmí se garantovat účinek, výsledek ani uzdravení.",
    saferAlternative: "Nemohu slíbit konkrétní výsledek. Mohu vysvětlit, jak je program popsaný ve schválených materiálech.",
    severity: "serious",
  },
  {
    patterns: [/(vyléčí|uzdraví|léčí).{0,40}(kloub|bolest|erekci|problém)/i],
    reason: "Program se nesmí prezentovat jako léčba nebo náhrada zdravotní péče.",
    saferAlternative: "Nejde o léčebné tvrzení. Mohu nabídnout vzorek a držet se schváleného popisu programu.",
    severity: "serious",
  },
];

export function getTrainingScenario(scriptId: string, difficulty: TrainingDifficulty, personaId: string): TrainingScenario | null {
  const script = P2_TRAINING_SCRIPTS.find((candidate) => candidate.id === scriptId);
  const customer = TRAINING_PERSONAS.find((candidate) => candidate.id === personaId);
  if (!script || !customer || !["easy", "standard"].includes(difficulty)) return null;
  const initialMessage = difficulty === "easy"
    ? `Dobrý den, tady ${customer.name}. Ano, vzorek mě zaujal. Můžete mi stručně říct, jak to funguje?`
    : `Dobrý den, tady ${customer.name}. Vzorek mě sice zaujal, ale podobným nabídkám moc nevěřím. Co přesně ode mě potřebujete?`;
  return { ...script, difficulty, customer, initialMessage };
}

export function personaliseTrainingScript(scenario: TrainingScenario): TrainingScriptSection[] {
  return [{ title: "Začátek hovoru", text: scenario.opening.replace("{{customer_name}}", scenario.customer.name) }, ...scenario.sections];
}

export function findComplianceFindings(messages: TrainingMessage[]): ComplianceFinding[] {
  const operatorText = messages.filter((message) => message.sender === "user").map((message) => message.text).join("\n");
  return seriousComplianceRules.flatMap((rule) => {
    const matches = rule.patterns.flatMap((pattern) => Array.from(operatorText.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))));
    if (matches.length === 0) return [];
    return [{ phrase: matches[0][0], reason: rule.reason, saferAlternative: rule.saferAlternative, severity: rule.severity, occurrences: matches.length }];
  });
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function evaluateTrainingSession(scenario: TrainingScenario, history: TrainingMessage[]): TrainingScorecard {
  const operatorText = history.filter((message) => message.sender === "user").map((message) => message.text.toLocaleLowerCase("cs-CZ")).join(" ");
  const findings = findComplianceFindings(history);
  const discoveryScore = includesAny(operatorText, ["jak dlouho", "omezuje", "co by se změnilo", "v čem"]) ? 100 : 55;
  const scriptScore = includesAny(operatorText, ["vzorek", "program", "nabíd"]) ? 90 : 55;
  const offerScore = includesAny(operatorText, ["zdarma", "nabíz", "mohu vám poslat"]) ? 90 : 60;
  const closingScore = includesAny(operatorText, ["adresa", "doruč", "děkuji", "rozlou"]) ? 100 : 45;
  const complianceScore = findings.length === 0 ? 100 : Math.max(0, 45 - findings.reduce((total, finding) => total + Math.max(0, finding.occurrences - 1) * 15, 0));
  const overallScore = Math.round((discoveryScore + scriptScore + offerScore + closingScore + complianceScore) / 5);
  const passed = findings.length === 0 && overallScore >= 70;
  const grade: TrainingScorecard["grade"] = overallScore >= 85 ? "A" : overallScore >= 70 ? "B" : overallScore >= 55 ? "C" : "D";
  const strengths: string[] = [];
  if (discoveryScore >= 90) strengths.push("Položil/a jste otázku, která pomáhá pochopit situaci zákazníka.");
  if (closingScore >= 90) strengths.push("Hovor jste přirozeně dovedl/a k ověření doručovacích údajů.");
  if (findings.length === 0) strengths.push("Nevyskytlo se žádné závažné zakázané tvrzení.");
  const improvements: string[] = [];
  if (discoveryScore < 90) improvements.push("Nejdřív zjistěte, jak situace zákazníka vypadá a co pro něj změna znamená.");
  if (closingScore < 90) improvements.push("Po souhlasu nezapomeňte nabídku uzavřít ověřením adresy a poděkováním.");
  if (findings.length > 0) improvements.push("Závažné právní tvrzení musí příště nahradit bezpečná formulace uvedená níže.");
  return {
    overallScore, grade, passed, discoveryScore, scriptScore, offerScore, closingScore, complianceScore,
    complianceFindings: findings, strengths, improvements,
    summaryFeedback: passed
      ? `Cvičný P2 hovor se zákazníkem ${scenario.customer.name} je splněn. Výsledek je tréninkový; nevznikla objednávka ani úkol pro ostrý provoz.`
      : "Cvičení je zaznamenáno, ale ještě není splněno. Projděte konkrétní zpětnou vazbu a zkuste jej znovu.",
  };
}
