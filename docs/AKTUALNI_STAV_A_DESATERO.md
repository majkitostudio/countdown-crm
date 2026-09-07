# Aktuální stav, jednotné To-Do a Desatero

**Snapshot:** 7. 9. 2026

**Detailní zdroj pořadí práce:** tento dokument

**Stav:** dokončený implementační plán Team Leader Review → projektový checkpoint → P0

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
- Linked migration history je srovnaná 84/84. Poslední ověřený checkpoint prošel
  345/345 aplikačními a 154/154 databázovými testy, lintem, typecheckem a buildem.

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
2. **Prověřit pět RPC funkcí typu `SECURITY DEFINER`, které může volat role
   `authenticated`, a umístění `pgtap`.**
   Jde o wallet a call-completion hranice označené linked Security Advisorem.
   Každá musí mít explicitní workspace/role kontrolu, minimální grant a negativní
   test; změna na invoker/revoke se provede jen podle skutečného kontraktu.
   Extension `pgtap` se přesune mimo exponované `public` schéma bezpečným postupem.
   - Hotovo, když advisor nálezy mají odstraněnou příčinu nebo zdokumentované
     bezpečné odůvodnění podložené testem a `pgtap` už není v `public`.
3. **Definovat bezpečný privileged runner pro vzdálené databázové důkazy.**
   Současný secret key zvládá Auth admin operace, ale Data API nemá grant na
   `public.workspaces`; lokální pgTAP proto není vzdálený důkaz. Široké granty se
   nesmějí přidat jen kvůli testu.
   - Hotovo, když existuje oddělený, minimálně oprávněný a opakovatelný způsob
     vzdáleného ověření, nebo výslovně schválená alternativa bez produkčního
     rozšíření práv.
4. **Uzavřít produkční Auth nastavení.**
   Před přístupem reálných uživatelů zapnout leaked-password protection a znovu
   projít auth smoke test. `NEXT_PUBLIC_ALLOW_DEMO_AUTH` zůstává pouze lokální.
   - Hotovo, když linked advisor už tuto ochranu nehlásí a demo vstup není v
     pilotním prostředí dostupný.

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
- AI Training nad současný simulátor,
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
