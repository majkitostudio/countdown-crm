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
