# Countdown CRM — historická vizuální revize (17. 11. 2026)

> Historický podklad z doby před produkčním nasazením. Aktuální stav prostředí je v [OPERATIONS.md](OPERATIONS.md), otevřené úkoly v [To-Do](To-Do/To-Do.md).

**Datum:** 17. 11. 2026  
**Prostředí:** tehdejší lokální vývojová aplikace se syntetickými daty; produkční prostředí v té době nebylo nasazené  
**Rozsah:** tehdejší vizuální průchod klíčových obrazovek rolí administrátor, vedoucí týmu a operátor; doplněno o funkční a technické nálezy z předchozí revize v tomto chatu.

## Shrnutí

Aplikace má konzistentní tmavé rozhraní, srozumitelné názvy sekcí a u většiny obrazovek jasně rozlišuje prázdný stav, upozornění a omezený přístup. Vedoucí týmu vidí omezení své fronty výjimek a rozhraní tréninku odlišuje simulaci od skutečného hovoru i doporučení AI od lidského hodnocení. Vizuální kontrola ale neznamená úplné ověření všech funkcí ani jistotu pro produkční provoz.

Nejdůležitější otevřené body jsou chyba při zakládání pracovníka s částečně uloženými daty, nehotové a neschválené produktové skripty, šest záznamů bez přiřazeného týmu a nesoulad stavových štítků v operátorské konzoli. Telefonie a AI prognóza nejsou v tomto pilotu dostupné.

## Prioritizované nálezy

### P1 — opravit zakládání pracovníka a částečný zápis

Při přidání uživatele rozhraní skončilo hláškou `Workspace member profile lookup failed`. Přesto již existoval autentizační účet a členství v pracovním prostoru; navazující vytvoření profilu či přiřazení týmu selhalo nebo se neprovedlo a následné načtení pracovníka skončilo chybou. Předchozí kontrola ukázala oblast v `memberships.ts` kolem řádků 435–481. Ověřit oprávnění, pořadí zápisů a jejich atomické dokončení/vrácení, aby uživateli nezůstával neúplný účet.

### P1 — nepouštět operátory na neschválené skripty

V katalogu jsou tři produkty, ale pouze jeden skript je publikovaný; jde o výslovně lokální testovací text, který varuje před použitím u skutečného zákazníka. Další dva skripty jsou záložní a administrátorská obrazovka hlásí, že produkty nemají publikovaný prodejní skript. Před reálným hovorem musí být schválený obsah pro příslušný produkt. V pilotu zůstává telefonie vypnutá.

### P1 — rozhodnout vlastnictví šesti nepřiřazených záznamů

Administrace ukazuje 6 záznamů bez týmu, 9 zákazníků a 9 položek fronty. Obrazovka vysvětluje, že bez přiřazení je neuvidí nikdo kromě administrátora. Určit pravidlo a záznamy přiřadit, případně vysvětlit, proč mají zůstat bez týmu. Nic nebylo automaticky přeřazeno.

### P1 — ověřit oprávnění i na serveru u citlivých akcí

Vizuální průchod potvrdil, že operátor při přímé návštěvě správy uživatelů dostane stránku s omezeným přístupem a že vedoucí týmu vidí pouze částečnou frontu výjimek. To samo nepotvrzuje ochranu serverových akcí. Read-only statická kontrola subagentů upozornila, že proxy vyžaduje přihlášení pro běžné stránky, ale role se ověřuje až v serverové stránce, serverové akci nebo DAL. Některé trasy používají pouze kontrolu workspace členství, zatímco jiné výslovně kontrolují roli. `/leads` a `/audit` mají kontrolu role v klientském UI, což samo nestačí; proxy také vynechává přihlášení pro celé `/api`, takže každá API trasa musí mít vlastní guard. Prověřit všechna API a citlivé akce pro správu členů, týmů, exporty, telefonii a data mimo vlastní tým.

Zvláštní testovací omezení: výjimka pro demo přihlášení v development režimu může vracet administrátorskou roli. Výchozí smoke test pak neověří oddělení rolí. Smoke skript zná očekávané role v seznamu tras, ale nepřihlašuje se pod nimi. Test s `SMOKE_TEST_EMAIL` a `SMOKE_TEST_PASSWORD` skutečně přihlašuje a může ovlivnit data; mělký smoke proto není důkazem izolace rolí.

### P2 — sjednotit stav operátorské konzole

V jednom aktuálním snímku horní štítek říká „Připraveno k přiřazení“, přestože už je zákazník přiřazený. Následující krok současně říká „Připraveno k volání“. Sjednotit hlavní stav a další krok tak, aby operátor věděl, zda čeká na přidělení, nebo může volat.

### P2 — opravit poškozený text testovací poznámky

Kontext hovoru u syntetického leadu obsahoval chybnou diakritiku: „Syntetick? lok?ln? test d?lky hovoru…“. Vypadá to na uložený testovací obsah nebo problém s kódováním. Prověřit zdroj a kódování; uživatelsky uložený obsah neopravovat automaticky bez kontroly.

### P2 — projít dosud neověřený hlavní pracovní tok

Předchozí průchod načetl frontu, přidělil syntetický lead operátorovi, zahájil vytáčení a hovor ihned zrušil. Dokončený skutečný hovor neproběhl. Byl dokončen syntetický trénink a jeho záznam se zobrazil vedoucímu týmu. Proveďte úplný test na syntetických datech: přidělení → výsledek hovoru → případná objednávka → kontrola vedoucím → obnovení stránky a ověření uložení. Bez živé telefonie.

Statická kontrola podkladů uvádí, že dokončení hovoru s objednávkou jde přes idempotentní databázové RPC s kontrolami relace, operátora, leadu a přiřazení. Existují SQL autorizační testy a runtime kontraktní testy, ale Vitest runtime testy používají mockovanou DB; samy nepotvrzují běh SQL v cílovém prostředí. Po zprovoznění bezpečného syntetického průchodu ověřit skutečné RPC a načtení výsledku po obnovení stránky.

U objednávek ověřit na syntetických datech: více produktů stejné měny projde, chybějící nebo rozdílná měna se odmítne a cena/měna sedí po opětovném načtení. Datová vrstva i migrace mají kontroly měny a existují SQL scénáře, avšak provozní databázový průchod nebyl potvrzen. Export pro dopravce má testy formátu CSV, nikoli převzetí souboru dopravcem.

Statická kontrola Záznamů hovorů našla opatrné zobrazení hodnot jednotlivých hovorů bez souhrnu tržeb a bez předstírání, že každý hovor má přepis. Dostupné testy kontrolují hlavně texty a kontrakty; načtení skutečných dat a omezení podle rolí je nutné ověřit. Zahrnout hovor s přepisem i bez něj, bez hodnoty objednávky a v různých stavech kontroly.

### P2 — prověřit závislosti a bezpečnostní hlášení

Předchozí běh `npm ci` uvedl 25 zranitelností závislostí (10 středních, 15 vysokých). Nebyl spuštěn `npm audit fix`. Znovu ověřit aktuální stav, určit dotčené balíčky a naplánovat bezpečnou aktualizaci. Jde o výsledek předchozího běhu, ne o nové ověření v tomto vizuálním průchodu.

### P2 — doplnit přístupnost a malé obrazovky

Tento průchod neověřoval čtečku obrazovky, skutečné mobilní zařízení ani přiblížení 200 %. Některé vedlejší texty jsou drobné; tlačítko pro uložení předvoleb je na snímku nastavení až u spodního okraje a vyžaduje posun. Ověřit klávesnici, kontrast a ovládání při zvětšení; na telefonu zkontrolovat, že obsah ani pevná lišta nezakrývají akce.

### P3 — produktový katalog a uložený obsah

Tři produktové karty nemají obrázky a jejich uložené popisy/kategorie jsou zčásti anglicky; u každého produktu je 0 námitek. Rozhodnout, zda obrázky a české produktové texty patří do dalšího vydání. Texty jsou uložená projektová data, proto je bez schválení nepřepisovat.

### P3 — automatizace a AI prognóza

Automatizace mají nulový počet pravidel, spuštění i chyb; stránka správně ukazuje prázdný stav a označuje simulaci jako testovací. AI prognóza příjmů není dostupná, protože pilot nemá připojený predikční model ani zdroj pravděpodobností. Nejdřív rozhodnout o produktu a zdroji dat; UI již nedostupnost vysvětluje.

### P3 — ověřit životní cyklus zásilky a měsíční uzávěrky

Read-only kontrola kódu našla webhook dopravce, který váže objednávku ke správnému workspace a převádí známé stavy; databázové testy se zabývají týmovými oprávněními. Není ovšem ověřen celý tok webhook → historie/stav objednávky → fronta P3/P4, včetně opakovaných a opožděných událostí. Bezpečný budoucí test použije syntetickou zásilku, mezistav, doručení, vratku a opakovanou událost.

Migrace uzávěrky podle statické kontroly odečítá vratku v měsíci návratu a omezuje uzávěrku na dokončené měsíce. Je k tomu SQL test, který v této revizi nebyl spuštěn. Dále ověřit doručení v jednom měsíci a vratku v dalším, opakované spuštění uzávěrky a absenci duplicitní transakce. Stav aplikace těchto migrací v konkrétním sandboxu tato revize nepotvrdila.

## Co se podařilo ověřit

- Přihlášení a hlavní obrazovky třech rolí se načetly.
- Operátorovi se zobrazila blokace správy uživatelů a týmů.
- Vedoucí týmu viděl dvě otevřené výjimky a upozornění, že kontroly celého pracovního prostoru jsou pouze pro administrátora.
- Přehled tréninku zobrazil dokončenou syntetickou relaci. Detail uvádí zdroj hodnocení `rule-engine` a výslovně odlišuje strojové doporučení od lidského verdiktu.
- Report příjmů vysvětluje, že hodnoty v různých měnách nesčítá, a že AI prognóza není dostupná.
- Plán hovorů ukazuje srozumitelný prázdný stav; objednávky používají horizontálně posuvný Kanban a upozorňují na další sloupce mimo výřez.
- V předchozím technickém běhu prošlo `npm run verify:all` (lint, typy, 218 souborů / 1126 testů, produkční build) a `npm run verify:migrations` (139 migrací). Nejsou to kontroly spuštěné v rámci tohoto aktuálního vizuálního průchodu.
- Subagenti provedli read-only kontroly tras/rolí, datových workflow a plán přístupnostního průchodu. Jejich kódové nálezy jsou statické; nespouštěli aplikaci, databázi ani další testy.

## Doporučené pořadí dalšího ověřování rolí

1. **Operátor:** `/console`, `/schedule`, `/orders`, `/products`, `/training`; pokusy o přímý přístup na `/leads`, `/team`, `/reports`, `/admin` a související API.
2. **Vedoucí týmu:** `/team`, `/team/exceptions`, `/team/reviews`, `/reports`, `/leads`, `/wallet`; ověřit, že přehled i změny zůstávají v jeho týmu a správa workspace je zamítnutá.
3. **Administrátor:** `/admin`, správa uživatelů, vlastnictví a nastavení, skripty, automatizace, audit a telefonní nastavení; ověřit změny pouze ve správném workspace.
4. **Všechny role:** detail leadu, objednávky a hovoru, přímé volání serverových akcí/API, prázdné/chybové/stavové obrazovky, vlastníkem omezené záznamy a exporty.

Pro přístupnostní průchod samostatně ověřit fokus a ovládání klávesnicí, čtečku obrazovky včetně oznámení změn, reflow při 200% přiblížení a mobilní šířku. Statické atributy v kódu nejsou náhradou testu se čtečkou obrazovky. Projektový To-Do již zmiňuje další práci na přístupnosti a stavech editoru; tato zpráva neurčuje schválený harmonogram.

## Záznamy z průchodu a snímky

Snímky jsou z aktuálního lokálního průchodu. Otevřené prostředí prohlížeče mělo neobvyklé škálování; černou volnou plochu vpravo/dole proto nepovažuji za potvrzenou chybu responzivity. Při plném auditu je potřeba snímky zopakovat při běžném měřítku, na mobilní šířce a při přiblížení.

| # | Obrazovka | Zjištění | Snímek |
|---|---|---|---|
| 1 | Přihlášení | Čistý formulář, jasná hlavní akce. | [01-login](audits/2026-11-17-visual/01-login.png) |
| 2 | Přehled reportů | Další doporučený krok je viditelný; živá telefonie označena jako nedostupná. | [02-admin-reports](audits/2026-11-17-visual/02-admin-reports.png) |
| 3 | Správa | Upozornění na chybějící publikované skripty a 6 nepřiřazených záznamů. | [03-admin-home](audits/2026-11-17-visual/03-admin-home.png) |
| 4 | Produkty a skripty | Jeden publikovaný lokální QA skript, dva záložní; část uložených názvů/popisu je anglicky. | [04-product-scripts](audits/2026-11-17-visual/04-product-scripts.png) |
| 5 | Uživatelé a týmy | 12 pracovníků včetně účtů pro tuto kontrolu; řádky jsou na obrazovce husté. | [05-admin-users](audits/2026-11-17-visual/05-admin-users.png) |
| 6 | Vlastnictví týmů | 6 bez týmu; zákazníci a fronta se přiřazují odděleně. | [06-ownership](audits/2026-11-17-visual/06-ownership.png) |
| 7 | Automatizace | Nulový počet pravidel/spuštění a jasný prázdný stav. | [07-automations](audits/2026-11-17-visual/07-automations.png) |
| 8 | Report příjmů | Měny se nesčítají; prognóza označena jako nedostupná; zobrazené metriky jsou čitelné. | [08-report-revenue](audits/2026-11-17-visual/08-report-revenue.png) |
| 9 | Objednávky | Kanban pokračuje horizontálně; stránka na to upozorňuje. | [09-orders](audits/2026-11-17-visual/09-orders.png) |
| 10 | Výjimky vedoucího | 2 otevřené / 2 kritické; omezení přístupu vysvětlené. | [10-team-exceptions](audits/2026-11-17-visual/10-team-exceptions.png) |
| 11 | Týmový přehled | Denní souhrn a týmové karty; další sekce pokračují níže. | [11-team-overview](audits/2026-11-17-visual/11-team-overview.png) |
| 12 | Kontroly tréninků | Jedna dokončená syntetická relace s přímou akcí „Otevřít kontrolu“. | [12-team-reviews](audits/2026-11-17-visual/12-team-reviews.png) |
| 13 | Detail tréninku | Přepis a metriky; strojový zdroj a oddělení lidského hodnocení jsou uvedeny. | [13-training-review](audits/2026-11-17-visual/13-training-review.png) |
| 14 | Operátorská konzole | Přiřazený lead, ale hlavní stav nesouhlasí s dalším krokem; poškozená testovací diakritika. | [14-operator-console](audits/2026-11-17-visual/14-operator-console.png) |
| 15 | Katalog produktů | Všechny tři karty bez obrázku; uložené popisy jsou anglicky. | [15-product-catalog](audits/2026-11-17-visual/15-product-catalog.png) |
| 16 | Plán hovorů | Přehledný prázdný stav s akcí pro novou připomínku. | [16-schedule-empty](audits/2026-11-17-visual/16-schedule-empty.png) |
| 17 | Blokace operátora | Vysvětlení, že správu uživatelů/týmů má pouze administrátor. | [17-operator-denied-admin](audits/2026-11-17-visual/17-operator-denied-admin.png) |
| 18 | Nastavení operátora | Profil je pouze ke čtení; ovládání zvuku je viditelné; uložení je při tomto výřezu u spodního okraje. | [18-operator-settings](audits/2026-11-17-visual/18-operator-settings.png) |

## Stav syntetického testování

Při předchozím testu vznikly v lokálním Supabase účty administrátora, vedoucího týmu a operátora a jeden další účet pro reprodukci chyby založení pracovníka. Jejich hesla do této zprávy nezapisuji. Po testu zůstaly lokálně syntetické změny: testovací pracovníci, jeden přiřazený lead, nedokončený/ihned zrušený pokus o vytáčení a uložená syntetická tréninková relace. Jedna chyba testovacího toku se krátce objevila, při následné kontrole již aktuální fronta ukazovala dvě otevřené položky. Nic nebylo změněno v propojeném vzdáleném sandboxu ani v produkci.

## Co tato revize nepokrývá

- Neprošla všechny trasy a všechny kombinace rolí, formuláře, validace, chybové stavy ani serverová oprávnění.
- Neověřila mobilní zařízení, 200% přiblížení, čtečku obrazovky, úplné kontrasty ani fyzický zvuk.
- Neproběhl skutečný hovor ani plný tok objednávky od hovoru přes přetrvání po opětovné načtení.
- Nejde tedy o 100% záruku správnosti; další práce má začít opravou zakládání pracovníka a přípravou bezpečných schválených skriptů.
