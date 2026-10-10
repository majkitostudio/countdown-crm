# Countdown CRM — analýza projektu

**Datum:** 10. 10. 2026  
**Rozsah:** produktová vize, hlavní dokumentace, navigace a obrazovky, práce s leady a objednávkami, P1–P4, migrace a automatické testy.  
**Typ záznamu:** průběžná analýza repozitáře; nenahrazuje kontrolu živé databáze ani provozní pilot.

## Shrnutí pro PM

Countdown CRM má srozumitelnou a hodnotnou vizi: propojit každodenní práci operátora, Team Leadera a administrátora do jednoho provozního systému pro call centrum. Hlavní řetězec je **lead → řízená práce a kontakt → výsledek hovoru → objednávka nebo další krok → týmový dohled a vyhodnocení**. Největší hodnotou není počet obrazovek, ale to, že systém bezpečně a bez ručního přepisování posouvá práci dál.

Projekt má už pevné části této kostry: oddělení P1–P4 v databázové logice, objednávkový proces, historii změn, řízení přístupů, týmové nástroje a automatické testy. Nedávné vyčištění mrtvých cest je v kódu vidět a `/orders` už nabízí Kanban i tabulku.

Tento záznam **není tlak na dokončení MVP ani závazné pořadí vývoje**. Jde o soubor ověřených nesouladů a námětů pro průběžnou stabilizaci a vylepšování. Budoucí automatický přísun leadů patří do obecné kostry, ale jeho integrace není nyní prioritou. Kanban objednávek je již implementovaný.

## Co je ověřeno v repozitáři

- Testy při této analýze: **823 úspěšných / 823**, ve **173 souborech**.
- Migrace: **128 souborů**. Vlastní `npm run verify:migrations` skončil bez staticky nalezených chyb, ale neprovádí skutečný čistý reset PostgreSQL.
- Dvě migrace mají shodný prefix verze `20261007140000`; současná kontrola tuto kolizi nehlásí a její výstup stále říká „ALL 127 MIGRATIONS“.
- Obrazovka objednávek má ve výchozím stavu Kanban a nabízí přepnutí na tabulku.
- Obrazovka `/leads` zobrazuje obecný seznam/tabuli a filtry; nabízí ruční vytvoření leadu i import CSV. Operátoři v tomto adresáři přístup nemají.
- Navigace v kódu obsahuje **17 položek**, zčásti skrytých podle role.
- Telnyx/SIP kód a balíčky stále existují, přestože telefonie je podle aktuálních projektových pravidel odložená.

Testy jsou dobrým důkazem těch scénářů, které pokrývají; samy o sobě nepotvrzují čisté nasazení migrací, napojení živých dat ani připravenost call centra na pilot.

## Záznam zjištění a doporučené akce

### 1. Kolize verzí migrací a příliš optimistický výsledek kontroly — vysoká priorita

**Zjištění:** `20261007140000_p4_queue_recycling.sql` a `20261007140000_shipment_timeline_and_courier_webhook.sql` sdílejí stejnou verzi. Skript `verify-all-migrations.mjs` migrace pouze staticky prochází; nekontroluje jedinečnost verzí ani nespouští SQL v čisté databázi. Jeho úspěšný výsledek proto není důkazem, že Supabase migrace umí správně aplikovat.

**Riziko:** nasazení/reset může narazit na nejednoznačnou migrační historii; současné hlášení navíc přehání rozsah ověření.

**Doporučená akce:** před dalším databázovým nasazením zjistit, zda už byly obě migrace někde aplikovány. Potom zvolit bezpečnou opravu historie, doplnit kontrolu duplicitních verzí a ověřit celý řetězec na čisté PostgreSQL/Supabase databázi. Již aplikovanou migraci nepřejmenovávat bez ověření stavu databází.

### 2. Ruční import leadů versus záměr automatického příjmu — budoucí integrace

**Zjištění:** `/leads` stále nabízí „Create Lead“ a „Import CSV“. To je v rozporu s projektovým pravidlem, že leady mají přicházet automaticky přes API/webhooky a nikdo je nenahrává ručně. Rozhraní samo také uvádí, že automatické přidělování bude dostupné až po připojení skutečného příjmu nebo fronty.

**Riziko:** současné rozhraní může působit, jako by ruční nahrávání bylo součástí zamýšleného běžného provozu.

**Doporučená akce:** ponechat napojení jako budoucí modulární schopnost. Až bude na řadě, navrhnout obecný kontrakt pro ověření, deduplikaci, workspace, zdroj, zařazení do kampaně, audit a opakování při chybě. Teď PM nemusí dodávat zdroj dat a toto téma není prioritou.

### 3. P1–P4 existují v logice; jejich UI lze navrhnout později — námět, ne aktuální priorita

**Zjištění:** databázové změny implementují například recyklaci P4 a plánování retence P3. Adresář `/leads` ale zůstává obecným seznamem/tabulí; nenabízí přehled čtyř oddělení s jejich frontami a počty.

**Riziko:** Team Leader nemusí rychle poznat, co čeká na které oddělení, a operátor nemusí v UI rozumět tomu, proč lead právě obsluhuje.

**Vysvětlení po lopatě:** nepotřebujeme skutečné leady, abychom navrhli správné přihrádky. „Přehled P1–P4“ znamená, že vedoucí může později vidět, kolik případů čeká v každém oddělení a proč do něj patří. Operátor pak dostane práci ze své určené fronty. Je to návrh, jak má kostra chování rozdělit, nikoli požadavek PM, aby sháněl data nebo teď objednal novou obrazovku.

**Doporučená akce:** ponechat jako námět pro budoucí iteraci UI. Až se k němu vrátíme, nejdřív projít pracovní tok na `/workspace` a `/team` a určit informace užitečné pro každou roli; nepřidávat dlaždice bez praktického účelu.

### 4. Neuzavřená informační architektura — střední priorita

**Zjištění:** navigace stále publikuje 17 cílů. Práva jsou částečně zohledněná, ale správa zůstává rozdělená mezi více samostatných ploch (např. uživatelé, skripty, workflows, audit a technické nastavení). Starší produktové audity obsahovaly návrhy i obrazovky, které mezitím změnily stav nebo byly odstraněny; byly proto nahrazeny stručnou aktuální dokumentací.

**Doporučená akce:** neodstraňovat položky jen kvůli jejich počtu. Udělat krátkou inventuru podle role a četnosti použití a rozhodnout u každé: ponechat, sloučit, skrýt nebo odstranit. Admin Hub je vhodný kandidát na sjednocení administrativních odkazů; Team Leaderovi může lépe sloužit týmový cockpit s frontou a výjimkami. Zachovat přímé cesty k často používaným operacím.

### 5. Telefonie je odložená, ale její implementace zůstává v projektu — střední priorita / bez nových nákladů

**Zjištění:** před touto konsolidací README popisovalo Telnyx jako budoucího produkčního providera. Dokumentace je nyní opravena; repozitář ale stále obsahuje telefonní stránky, API cesty i Telnyx/SIP závislosti.

**Riziko:** starší dokumentace může vést k neplánovanému nastavování nebo výdajům; nevyužívané větve navyšují údržbu a velikost projektu.

**Doporučená akce:** sjednotit dokumentaci s aktuálním rozhodnutím „telefonie odložena“. Zmapovat, které části jsou potřebné pro simulovaný workflow, a které jsou čistě provider-specific. Nepřipojovat ani neplatit externího providera. Odstranění závislostí provést až po ověření importů a zachování funkčního demo hovoru.

### 6. Neověřená parita živé databáze — předpoklad k potvrzení

**Zjištění:** projektový průvodce i starší AI analýza upozorňují, že samotné soubory migrací nepotvrzují stav vývojové/produkční databáze. Tato kontrola neměla přístup k živé databázi a její stav tedy nepotvrzuje.

**Doporučená akce:** před pilotem porovnat migrační historii a schéma cílového Supabase prostředí, zkontrolovat RLS a provést scénáře napříč rolemi na syntetických datech. Výsledek zaznamenat zvlášť od statických testů.

## Rozhodnutí podle typu plochy

| Plocha | Kdo a jak často | Rozhodnutí | Doporučený koncept |
|---|---|---|---|
| Operator Console `/workspace` | Operátor, každodenně a opakovaně | Ponechat; hlavní operátorská plocha | Jedna soustředěná pracovní fronta s kontextem konkrétní kampaně; operátor si nemá vybírat leady z neřízeného adresáře. |
| Team Workspace `/team` a Exception Queue | Team Leader, průběžně během směny | Ponechat a zvážit sjednocení | Cockpit týmu s frontou, výjimkami a asistencí; neodstraňovat výjimky, dokud není jasné, kde TL dokončí stejný úkol. |
| Leads `/leads` | Team Leader / Admin podle současných oprávnění | Ponechat jako správcovský adresář; změnit vstup leadů | Tabulka zůstává vhodná pro vyhledávání a správu. P1–P4 je vhodnější provozní přehled front než další obecný kanban tisíců leadů. |
| Orders `/orders` | Team Leader / Admin a podle oprávnění operátor | Ponechat; Kanban už existuje | Kanban pro rychlý přehled expedice, tabulku pro hledání/export. Před rozšiřováním ověřit výkon při větším objemu. |
| Administration | Administrátor, méně často, ale s vysokou důležitostí | Sjednotit navigaci, ne zahazovat schopnosti | Admin Hub se sekcemi uživatelé/týmy, pravidla, katalog/skripty, audit a technické nastavení. |

## Možné další kroky (ne závazná roadmapa)

1. **Ověřit migrační historii a opravit kontrolu migrací** — technický nesoulad stojí za bezpečné vyřešení před další prací s databázovou historií.
2. **Při budoucím plánování příjmu leadů** navrhnout obecný kontrakt a směrování; integrace zdroje nyní není prioritou.
3. **Při další iteraci P1–P4 obrazovek** určit, co operátor a Team Leader skutečně potřebují vidět v `/workspace` a `/team`.
4. **Pokud se ukáže, že navigace překáží**, zmapovat její položky podle role a četnosti a teprve pak zvážit Admin Hub.
5. **Pilot** je jedna z budoucích možností ověření, nikoli podmínka pro současné ladění systému.

PM může kdykoli zvolit jinou oblast podle aktuální práce na designu, estetice, rozsahu nebo UX. Kanban objednávek už není čekající návrh; je hotová obrazovka, kterou lze dále iterativně ladit.

## Hranice této analýzy

Provedená byla kontrola dokumentace, vybraných cest a obrazovek, testovací sady a statické kontroly migrací. Nebyl proveden přihlášený browserový audit všech rolí, běh migrací na čistém PostgreSQL, audit živého Supabase/RLS ani pilot se skutečnými pracovníky. Záznam proto popisuje ověřené mezery a doporučené další ověření, ne potvrzení produkční připravenosti.
