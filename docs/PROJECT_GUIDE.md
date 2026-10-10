# Countdown CRM — pracovní a technický průvodce

Tento soubor obsahuje pouze aktuální pravidla pro práci. Historické plány a výsledky jsou shrnuté v `HISTORY_COMPACT.md`.

## Zdroj pravdy

- Zdrojový kód a testy ukazují aktuální technický stav.
- `START_HERE.md` ukazuje aktuální směr práce.
- `PRODUCT_VISION.md` definuje produktovou identitu a oblasti.
- Tento soubor definuje bezpečný pracovní postup.
- Demo data nejsou produkční data.
- Historické audity, exporty a starší stavové záznamy nejsou automaticky platné zadání.
- Aktuální priority průběžně určuje PM; roadmapa není závazek dokončit MVP.

## Jak postupovat při každém úkolu

1. Popsat problém lidským jazykem.
2. Určit roli, produktovou oblast a konkrétní workflow.
3. Zkontrolovat, zda už podobné řešení existuje.
4. Navrhnout nejmenší smysluplnou změnu.
5. U změny chování nejdříve definovat ověřitelný scénář nebo test.
6. Implementovat pouze schválený rozsah.
7. Ověřit testy, typy, lint a relevantní browser průchod.
8. Popsat, co bylo ověřeno a co zůstává nejisté.

## Produktový audit

Při hodnocení obrazovky se ptáme:

- Kdo ji používá?
- Jaký pracovní úkol na ní dokončuje?
- Co má uživatel pochopit během několika sekund?
- Jaká je hlavní akce?
- Co je zbytečné, duplicitní nebo předčasné?
- Co se stane při načítání, prázdném stavu, chybě a nedostupné integraci?
- Funguje tok opakovaně během pracovního dne?

Audit má oddělit tři věci: problém v navigaci, problém v návrhu obrazovky a problém ve skutečné funkci nebo datech.

## Bezpečnostní hranice

- Demo režim nesmí být automaticky povýšen na produkční přístup.
- Tajné hodnoty patří pouze do lokálního ignorovaného prostředí.
- Bez výslovného zadání se nepřipojuje živá databáze ani nemění RLS, autentizace nebo migrace.
- AI nástroj nesmí být považován za zdroj pravdy o pracovním stromu.
- Před GitHubem se kontroluje rozdíl souborů, tajné hodnoty, testy, lint, typy a build.
- Velká refaktorizace se nedělá současně s redesignem a změnou business logiky.

## Iterační způsob práce

Projekt se průběžně stabilizuje, rozšiřuje a ladí. Před každou změnou stanovte její rozsah společně s PM; nedoplňujte automaticky další úkoly z historických roadmap.

- Vzhled a použitelnost se mohou iterovat i tehdy, když jiné oblasti zůstávají rozpracované.
- Skutečný zdroj leadů ani produkční telefonie nejsou předpokladem pro vývoj obecné kostry či ostatních workflow.
- Nezobrazujte ani neimplementujte vstupní data, která PM nemá; rozhraní a datový model mají být připravené na budoucí integraci.
- Při úpravě obrazovky zvažte roli, četnost, rozhodnutí ponechat/sjednotit/smazat, důležitost a alternativní UI/UX.
- Historickou poznámku nebo výsledek auditu nejprve porovnejte s aktuálním kódem.

## Kdy je práce hotová

Práce není hotová tím, že stránka vypadá dobře nebo že projde buildem. Hotová je tehdy, když je jasné, komu slouží, jaký problém řeší, jak se používá, co se stane při chybě a jak byl výsledek ověřen.
