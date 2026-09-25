# Product Direction

## Product Identity

**FACT:** Countdown CRM je workspace-scoped CRM pro výkonnostní call centra a tele-sales. Řeší hlavně problém, jak operátorovi během citlivého rozhovoru rychle zpřístupnit zákaznický kontext, schválený text, pracovní stav a bezpečný další krok bez zbytečné administrativy.

## Primary Users

**FACT:** Primární uživatel je operátor. Team Leader pracuje s týmovým přehledem, asistencí, callbacky, kvalitou a review. Administrator spravuje workspace-global nastavení, výjimky, členství a další administrativní oblasti.

## Core Workflow

**FACT:** Operátor dostane nebo přijme lead, otevře zákaznický kontext, pracuje se schváleným Product Scriptem, vede hovor, uloží outcome a pokračuje callbackem, objednávkou nebo dalším leadem. Kontext má být dostupný v jedné pracovní ploše a další krok má být pravdivý vzhledem k dostupným datům.

## Product Principles

- **DECISION:** Operator-first workflow: klient, problém a bezpečný další krok jsou důležitější než administrativní pohodlí.
- **DECISION:** Pravdivost stavů: simulator, fallback, AI-assisted a unavailable se nesmí prezentovat jako live integrace nebo jistý AI výsledek.
- **DECISION:** Bezpečnost a soukromí: workspace a role se vynucují serverem a RLS; citlivá témata používají schválený jazyk.
- **DECISION:** Auditovatelnost: významné změny, review a finanční nebo bezpečnostní akce musí mít odpovídající stopu.
- **DECISION:** Důkazy se nesměšují: statický test, lokální fixture, browser smoke, Sandbox read-back a live provider evidence jsou různé typy důkazu.

## Current Direction

**FACT / PLAN:** Projekt se stabilizuje před interním pilotem. Prioritou je spolehlivý souvislý pracovní den operátora, směny a dostupnost, dokončení použitelnosti onboardingového tréninku a provozní stabilita AI, migrací a telefonie.

**FACT / PLAN:** Team Workspace a Team Checkpoint se rozvíjejí v omezeném, týmově pravdivém rozsahu. Team Leader nemá automaticky získat celý workspace a workspace-global výjimky zůstávají administrátorské.

**FACT / PLAN:** Telnyx live provider bude řešen až po získání a ověření správného čísla. Další audio/transcription práce se má opírat o stabilní telefonní a datový kontrakt.

## Explicitly Not The Goal

- **FACT / DECISION:** Není cílem obecný AI copilot, další AI skóre nebo live AI predikce vydávaná za jisté rozhodnutí.
- **FACT / DECISION:** Není cílem vydávat training nebo simulovaný softphone za živou ústřednu.
- **FACT / DECISION:** Není cílem před stabilizací hlavní smyčky rozšiřovat Wallet, workflow, produkty a další globální oblasti o týmové vlastnictví.
- **FACT / DECISION:** Není cílem nahrazovat schválený zdravotně citlivý text diagnostikou nebo generovanými léčebnými sliby.

## Current Product Priorities

**PLAN, odvozeno z aktuálního backlogu:**

1. Bezpečnost a shoda databáze před pilotem, včetně odloženého Auth hardeningu ve správný čas.
2. Stabilní a pravdivá hlavní pracovní smyčka operátora.
3. Ověřitelný interní onboardingový trénink bez obchodního side effectu.
4. Směny, dostupnost, kvalitativní review a týmový provoz v pravdivém scope.
5. Provozní stabilita AI, migrací a telefonie.

## Frozen / Deferred Areas

- **DEFERRED:** Živá Telnyx telefonie do vyřešení čísla, konfigurace a ověřovacího průchodu.
- **DEFERRED:** Audio/transcription směr do stabilní telefonie a opakovatelného audio kontraktu.
- **DEFERRED:** Rozšíření team ownership do workflow, produktů a Walletu.
- **DEFERRED:** Externí pilot readiness a Auth hardening do explicitního předpilotního kroku.
