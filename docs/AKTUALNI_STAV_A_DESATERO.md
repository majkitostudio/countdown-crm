# Aktuální stav, jednotné To-Do a Desatero

**Snapshot:** 7. 9. 2026

**Detailní zdroj pořadí práce:** tento dokument

**Stav:** dokončený implementační plán Team Leader Review → projektový checkpoint → P0.1–P0.3; P0.4 je vědomě odložené pro interní provoz

## Co je skutečně hotové

- Operator Console má serverem řízený assignment, callback/recovery, Customer 360,
  Conversation Brief, Product Script a idempotentní post-call zápis.
- Role-aware vstup směruje operátora do konzole, Team Leadera do Exception Queue
  a administrátora do Workspace Readiness.
- Exception Queue je nasazená a ověřená přes autentizované role i záporné
  workspace/role scénáře.
- Team Leader Review pracuje s reálným uloženým hovorem, neměnným snapshotem
  skriptu, append-only revizemi hodnocení a auditem. Linked sandbox prošel
  autentizovaným smoke testem včetně cleanupu.
- Osobní preference operátora jsou serverové, workspace-scoped a chráněné RLS.
- Linked migration history je srovnaná 86/86. P0.2 i P0.3 prošly 376/376
  aplikačními a 183/183 databázovými testy, lintem, typecheckem a buildem.
- P0.3 je skutečně uzavřené: linked runner provedl read-only ověření 8/8
  databázových kontraktů. Použil oddělenou identitu s pouze `Database: Read` a
  `Data API Config: Read`; produkce nebyla použita a žádný zápis neproběhl.
- Aktuální nasazení je interní systém pro jednu konkrétní firmu. Leaked-password
  protection zůstává vědomě vypnutá a zapne se před případnou expanzí na trh;
  projekt se proto nyní nevydává za externě pilot-ready Auth.

Hotový bod se do priorit níže nevrací. Pokud se objeví regrese, zapisuje se jako
nový konkrétní problém s vlastním důkazem.

## Jediné pořadí další práce

Jednotlivé body se řeší shora dolů. Nový implementační plán smí přeskočit vyšší
prioritu jen tehdy, když je blokovaná externím vstupem nebo checkpoint doloží, že
už není relevantní. Každý větší bod dostane před implementací vlastní návrh,
akceptační kritéria a důkazní plán.

### P0 — bezpečnost a shoda databáze před pilotem

1. [x] **Vysvětlit linked drift projektových funkcí.** Přímé katalogové srovnání
   prokázalo shodu všech 80 projektových funkcí po normalizaci pouze CRLF/LF,
   včetně signatur, security režimu, konfigurace a ACL. Devět funkcí v raw public
   diffu je známý Windows line-ending false positive Supabase enginů, ne logický
   drift. Reprodukovatelný `npm run verify:linked-functions` nyní skutečný rozdíl
   odmítne; žádný migration repair ani no-op migrace nevznikly.
2. [x] **Prověřit pět RPC funkcí typu `SECURITY DEFINER`, které může volat role
   `authenticated`, a umístění `pgtap`.**
   Jde o wallet a call-completion hranice označené linked Security Advisorem.
   Každá musí mít explicitní workspace/role kontrolu, minimální grant a negativní
   test; změna na invoker/revoke se provede jen podle skutečného kontraktu.
   Extension `pgtap` se přesune mimo exponované `public` schéma bezpečným postupem.
   - Dokončeno: stabilní veřejné RPC signatury jsou invoker wrappery,
     privilegovaná těla jsou v `private`, granty a záporné role/workspace/call
     scénáře kryjí testy a idempotentní migrace přesouvá `pgtap` do `extensions`.
     Linked historie je 86/86, katalogový read-back potvrdil security režim,
     signatury, ACL i prázdný `search_path`, `pgtap` 1.3.3 je v `extensions` a
     linked advisor už původních šest příčin nehlásí.
   - Hotovo, když advisor nálezy mají odstraněnou příčinu nebo zdokumentované
     bezpečné odůvodnění podložené testem a `pgtap` už není v `public`.
3. [x] **Definovat bezpečný privileged runner pro vzdálené databázové důkazy.**
   Současný secret key zvládá Auth admin operace, ale Data API nemá grant na
   `public.workspaces`; lokální pgTAP proto není vzdálený důkaz. Široké granty se
   nesmějí přidat jen kvůli testu.
   - Dokončeno: runner v `scripts/p0-3-remote-db-evidence.mjs` používá
     oddělený scoped token, read-only SQL endpoint a autoritativní PostgREST
     config endpoint. Linked běh prokázal 8/8 kontraktů; sanitizovaný report je
     v `docs/superpowers/reports/2026-09-07-p0-3-linked-run.md`.
   - Runner se nepoužívá jako produkční readiness test a jeho token nesmí být
     uložený v repozitáři, browseru, Docker image ani logu.
4. [ ] **Před externí expanzí uzavřít produkční Auth hardening.**
   Pro současný interní provoz jedné konkrétní firmy je leaked-password
   protection vědomě odložená a zůstává vypnutá. Při expanzi na trh nebo před
   externím pilotem ji zapnout, znovu projít Auth smoke test a ověřit, že
   `NEXT_PUBLIC_ALLOW_DEMO_AUTH` není v pilotním prostředí dostupné.
   - Tento bod není technicky hotový; je pouze odložený podle aktuálního
     produktového scope.

### P1 — stabilní a pravdivá hlavní pracovní smyčka

1. **Izolovat dílčí selhání dat.** Jeden nefunkční zdroj nesmí skrýt nezávislý
   užitečný výsledek. Prioritně: Next Best Action, Recent Context, Products,
   Team queue a Analytics; současné `Promise.all` kontrakty se posoudí jednotlivě.
   - Hotovo, když chování při každém relevantním dílčím výpadku pokrývá test a UI
     rozliší částečná data od úplného selhání.
2. **Sjednotit role-aware navigaci a pravdivost ploch.** Sidebar, hlavička a
   command palette mají používat jeden zdroj pravidel. Team Leader musí vidět
   svou frontu; operátor nesmí dostávat manažerské nebo nepoužitelné cíle.
   Neaktivní Live Monitor a zmrazené plochy se skryjí nebo přesně označí.
   - Hotovo, když matice tří rolí souhlasí se server guardy a má navigační testy.
3. **Opravit zavádějící text Call Logs.** UI nyní slibuje „full speech transcript“,
   přestože starší ani běžné hovory přepis mít nemusí.
   - Hotovo, když copy přesně rozlišuje uložený transcript od nedostupného stavu.
4. **Provést souvislý browser smoke test celého pracovního dne.** Odděleně jako
   operátor, Team Leader a administrátor, včetně reloadu, persistence, prázdných
   stavů a přímých URL.
   - Hotovo, když report obsahuje kroky, identity rolí bez tajných údajů, read-back
     a cleanup; unit/build test se za tento důkaz nevydává.
5. **Prověřit runtime závislosti telefonie.** `@telnyx/webrtc` dnes přináší tři
   moderate advisories přes starší `uuid`; automatický audit navrhuje nevhodný
   major downgrade. Současně je nutné posoudit tři blokované install skripty.
   - Hotovo, když existuje bezpečná aktualizační/mitigační cesta a čistý nebo
     výslovně akceptovaný audit před zapnutím živého provideru.

### P1.5 — P2 onboarding trénažér (interní pilot)

Trénažér je bezpečný nástroj pro operátora, který si před prvními ostrými
hovory procvičí reálný P2 outbound/free-sample rozhovor s AI zákazníkem. Není
to obecný AI simulátor, herní plocha ani náhrada živé telefonie. Vznikne až po
uzavření P1: potřebuje pravdivý Call Log, ověřenou hranici zápisu hovoru,
neměnný snapshot Product Scriptu a funkční Team Leader Review. Skutečné týmy
nejsou pro první workspace-scoped pilot závislostí; týmové porovnávání výsledků
se však odloží až za P2.

1. **Použít pouze jeden až dva schválené P2 skripty.** Operátor vybírá skript a
   obtížnost, ne katalog nesouvisejících produktů. Cvičení používá konkrétní
   publikovanou verzi skriptu; jméno fiktivního zákazníka se do něj bezpečně
   předvyplní.
2. **Vést jeden přirozený cvičný hovor.** AI zákazník reaguje jako zákazník,
   klade přirozené otázky a podle zvolené obtížnosti přidává námitky. Při
   úspěšném průchodu může nabídku přijmout a předat výhradně fiktivní, ale
   věrohodné doručovací údaje. Cvičení nikdy nevytváří objednávku, callback,
   workflow událost ani zásah do skutečné fronty.
3. **Uložit ho do Call Logu jako jasně oddělený tréninkový hovor.** Záznam
   obsahuje přepis, použitý skript a automatické vyhodnocení. Je viditelně
   označený jako trénink a nesmí zkreslovat ostré obchodní výsledky. Team
   Leader jej kontroluje stejným review mechanismem jako reálný hovor; nevzniká
   druhý paralelní systém hodnocení.
4. **Compliance vyhodnocovat odděleně od chování zákazníka.** První závažné
   zakázané tvrzení se okamžitě uloží do výsledku, ale AI zákazník běžně
   pokračuje přirozeně. Teprve opakované nebo zvlášť závažné jednání může
   důvěryhodně změnit jeho reakci. Závažná chyba neumožní označit cvičení za
   splněné, ani kdyby zákazník simulovanou nabídku přijal. Výsledek musí uvést
   přesnou větu, důvod a bezpečnější formulaci; lidský verdikt Team Leadera
   zůstává oddělený od automatického pravidlového nálezu.
5. **MVP neobsahuje nahrávku.** Zdroj důkazu je úplný chronologický přepis a
   snapshot skriptu. Audio recording, retence a playback jsou samostatný
   pozdější projekt a nesmějí se vydávat za součást tohoto pilotu.
6. **Odstranit herní a technický šum.** Operátor nemá řídit fáze klikáním,
   sledovat náladoměr/trpělivost ani řešit poskytovatele AI. Obrazovka ukáže
   pouze účel cvičení, skript, přirozený průběh hovoru a po skončení konkrétní
   zpětnou vazbu. Automatické pravidlo, AI odpověď a pozdější lidské hodnocení
   budou vždy pravdivě rozlišené.
7. **Před implementací vytvořit samostatný návrh a důkazní plán.** Musí
   popsat hranici mezi tréninkovým a ostrým hovorem, idempotentní zápis,
   autorizaci operátora/Team Leadera, fallback při nedostupné AI nebo mikrofonu
   a kontrolní scénáře včetně compliance porušení.

P1.5 je hotové, až nováček bezpečně dokončí jeden cvičný P2 hovor, v Call Logu
vznikne jen správně označený tréninkový záznam bez obchodního side effectu,
Team Leader otevře stejný důkazní podklad pro review a zásadní compliance
chyba je přesně dohledatelná i v případě úspěšného konce simulace.

### P2 — skutečné týmy a oddělení

Toto je produktový a bezpečnostní základ, ne kosmetický filtr. Dnes neexistují
tabulky `teams`, `team_memberships` ani `team_id`; „týmové“ přehledy agregují celý
workspace. Results, týmové srovnání ani týmový provoz proto nesmějí tuto hranici
předběhnout.

1. Rozhodnout první podporovaný model členství (kardinalita, aktivní tým,
   přesuny v čase), vlastnictví Team Leaderem a chování uživatele bez týmu.
2. Navrhnout `teams`, členství a historii změn včetně unikátností, FK, indexů,
   auditní stopy a bezpečné migrace existujících workspace členů.
3. Přidat administrátorskou správu `Users & Permissions` a týmů: pozvánky,
   role, aktivace/deaktivace, přiřazení a změna Team Leadera.
4. Zavést team scope do serverové datové vrstvy, RPC a RLS. UUID ani klientský
   filtr nesmí být autorizační hranicí.
5. Převést dnešní workspace agregace podle schváleného významu: Analytics,
   Daily Brief, Exception Queue, Team queue a výběry členů; určit dopad na Wallet
   a směnový kalendář.
6. Teprve poté navrhnout operátorské `Results` a férové srovnání se skutečným
   týmem.

P2 je hotové, až administrátor tým spravuje, Team Leader vidí jen povolený scope,
operátor patří do definovaného týmu, cross-team pokusy selžou na serveru/RLS a
migrační i autentizované testy prokážou pozitivní i negativní scénáře.

### P3 — role-aware pracovní den

1. Napojit existující `operator_presence` na stav v sidebaru a pravdivou
   dostupnost; odstranit lokální stav, který se pouze tváří jako provozní.
2. Rozšířit jediný směnový kalendář o směny, plánovanou dostupnost, absence a
   přesčasy v návaznosti na týmový model. Nevytvářet druhou konfiguraci pracovních
   dnů a hodin v Settings.
3. Zprovoznit Live Monitor z reálné presence/fronty, nebo jej do té doby vůbec
   nenabízet jako aktivní nástroj.
4. Rozdělit Settings podle rolí a odpovědnosti; administrátorské identity a
   oprávnění držet v `Users & Permissions`.

### P4 — kvalita obsluhy a udržovatelnost

1. Přidat pouze schválené objection cards/FAQ pro citlivé produktové situace.
2. Rozšířit Product Scripts o diff, autora, účinnost, preview a bezpečný rollback.
3. Přesunout saved views z browserového stavu na server podle uživatele/workspace.
4. Rozšířit auditní kontext tam, kde dnes akce nejde bezpečně vysvětlit.
5. Dokončit cílený responsive a locale/currency průchod.
6. Před dalším růstem rozdělit přetíženou stránku Workspace (aktuálně přes
   1 100 řádků) a další kritické soubory podle odpovědností; refaktor nesmí měnit
   chování bez testu.

## Externě blokované

### Telnyx outbound pilot

- dokončit refundaci/pořízení správného čísla pro cílový region,
- nakonfigurovat provider účet a bezpečné serverové credentials,
- ověřit živý outbound hovor, webhook podpis a read-back call/event persistence,
- provést autentizovaný browser test mute, hold, DTMF, hangup a recovery.

Fallback softphone a Docker/Asterisk laboratoř nejsou živý Telnyx důkaz. Dokud
provider vstup chybí, ostatní neblokované body pokračují podle priorit výše.

### Až po stabilní telefonii

- audio recording a retention politika,
- transcription s přesným stavem dostupnosti,
- Gemini pouze jako serverový, člověkem upravitelný návrh verdiktu nebo poznámky;
  nikdy ne jako automaticky vydávaný medicínský či právní závěr.

## Zmrazené do po-pilotního rozhodnutí

- custom objects a blueprints,
- rozšiřování Deals pipeline a obecného Dashboardu,
- Wallet payout/commission engine nad současný read-only pilotní scope,
- inbound telefonie a široké omnichannel integrace.

Zmrazení neznamená smazání. Znamená, že na těchto plochách nevzniká nový feature
scope, dokud P0–P3 nedrží hlavní denní smyčku.

## Kontrolní checkpointy

- Po každé prioritní vrstvě znovu projít tři role, databázovou hranici, runtime
  pravdivost a dokumentaci.
- Po P2 zvlášť zkontrolovat, že žádná „team“ obrazovka nepoužívá celý workspace
  jako tichou náhradu týmu.
- Před interním pilotem zopakovat celý checkpoint včetně linked advisorů,
  schema diffu, autentizovaného browser průchodu a rollback/cleanup postupu.

## Desatero vývoje

1. Za hotové označujeme jen chování podložené odpovídajícím důkazem.
2. Workspace, role a tým vynucuje server a databáze, ne skryté tlačítko.
3. Operátorův hlavní úkol je klient na telefonu; nové UI musí zkracovat hledání,
   psaní nebo rozhodování.
4. Citlivý jazyk je schválený a dohledatelný; systém nediagnostikuje ani neslibuje
   léčbu.
5. Simulaci, fallback a externě blokovanou integraci vždy viditelně pojmenujeme.
6. Kritický zápis je idempotentní nebo má jasnou ochranu proti opakování a
   concurrency.
7. Audit zachovává autora, čas a skutečný previous/new stav; historii nepřepisuje.
8. Před předáním spouštíme testy, lint, typecheck, build, databázové ověření a
   kontrolu diffu.
9. Chybu opravujeme v příčině; nemažeme test ani bezpečnostní pravidlo jen kvůli
   zelenému běhu.
10. Dokumentace rozlišuje repo, lokální runtime, linked sandbox a živého externího
    providera a udržuje právě jedno pořadí backlogu.

## Podmínky interního pilotu

- P0 je uzavřené nebo má výslovně přijaté riziko s vlastníkem a termínem.
- P1 hlavní smyčka projde souvislým autentizovaným browser smoke testem.
- Testy, lint, typecheck, build, pgTAP, linked migration parity a schema diff mají
  známý a zaznamenaný výsledek.
- Externě neověřené funkce jsou vypnuté nebo přesně označené.
- Existuje rollback/cleanup postup a nejsou zveřejněná tajemství ani testovací
  identity.
