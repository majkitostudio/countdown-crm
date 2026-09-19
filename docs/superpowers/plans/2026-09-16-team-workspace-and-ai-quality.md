# Team Workspace a AI kontrola kvality — implementační plán

**Specifikace:** `docs/superpowers/specs/2026-09-16-team-workspace-and-ai-quality-design.md`  
**Stav:** schváleno k implementaci  
**Cíl:** Sandbox only; Production se nemění

**Aktualizace 16. 9. 2026:** AI vlna a anonymizovaný end-to-end průchod jsou
ověřené. Ověřovací report je v
`docs/superpowers/reports/2026-09-16-gemini-call-quality-verification.md`.

**Aktualizace 19. 9. 2026:** Uložené kontrolní pohledy (Fáze 4) jsou nasazené v
Sandboxu a ověřené v prohlížeči jako Team Leader: uložení pod jménem, aplikace
uložených filtrů jedním kliknutím, zvýraznění aktivního pohledu, perzistence po
reloadu a smazání. Role gate zůstává `team_leader` / `administrator`; operátor
nemá na Team Workspace přístup. Testy: 143 souborů / 660 testů, lint, typecheck
i build prošly. Migrace `20260919090000_workspace_saved_views.sql` je v historii
Sandboxu; dočasný Team Leader účet byl po ověření smazán.

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
- [x] potvrdit, že Team Leader může vytvořit nový ruční Wallet pohyb s kladnou
  nebo zápornou částkou a důvodem, ale nesmí později upravit ani smazat žádný
  Wallet záznam; Admin může existující záznam upravit, změnit částku nebo
  odstranit.

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
- [x] vytvořit serverový read model pro Daily Checkpoint,
- [x] přidat týmově omezené nové objednávky,
- [x] přidat týmově omezené prošlé callbacky,
- [x] přidat týmově omezenou tabulku výsledků operátorů,
- [x] spočítat prodeje ze všech započítaných objednávek týmu, včetně ručních a
  post-call objednávek,
- [x] spočítat Faily ze schválených týmových výsledků hovorů,
- [x] spočítat konverzi jako všechny prodeje dělené počtem Failů,
- [x] oddělit obchodní počet prodejů od finančního bonusu; read model Wallet
  nemění a ruční objednávku nezapočítává jako automatický bonus,
- [x] zachovat odlišné zobrazované názvy zdrojů `Manual Creation` a `Post-call`
  bez zbytečné změny interních historických hodnot,
- [x] spočítat vytočené a spojené hovory,
- [x] spočítat absolutní Talk Time podle schválené definice,
- [ ] spočítat Talk Time procento z reálné ověřené délky směny po implementaci
  samostatného směnového kalendáře,
- [x] pro nulový počet Failů a chybějící směnu vracet pravdivý nedostupný stav,
- [x] pokrýt partial failure jednotlivých zdrojů bez vydávání nedostupných dat za
  nulu,
- [x] ověřit, že statistická část nemění Wallet ani payout logiku mimo schválenou
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

**Testy:** povolený Team Leader pro nový kladný i záporný ruční pohyb s důvodem,
Team Leader bez editace/mazání starého záznamu, cizí tým, Operator denial,
Administrator pro ruční odečet i editaci/mazání, concurrency/retry, audit
read-back, bonus rule snapshot, manual bez automatického bonusu, Post-call s
okamžitým bonusem, nepřevzatá objednávka bez viditelného operátorského odečtu,
`Manual → Post-call → Manual`, doručení a odstoupení od smlouvy s právě jedním
viditelným Admin odečtem.

## Fáze 2 — Team Workspace shell a Daily Checkpoint

- [x] zachovat serverový role guard pro Team Leadera a Administrátora,
- [x] zavést pracovní plochu s jedním hlavním pohledem v daném okamžiku,
- [x] přidat přepínač Daily Checkpoint / Orders / Active Operators / Callbacks &
  Team Queue,
- [x] zobrazit nové objednávky, prošlé callbacky a výsledky bez zahlcení jednou
  dlouhou frontou,
- [x] přidat jasné loading, empty, unavailable a error stavy,
- [x] přidat pouze odkaz nebo stručný stav pro samostatné Plánování směn,
- [ ] neimplementovat plánovací kalendář v této vlně,
- [x] zachovat přístup administrátora k celému workspace podle jeho role.
- [x] přidat jednoduchý `Request Help` / `SOS` signál z Operator Console do části
  `Co vyžaduje pozornost`, včetně převzetí a uzavření žádosti; signál je dostupný
  u aktivně přiřazeného leadu před hovorem, během hovoru i při dokončování výsledku,
- [x] oddělit asistenční rozsah od manažerského: každý Team Leader může přijmout
  pomoc pro libovolného operátora, ale bez automatického rozšíření přístupu k jeho
  týmovým objednávkám, směnám, Walletu nebo výsledkům,
- [x] zachovat minimální kontext žádosti a auditní stopu bez interního chatu,
  vzdáleného převzetí hovoru a audio monitoringu,
- [x] převést Team Workspace do existujícího Countdown designového systému:
  neutrální kostra, omezené zvýraznění, kontextový pruh a oddělené hlavní bloky,
- [x] přidat pravdivé filtry objednávek, aktivních operátorů a týmové fronty,
  včetně zrušení filtrů a prázdných výsledků,
- [ ] přidat serverové přepínání období a týmů; do té doby zobrazovat pouze
  pravdivý kontext bez falešně funkčních dropdownů.

**Testy:** Team Leader týmu A/B, Administrator, Operator denial, přímá URL,
reload, úzká šířka, prázdný tým a částečně nedostupný zdroj.

## Fáze 3 — serverová AI kontrola poznámek

- [x] vytvořit server-only Gemini adapter oddělený od tréninkového promptu,
- [x] použít samostatné nastavení modelu pro kontrolu poznámek,
- [x] definovat strukturovaný výsledek: stav, důvody, chybějící části a čas kontroly,
- [x] zkombinovat deterministické signály s Gemini doporučením,
- [x] po uložení každého reálného hovoru okamžitě vytvořit stav `pending`,
  ale Gemini spouštět až po odpovědi přes Next.js `after()`,
- [x] vyloučit tréninkové relace a jejich vlastní hodnocení,
- [x] zajistit idempotenci a atomický claim s lease, aby paralelní zpracování
  nespustilo Gemini dvakrát,
- [x] uložit `unavailable` při chybě AI a zachovat dostupnost ostatních dat,
- [x] nepřidávat automatický OpenAI fallback bez samostatného rozhodnutí,
- [x] vytvořit anonymizované testovací poznámky podle schváleného checklistu,
- [x] redigovat e-maily, telefony a omezit délku textu před odesláním Gemini,
- [x] odmítnout neúplný nebo chybný JSON z Gemini místo jeho uložení jako platného,
- [x] pokrýt i přímou cestu vytvoření hovoru mimo post-call frontu.

**Důkaz:** serverový test validace odpovědi, timeout, neplatná odpověď, opakované
spuštění, chybějící poznámka, správná poznámka, úspěch, Fail a citlivý obsah.
Skutečné anonymizované volání Gemini proběhlo v Sandboxu s klíčem z runtime
prostředí a prošlo stavem `pending` → `ok`; současně prošel atomický claim a
cleanup testovacích dat. Výsledek a oprava výchozího modelu jsou v reportu
`docs/superpowers/reports/2026-09-16-gemini-call-quality-verification.md`.

## Fáze 4 — Quality Review a filtry

- [x] přidat pohled Kontrola kvality hovorů v rámci Team Workspace,
- [x] zobrazit pouze AI doporučené nebo filtrem vybrané týmové záznamy,
- [x] přidat filtry pro krátkou poznámku, krátký hovor, důvod Failu a úspěšný
  výsledek s podezřením na neúplnou poznámku,
- [x] zobrazit důvod doporučení a přímý odkaz na hovor, poznámku nebo objednávku,
- [x] po ověření základních filtrů umožnit Team Leaderovi uložit vlastní kontrolní
  pohledy; uložené pohledy nesmí změnit team scope,
- [x] zachovat Team Leaderovy týmové hranice,
- [x] jasně odlišit `pravděpodobně v pořádku`, `doporučeno zkontrolovat` a
  `nelze vyhodnotit`,
- [x] nepřidávat workflow pro vracení poznámek operátorům.

**Testy:** kombinace filtrů, úspěšné i neúspěšné hovory, více týmů, prázdný
výsledek, nedostupná AI a read-only chování podle role.

## Fáze 5 — ověření a důkaz v Sandboxu

- [x] `npm test` — 143 souborů, 660 testů,
- [x] `npm run lint`,
- [x] `npm run typecheck`,
- [x] `npm run build`,
- [x] autentizovaný browser smoke jako Administrator,
- [x] autentizovaný browser smoke jako Team Leader s jedním týmem,
- [x] negativní Team Leader cross-team a Operator denial,
- [x] reload a read-back Daily Checkpointu,
- [x] ověřit AI výsledek u anonymizovaného reálného hovoru v Sandboxu,
- [x] ověřit, že tréninkový hovor výsledek kontroly reálných hovorů nevytvoří,
- [x] ověřit `unavailable` pro AI a chybějící směnový plán,
- [x] zkontrolovat diff, tajné údaje a cleanup testovacích dat,
- [x] vytvořit sanitizovaný ověřovací report.

Production se v žádné fázi tohoto plánu nepoužije.

## Podmínky dokončení

Plán je dokončený, až Team Leader dostane pravdivý týmový Daily Checkpoint,
Quality Review s AI doporučeními funguje u všech reálných hovorů, trénink je
oddělený, statistiky mají jasný význam, chybějící zdroje se nepředstírají jako
nuly a pozitivní i negativní role/team scénáře jsou doložené v Sandboxu.

Samostatné plánování směn zůstává navazujícím projektem. Pro tento plán musí být
pouze připravený bezpečný read-only kontrakt pro délku ověřené směny.
