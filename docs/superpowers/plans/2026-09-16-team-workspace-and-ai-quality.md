# Team Workspace a AI kontrola kvality — implementační plán

**Specifikace:** `docs/superpowers/specs/2026-09-16-team-workspace-and-ai-quality-design.md`  
**Stav:** schváleno k implementaci  
**Cíl:** Sandbox only; Production se nemění

## Zásady

- Nejprve serverový datový kontrakt a testy, potom UI.
- Team scope vynucuje server a databáze, ne pouze skryté filtry.
- AI je doporučení, ne autorita nad výsledkem hovoru.
- Tréninkové hovory zůstávají mimo kontrolu reálných hovorů.
- Tajné klíče zůstávají pouze v prostředí, nikdy v repozitáři.
- Každá větší vlna má vlastní focused testy a důkaz.

## Fáze 0 — příprava a audit

- [ ] schválit specifikaci a finální název stránky/pohledů,
- [ ] ověřit existující DAL a RPC pro týmové objednávky, callbacky, hovory,
  operátory a historické snapshoty,
- [ ] ověřit definici uloženého reálného hovoru proti tréninkové relaci,
- [ ] ověřit zdroj délky naplánované směny; pokud směnový modul neexistuje,
  navrhnout bezpečný stav `unavailable`, nikoli dočasné odvození,
- [ ] zmapovat aktuální dokončení hovoru a určit idempotentní bod pro zařazení
  AI kontroly,
- [ ] potvrdit Sandbox runtime proměnné pro Gemini bez čtení nebo ukládání tajemství
  do repozitáře,
- [ ] zdokumentovat současný Wallet trigger: bonus při doručení a reversal při
  vrácení,
- [x] potvrdit okamžitý bonus pro `Post-call` objednávku,
- [x] potvrdit interní odečet bez běžné Wallet položky při nepřevzetí objednávky
  a při `Manual → Post-call → Manual`,
- [x] potvrdit viditelný ruční odečet Admina při odstoupení od smlouvy po doručení,
- [x] rozlišit hlavní stav `Returned` pro nepřevzetí od výjimečného `Anulováno`
  po doručení a odstoupení od smlouvy,
- [x] bonus při opravě zdroje připsat původnímu operátorovi,
- [x] Admin zadá částku a důvod viditelné finanční korekce,
- [ ] zachovat neměnný původní Wallet záznam; Adminova oprava bude korekce,
  nikoli fyzické přepsání nebo smazání.

**Aktuální auditní zjištění:** současný model používá `calls.outcome = objection`
pro Fail a `calls.outcome = order_placed` pro prodejní výsledek. Objednávky jsou
uložené samostatně a nemají v současném read modelu přímou vazbu na konkrétní
hovor. `calls.duration_seconds` samo o sobě neprokazuje celý Talk Time včetně
nepřijatého vytáčení; pro tento účel existují časové údaje v queue a v
`telephony_call_sessions`, ale jejich použití musí být sjednocené a ověřené.

**Výstup:** schválený datový kontrakt a seznam skutečných zdrojů. Žádná migrace
ani změna Production.

## Fáze 1 — serverový read model Team Workspace

- [x] vytvořit první čistý typovaný výpočetní základ pro operátorské metriky v
  `src/lib/teamWorkspaceMetrics.ts`, včetně testů bez databázového zápisu,
- [ ] vytvořit serverový read model pro Daily Checkpoint,
- [ ] přidat týmově omezené nové objednávky,
- [ ] přidat týmově omezené prošlé callbacky,
- [ ] přidat týmově omezenou tabulku výsledků operátorů,
- [ ] spočítat prodeje ze všech započítaných objednávek týmu, včetně ručních a
  post-call objednávek,
- [ ] spočítat Faily ze schválených týmových výsledků hovorů,
- [ ] spočítat konverzi jako všechny prodeje dělené počtem Failů,
- [ ] oddělit obchodní počet prodejů od finančního bonusu; ruční objednávka smí
  nést provizi, ale nesmí vytvořit bonus,
- [ ] zachovat odlišné zobrazované názvy zdrojů `Manual Creation` a `Post-call`
  bez zbytečné změny interních historických hodnot,
- [ ] spočítat vytočené a spojené hovory,
- [ ] spočítat absolutní Talk Time podle schválené definice,
- [ ] spočítat Talk Time procento pouze z ověřené délky směny,
- [ ] pro nulový počet Failů a chybějící směnu vracet pravdivý nedostupný stav,
- [ ] pokrýt partial failure jednotlivých zdrojů bez vydávání nedostupných dat za
  nulu,
- [ ] ověřit, že statistická část nemění Wallet ani payout logiku mimo schválenou
  cílenou opravu zdroje objednávky.

**Testy:** čisté výpočty, nulové hodnoty, více týmů, archivovaný tým, historický
snapshot, operátor bez směny, cross-team a cross-workspace denial.

## Fáze 1.5 — oprava zdroje objednávky a bonusová hranice

Tato vlna se provede pouze po uzavření finančních rozhodnutí z Fáze 0.

- [ ] přidat samostatnou autorizovanou serverovou operaci pro opravu zdroje,
- [ ] povolit ji pouze schválené roli Team Leader a zachovat team scope,
- [ ] nepoužívat širší editaci objednávky jako obcházení oprávnění,
- [ ] zobrazit srozumitelné názvy `Manual Creation` a `Post-call`,
- [ ] rozšířit audit zdroje o předchozí a nový stav, autora, čas a důvod,
- [ ] vytvořit okamžitý bonusový nárok podle platného pravidla a idempotentního
  eventu; aktuální zůstatek ho musí okamžitě zohlednit,
- [ ] oddělit interní bonusový nárok a automatické korekce od běžných Wallet
  transakcí viditelných operátorovi,
- [ ] při nepřevzetí objednávky interně zrušit bonusový nárok bez běžného
  operátorského Wallet záznamu,
- [ ] při `Manual → Post-call → Manual` interně přičíst a odečíst nárok bez
  běžného operátorského Wallet záznamu,
- [ ] při odstoupení od smlouvy po doručení umožnit pouze Adminovi viditelnou
  ruční korekci s částkou, důvodem a auditem,
- [ ] zachovat původní Wallet transakci a Adminovu korekci zobrazit jako navazující
  finanční záznam; fyzické mazání nebo přepis se nepovolí,
- [ ] zabránit dvojímu bonusu při reloadu, retry, pozdějším doručení nebo opakované
  opravě,
- [ ] uložit interní auditní stopu automatických korekcí a jasně odlišit ji od
  ruční finanční transakce Admina.

**Testy:** povolený Team Leader, cizí tým, Operator denial, Administrator pro
ruční odečet, concurrency/retry, audit read-back, bonus rule snapshot, manual bez
bonusu, Post-call s okamžitým bonusem, nepřevzatá objednávka bez viditelného
operátorského odečtu, `Manual → Post-call → Manual`, doručení a odstoupení od
smlouvy s právě jedním viditelným Admin odečtem.

## Fáze 2 — Team Workspace shell a Daily Checkpoint

- [x] zachovat serverový role guard pro Team Leadera a Administrátora,
- [x] zavést pracovní plochu s jedním hlavním pohledem v daném okamžiku,
- [x] přidat přepínač Daily Checkpoint / Orders / Active Operators / Callbacks &
  Team Queue,
- [x] zobrazit nové objednávky, prošlé callbacky a výsledky bez zahlcení jednou
  dlouhou frontou,
- [ ] přidat jasné loading, empty, unavailable a error stavy,
- [ ] přidat pouze odkaz nebo stručný stav pro samostatné Plánování směn,
- [ ] neimplementovat plánovací kalendář v této vlně,
- [ ] zachovat přístup administrátora k celému workspace podle jeho role.

**Testy:** Team Leader týmu A/B, Administrator, Operator denial, přímá URL,
reload, úzká šířka, prázdný tým a částečně nedostupný zdroj.

## Fáze 3 — serverová AI kontrola poznámek

- [ ] vytvořit server-only Gemini adapter oddělený od tréninkového promptu,
- [ ] použít samostatné nastavení modelu pro kontrolu poznámek,
- [ ] definovat strukturovaný výsledek: stav, důvody, chybějící části a čas kontroly,
- [ ] zkombinovat deterministické signály s Gemini doporučením,
- [ ] spouštět kontrolu po uložení každého reálného hovoru,
- [ ] vyloučit tréninkové relace a jejich vlastní hodnocení,
- [ ] zajistit idempotenci, aby reload nebo opakovaný event nevytvořil duplicitní
  výsledek,
- [ ] uložit `unavailable` při chybě AI a zachovat dostupnost ostatních dat,
- [ ] nepřidávat automatický OpenAI fallback bez samostatného rozhodnutí,
- [ ] vytvořit anonymizované testovací poznámky podle schváleného checklistu.

**Důkaz:** serverový test validace odpovědi, timeout, neplatná odpověď, opakované
spuštění, chybějící poznámka, správná poznámka, úspěch, Fail a citlivý obsah.
První skutečné volání Gemini pouze v Sandboxu s klíčem z runtime prostředí.

## Fáze 4 — Quality Review a filtry

- [ ] přidat pohled Kontrola kvality hovorů v rámci Team Workspace,
- [ ] zobrazit pouze AI doporučené nebo filtrem vybrané týmové záznamy,
- [ ] přidat filtry pro krátkou poznámku, krátký hovor, důvod Failu a úspěšný
  výsledek s podezřením na neúplnou poznámku,
- [ ] zobrazit důvod doporučení a přímý odkaz na hovor, poznámku nebo objednávku,
- [ ] po ověření základních filtrů umožnit Team Leaderovi uložit vlastní kontrolní
  pohledy; uložené pohledy nesmí změnit team scope,
- [ ] zachovat Team Leaderovy týmové hranice,
- [ ] jasně odlišit `pravděpodobně v pořádku`, `doporučeno zkontrolovat` a
  `nelze vyhodnotit`,
- [ ] nepřidávat workflow pro vracení poznámek operátorům.

**Testy:** kombinace filtrů, úspěšné i neúspěšné hovory, více týmů, prázdný
výsledek, nedostupná AI a read-only chování podle role.

## Fáze 5 — ověření a důkaz v Sandboxu

- [ ] `npm test`,
- [ ] `npm run lint`,
- [ ] `npm run typecheck`,
- [ ] `npm run build`,
- [ ] autentizovaný browser smoke jako Administrator,
- [ ] autentizovaný browser smoke jako Team Leader s jedním týmem,
- [ ] negativní Team Leader cross-team a Operator denial,
- [ ] reload a read-back Daily Checkpointu,
- [ ] ověřit AI výsledek u anonymizovaného reálného hovoru v Sandboxu,
- [ ] ověřit, že tréninkový hovor výsledek kontroly reálných hovorů nevytvoří,
- [ ] ověřit `unavailable` pro AI a chybějící směnový plán,
- [ ] zkontrolovat diff, tajné údaje a cleanup testovacích dat,
- [ ] vytvořit sanitizovaný ověřovací report.

Production se v žádné fázi tohoto plánu nepoužije.

## Podmínky dokončení

Plán je dokončený, až Team Leader dostane pravdivý týmový Daily Checkpoint,
Quality Review s AI doporučeními funguje u všech reálných hovorů, trénink je
oddělený, statistiky mají jasný význam, chybějící zdroje se nepředstírají jako
nuly a pozitivní i negativní role/team scénáře jsou doložené v Sandboxu.

Samostatné plánování směn zůstává navazujícím projektem. Pro tento plán musí být
pouze připravený bezpečný read-only kontrakt pro délku ověřené směny.
