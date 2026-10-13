# Countdown CRM — stručná historie a rozhodnutí

Tento soubor zachycuje jen vývojové milníky a rozhodnutí, která pomáhají chápat dnešní podobu systému. Není to seznam úkolů ani autorita o aktuálním stavu kódu. Aktuální stav ověřujte v repozitáři; současný směr práce je v [START_HERE.md](../START_HERE.md).

## Vývoj systému

- **Základ CRM:** workspace-scoped aplikace pro call centrum s rolemi Operátor, Team Leader a Administrátor; postupně vznikly leady, zákaznický kontext, hovory, callbacky, produkty a objednávky.
- **Operator Console:** sjednocená pracovní plocha pro práci s přiděleným leadem, prodejním kontextem, výsledkem hovoru a navazující akcí.
- **Týmový provoz:** přibyly týmová správa, výjimky, žádosti o pomoc, kontrola kvality a trénink.
- **Prodej a expedice:** vznikly položky objednávek, historie stavů, sledování zásilek a exporty pro dopravce.
- **P1–P4:** byla doplněna obecná kostra kampaní/oddělení a časových pravidel pro standardní odchozí práci, retenci a záchranu vybraných případů.
- **Říjen 2026 — zjednodušení:** odstraněny slepé routy `/objects/[slug]`, `/monitor`, `/audio-preview` a generický Object Builder. Obrazovka objednávek nyní nabízí Kanban i tabulkový pohled.
- **Říjen 2026 — druhá vlna pročištění (hotovo):** odstraněny generické funkce, které nepatří ke specializovanému call-center produktu — blueprints (multi-industry šablony), custom schema / „Attio“ pole a obecný kanban/filtry u leadů. Zároveň opravena duplicitní verze migrace.
- **Říjen 2026 — roadmapa:** další práce se řídí fázemi 0–7 v [ROADMAP.md](ROADMAP.md); dokumentace byla sjednocena a historické audity přesunuty do `docs/archive/`.
- **Říjen 2026 — navigace a struktura (Fáze 1 a 2, hotovo):** levé menu je rozdělené do sekcí (Work · Team · Reporting · Learn · Administration · Account) s jedním **Management** (`/admin`) pro administrátora. Fáze 2 srovnala názvy (titulky anglicky, popisy česky), sloučila obrazovky (Products & Scripts, Reports, Team Workspace) a převedla URL na `/console`, `/schedule`, `/call-logs`, `/reports`, `/automations`, `/admin/users` a `/team/*`; staré cesty se přesměrovávají.

## Trvalá produktová rozhodnutí

- Countdown je širší provozní CRM, ne pouze Operator Console.
- Projekt se **průběžně stabilizuje a iterativně vylepšuje**; není na něj kladen tlak dokončit či prodat MVP.
- Call centrum je velkoobjemové a příjem leadů má být automatizovaný. Dnešní kostra se připravuje na budoucí zdroj; PM nemusí mít zdroj leadů k dispozici ani jej nyní integrovat.
- P1–P4, produkty i zdroje mají být obecné a nastavitelné. Příklady zdrojů či akcí nejsou pevná pravidla produktu.
- AI je pomocník pro kontext, trénink a kvalitu, ne autorita nad skutečným stavem hovoru, objednávky nebo oprávnění.
- Produkční telefonie/VoIP (včetně Telnyx) je odložena na neurčito. Neplánovat související náklady ani práci, dokud se priorita nezmění.
- Demo data jsou syntetická a nesmějí být zaměňována za produkční data.

## Důležité hranice historických tvrzení

- Historické audity a AI worklogy mohou obsahovat staré cesty, návrhy i tehdejší počty testů. Nepoužívat je jako aktuální popis produktu.
- Úspěšná automatická testovací sada dokládá pouze pokryté scénáře; nedokládá sama o sobě použitelnost, živé napojení ani čisté nasazení databáze.
- Starší audit uváděl konkrétní problémy a návrhy, které se od té doby změnily. Aktuální plán dalších fází je v [ROADMAP.md](ROADMAP.md); detailní historická zjištění jsou v [archive/](archive/).
