# Countdown CRM — kompaktní historický archiv

Tento soubor nahrazuje starší množství plánů, specifikací, checkpointů a ověřovacích reportů. Slouží jako orientační historie, nikoli jako aktuální zadání. Detailní staré soubory byly záměrně zkompaktovány, aby dokumentace nerostla bez kontroly.

## Vývoj produktu

- Projekt vznikl jako workspace-scoped CRM pro výkonnostní call centrum a tele-sales.
- Postupně vznikly role operátor, Team Leader a administrátor.
- Byl navržen a rozšiřován tok lead → zákaznický kontext → hovor → výsledek → callback, objednávka nebo další lead.
- Operator Console získala vlastní sjednocený vizuální a pracovní systém.
- Přibyly týmové fronty, výjimky, pomoc operátorům, směny, týmový dohled a výsledky.
- Přibyly objednávky, produkty, telefonní integrační vrstvy, onboardingový trenér a kontrola kvality pomocí AI.

## Technická a bezpečnostní historie

- Projekt používá role-aware přístup, workspace scope, serverové datové vrstvy a Supabase bezpečnostní hranice.
- Historické práce ověřovaly databázovou paritu, migrace, RLS, cross-team odmítnutí, autentizované browser průchody a stavové kontrakty.
- Telefonní práce oddělily lokální validační cestu od produkční Telnyx integrace.
- AI kontrola kvality byla navržena jako omezená pomocná vrstva, nikoli jako autoritativní zdroj obchodních dat.
- Demo prostředí používá syntetická data a nesmí být zaměňováno za produkční napojení.

## Co z historie zůstává důležité

- Oprávnění a workspace hranice se musí ověřovat na serveru, ne jen schovat v menu.
- Systém má zachovávat pravdivou historii hovorů, objednávek, výsledků a hodnocení.
- Dílčí selhání integrace nesmí zablokovat celý dostupný pracovní prostor.
- Každá role musí dostávat jen informace a akce odpovídající její odpovědnosti.
- Browser smoke test a automatické testy jsou důkazem konkrétního scénáře, ne důkazem celkové produktové použitelnosti.

## Co už není aktuální autorita

- Starší formulace, že Countdown je primárně nebo výhradně Operator Console.
- Staré pořadí P1/P2/P3 práce.
- Jednotlivé historické návrhy obrazovek a navigace.
- Tvrzení o dokončení založená pouze na tehdejším buildu nebo jednom browser průchodu.

## Historické zdroje, které byly sloučeny

Sloučeny byly starší soubory z těchto skupin:

- `docs/superpowers/plans/` — implementační plány;
- `docs/superpowers/specs/` — produktové a technické specifikace;
- `docs/superpowers/reports/` — ověřovací reporty;
- `docs/checkpoints/` — projektové checkpointy;
- starší kořenové stavové, workflow, telephony a kontraktové dokumenty;
- dřívější soubory v `docs/ai/`, jejichž aktuální obsah je nyní rozdělen mezi `START_HERE.md`, `PRODUCT_VISION.md` a `PROJECT_GUIDE.md`.

Pokud někdy bude potřeba detailní důkaz konkrétního historického scénáře, musí se vytvořit nový cílený report s datem a jasně popsanou hranicí ověření. Historické dokumenty se nemají vracet jako běžná pracovní dokumentace.

## Říjen 2026 — Stabilizace a tříúrovňový browserový audit rolí
- **Fáze 0 (Stabilizace):** opraven dokumentační test `p0-3-remote-db-evidence.test.ts`, jazyková oprava v `training/page.tsx` (commit `8b4355f`), test suite 147/147 test souborů (687/687 testů) a TypeScript čistý.
- **Fáze 1 (Operator Browser Audit & Hardening):** reálný průchod operátora hovorem, zápisem poznámek a outcome flow. Proveden security hardening v commitu `ce1e77c` (vyřešen HTTP 500 na `/audit`, skryto tlačítko `Create Order` mimo hovor, sjednoceny zamčené hlášky).
- **Fáze 2 (Role & navigace):** zúženo menu Team Leadera ze 17 na 15 položek (odstraněny generické moduly Deals & Pipelines a Workflows), přejmenován Security Audit Log na Audit Log, změněna výchozí adresa Administrátora na /dashboard, Control Checkpoint přesunut na /controls s HTTP 308 redirectem (commit `3bb2268`).
- **Fáze 3 (Operator ergonomie & Call Workflow):** diferencovaný Fail outcome (nepovinná poznámka pro rychlá odmítnutí klienta ihned po představení vs. povinná poznámka pro námitky ceny a důvěry pro kontext P4 fronty), globální zúžení PageHeader (p-4 sm:p-5), zmenšení záhlaví zákazníka v konzoli a zachování plovoucího ovládání hovoru bez nechtěného lepení prvků k hornímu okraji.
- **Fáze 4 (Slice 4.1 — Řešení námitek v Operator Console):** implementovány rychlé klikací bubliny nejčastějších námitek pod skriptem ve standardním režimu, dynamické skrytí bublin v extended focus režimu a zobrazení tlačítka pro vysunutí katalogu námitek (ObjectionDrawer v read-only režimu).


