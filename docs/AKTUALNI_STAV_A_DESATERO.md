# Countdown CRM — aktuální stav a desatero

**Snapshot:** 2. 9. 2026
**Aktuální aplikační baseline:** `main` = `c1799c1` (`fix: enforce manager-only wallet configuration`)
**Aktualizace baseline:** Po posledním checkpointu přibyly User Wallet MVP,
Next Best Action, Team Leader Daily Brief a Customer 360 retention snapshot.
Lokální repo gate na tomto pracovním balíku prošel: `npm test` 30 souborů / 126 testů,
lint, typecheck a production build. Administrator browser + reload + SQL
persistence je doložená pro lead note i čerstvý Operator call/order průchod;
plný Team Leader/Administrator browser a RLS důkaz zůstávají otevřené.
Poslední commit navíc uzavřel manager-only RLS hranici pro wallet konfiguraci;
pozitivní manažerská relace však stále není k dispozici.
**Aktuální stav:** Custom objects jsou pro Operatora serverově odmítnuté a v
preview zobrazují stabilní stav bez dat a create controls; Re-Order používá
poslední fulfilled historii pro dvojici lead/product a explicitní 14denní
heuristiku; Wallet nastavení je oddělené v Settings a analytics vrací měny
odděleně. Blueprint infrastruktura je aplikovaná v Preview/Sandbox i produkci.
Nové Customer 360, Next Best Action
a Daily Brief vrstvy jsou deterministické nad uloženými daty, nikoli live AI.
**Navazující checkpoint:** [PROJECT_POLISH_CHECKPOINT_20260826.md](PROJECT_POLISH_CHECKPOINT_20260826.md)

**Aktuální pořadí dalších slice:** [NEXT_WORK_PACKAGE_20260902.md](NEXT_WORK_PACKAGE_20260902.md)

## Jedna věta na úvod

Jsme ve fázi **stabilizace před bezpečným interním pilotem**. Základ CRM,
workspace oprávnění, fronta leadů, objednávky a lifecycle hovoru už existují.
Nejsme ale ve fázi, kdy bychom měli bez dalšího přidávat velké funkce nebo
tvrdit, že je produkt připravený pro běžný produkční provoz.

První UI pass redesignu Operator Console je dokončený: state map je v PR #55
a layout hierarchy v PR #56. Dashboard hierarchy pass byl dokončen v PR #58;
Dashboard nyní staví týmovou pozornost před podpůrná data a KPI výslovně
označuje jako workspace/team scoped. Nezavádí syntetické metriky ani nový
telephony zdroj.
Order checkout items jsou implementované v PR #44 a lokálně ověřené; pokročilé
live persistence/RLS/concurrency testy zůstávají vědomě odložené.
Server-authoritative Blueprint
apply je sloučený v PR #23 a jeho potřebné migrace jsou ověřeně aplikované v
obou aktuálních Supabase cílech.

## Čerstvý delivery checkpoint — 31. 8. 2026

- PR #17 (workflow truth + Operator dispatch) je sloučený do `main` jako
  `f1d86e1`. Jeho scope je přijatý pro single-workspace interní MVP; provider
  exactly-once, multi-tenant hardening a další live důkazy zůstávají oddělené.
- PR #45 (atomic business mutations + audit) je sloučený do `main` jako
  `006b776`. PR #21 je jeho starší duplicitní draft a nemá se znovu mergovat.
- PR #39 (audit evidence), PR #40 (migration provenance) a PR #41 (queue
  recovery testy) jsou sloučené. PR #40 sjednotilo lokální/remote provenance a
  linked dry-run byl `Remote database is up to date`; neprovedlo žádný live
  SQL zápis ani migration apply.
- PR #48 sjednotilo Gauge mark v loginu, sidebaru a faviconu. PR #49 následně
  zvětšilo loginový mark a odstranilo jeho tmavý wrapper; oba PR jsou sloučené.
- Produkční deployment po PR #49 byl potvrzen jako úspěšný. Read-only HTTP
  kontrola produkce vrátila `/login` a `/icon.svg` jako HTTP 200 a potvrdila
  nový loginový mark. To není důkaz autentizace, persistence, authorization ani
  RLS.
- Historický repo gate doložený na PR #49: `npm test` 90/90, `npm run check`
  (lint, typecheck, build) a `git diff --check` prošly; aktuální gate po PR #63
  je uveden níže jako 104/104.
- PR #23 (server-authoritative Blueprint apply) je sloučené do `main` jako
  `9a8cbc0`. Lokální gates po opravě prošly: `npm test` 94/94, `npm run check`
  (lint, typecheck, build) a `git diff --check`.
- Preview/Sandbox Supabase ref `lpvypihpxhyjljikfzqo` má aplikované migrace
  `20260827005441`, `20260830072304` a `20260830100000`. Přihlášený
  Administrator úspěšně aktivoval B2B blueprint; reload zachoval stav a SQL
  read-back potvrdil stav, čtyři atributy, workflow a objekt `leads`.
- Produkční Supabase ref `qlzrsookyobtvyekhrqi` je oddělený od Preview/Sandbox.
  V produkci jsou aplikované Blueprint migrace `20260827005441` a
  `20260830100000`; přihlášený Administrator načetl `/workspace` bez 500.
  Produkce je nyní v defaultním stavu bez aktivovaného blueprintu, nikoli
  v B2B demo stavu.
- PR #44 (persistované order items v call checkoutu) je sloučené do `main` jako
  `853e784`. Změna posílá explicitní quantity a bundle položky přes existující
  server-authoritative completion RPC a chrání checkout proti dvojkliku.
  Prošly `npm test` (19 souborů / 96 testů), `npm run check`,
  `git diff --check` a Vercel Preview check. Pokročilé live persistence,
  authorization, RLS a concurrency testy byly odloženy.
- PR #55 (Operator Console state map) je sloučené do `main` jako `67e3003`.
  Jde o dokumentační podklad s P0–P3 hierarchií; nemění runtime ani databázi.
- PR #56 (Operator Console layout hierarchy) je sloučené do `main` jako
  `20c9a70`. Změna zvýrazňuje aktuální lead, nejbližší call/outcome akci a
  summary, zatímco timeline, notes a discovery otázky odsouvá do podpůrného
  railu. Prošly `npm test` (19 souborů / 97 testů), `npm run check`,
  `git diff --check` a Vercel Preview check. Browser persistence, authorization,
  RLS a concurrency důkazy se tímto UI slice neprokazují.
- PR #58 (Dashboard team hierarchy) je sloučené do `main` jako
  `8f9601c`. Zachovává současný vizuální systém a mění pouze informační
  hierarchii: Team attention je primární sekce, Team activity je compact
  workspace-scoped rail a supporting analytics zůstávají níže. KPI užívají
  explicitní team/workspace názvy; live presence a hourly time-series dál
  zůstávají pravdivě nedostupné bez odpovídajícího zdroje. Prošly `npm test`
  (20 souborů / 98 testů), `npm run check`, `git diff --check`, Vercel Preview
  a lokální Product Design QA (`passed`). Authenticated browser, persistence,
  authorization a RLS tímto UI slice nejsou prokázané.
- PR #62 (custom-object role boundary) je sloučené do `main` jako
  `5b9088a`. `listSchemas`, `listRecords` a `createRecord` vyžadují roli
  Team Leader/Administrator; Operator je odmítnut před databázovým dotazem.
- PR #63 (custom-object forbidden/unavailable UI) je sloučené do `main` jako
  `3571d22`. Authenticated Operator preview na `/objects/deals` zobrazil
  `Custom objects unavailable` a zprávu o workspace roli; nebyly přítomné
  záznamy, tabulka ani `Nový záznam`. Po reloadu zůstal stav stejný a console
  errors byly `0`. Toto je důkaz browser/server authorization boundary, nikoli
  důkaz persistence nebo přímého RLS denial scénáře.
- Čerstvý Administrator smoke v Preview ověřil `majkito.studio, Administrator`,
  načtení `/workspace` s leadem a návrat jedinečně označené lead note po reloadu
  (`Note history 1`). Console log zůstal prázdný. Call start skončil pravdivým
  stavem `Audio session could not be initialized`; read-only SQL dotaz v
  Preview/Sandbox vrátil odpovídající řádek `lead_notes`. Call/outcome a RLS
  denial proto zůstávají neověřené. Podrobný záznam je v
  [ADMIN_PILOT_PERSISTENCE_20260831.md](ADMIN_PILOT_PERSISTENCE_20260831.md).
- Na PR #63 prošel aktuální repo gate: `npm test` 22 souborů / 104 testů,
  `npm run check` (lint, typecheck, production build) a `git diff --check`.
- PR #61 (RLS policy hardening) je sloučené do `main` jako `cd1d444`. Migrace
  rozděluje mutation policies na explicitní INSERT/UPDATE/DELETE, ponechává
  workspace predikáty a `WITH CHECK`; přidaný pgTAP katalogový test měl při
  rollback ověření 12/12. Linked databáze migraci zatím nemá aplikovanou;
  `db push` nebyl proveden.
- PR #65 (Re-Order truthfulness) je sloučené do `main` jako `8dea506`. Odhad
  zobrazuje jen completed/delivered objednávky do 14 dní, je označený jako
  heuristika a neprezentuje hardcoded slevu. Gate byl 24 souborů / 107 testů,
  `npm run check`, `git diff --check` a Vercel Preview.

## Co je dnes skutečný základ

- Next.js 16.3.2, React 19, TypeScript, Tailwind 4 a Supabase Auth/Postgres.
- Přihlášení je chráněné proxy i samostatnou kontrolou uvnitř Server Actions.
- Workspace se hledá přes membership uživatele; role jsou `operator`,
  `team_leader` a `administrator`.
- Kritické zápisy vedou přes serverovou datovou vrstvu a podle potřeby přes
  databázové RPC: leady, produkty, hovory, fronta, objednávky, reminders,
  workflow a training sessions.
- Operator Console má serverem řízenou frontu, claim, start hovoru, heartbeat,
  cancel/recovery, outcome a callback. Telephony uvnitř prohlížeče je stále
  simulace, ne napojená ústředna.
- Objednávky mají lifecycle, historii stavů, řízené opravy detailů, auditní
  stopu a call checkout nyní posílá explicitní order items. Pokročilé live
  persistence/RLS/concurrency ověření zůstává odložené.
- Starší odstranění AI copilot/enrichment/follow-up/speech-recognition zmenšilo
  prostor pro nepravdivé sliby, ale starší dokumentace je stále místy popisuje
  jako hotové; nový polish checkpoint uvádí konkrétní stale claims.

## Co je důležité nepřikrášlovat

- Product Script má workspace-scoped editor pro administrátora, draft/publish/archive
  verzování, sanitizaci a read-only zobrazení pro operátora. Pokud pro produkt
  není publikovaná verze, panel používá explicitní fallback; štítek `AI-assisted`
  není důkaz živé AI.
- Workflow pravdivost a dispatch jsou sloučené v PR #17; databázová idempotence
  přes `event_id` je doplněná. Zbývá oddělený live/persistence důkaz podpory
  workflow a provider exactly-once hardening není součástí MVP.
- Blueprint apply je sloučený v PR #23: serverová transakce ukládá stav,
  atributy i workflow společně. Preview/Sandbox i produkční databázová
  infrastruktura jsou aplikované; Preview má pozitivní Admin apply + reload
  + SQL důkaz, produkce má zatím pouze čisté načtení infrastruktury bez
  aktivace blueprintu.
- Training je oddělený simulátor/session workflow. Není to produkční hovor a
  jeho provider může spadnout na lokální training engine.
- Dashboard a analytics používají reálná workspace data tam, kde existují.
  Forecast, live monitoring, sentiment z telephony a část KPI zůstávají
  `Unavailable`, což je správný stav.
- Presence existuje pro routing a heartbeat fronty. Monitor ale nemá skutečný
  live stream operátorů; „presence uložená pro routing“ neznamená „live
  supervisor monitoring hotový“.
- `NEXT_PUBLIC_ALLOW_DEMO_AUTH=true` je pouze lokální vývojová výjimka. Nesmí
  být zapnutá ve sdíleném stagingu ani v produkci.

## Aktuální stav důkazů

Současný repo baseline obsahuje migration soubory, včetně order history,
Product Script versions, call-outcome recovery a Blueprint apply. Trackovaný
`supabase/schema.sql` je samostatně evidován jako neúplný/stale snapshot v
polish checkpointu a nemá být tiše použit jako nový source of truth. Live
Blueprint migrace byly aplikované řízeně do dvou odlišných Supabase projektů;
nejde o důkaz, že všechny lokální migrace jsou nasazené do produkce.

### Provedené a ověřené na úrovni repozitáře

- Auth proxy, `getUser()`, workspace membership a většina DAL/RPC role guardů
  jsou přítomné ve zdrojovém kódu.
- Queue/call recovery kontrakt je server-owned a pracuje se stavy
  `awaiting_outcome`/`recovery_required`; UI close event není release/reassign
  mechanismus.
- Product Scripts mají administrator-only mutace, publish/archive model,
  sanitizaci a explicitní runtime fallback.
- Training/softphone/supervisor monitoring mají viditelné simulation nebo
  unavailable stavy.
- Tracked Playwright screenshots byly zachovány; nebyly mazány generated ani
  recovery artefakty.
- Blueprint live infrastruktura byla ověřena read-only SQL kontrolou: tabulka,
  RPC, `leads` metadata, RLS a policies jsou v obou cílech přítomné.

### Provedené v kódu, ale nedostatečně ověřené pro pilot

- Workflow truth a Operator dispatch jsou po sloučení PR #17 v `main`; skutečný
  business side effect není doložen pro všechny action types a provider
  exactly-once zůstává mimo single-workspace MVP.
- Atomic business mutation + audit kontrakt je po PR #45 v `main`; aktuální
  Preview migrace doplňuje auditní trigger pro call/order a live průchod ověřil
  obě události i následný cleanup. RLS/concurrency důkaz zůstává oddělený.
- Hlavní Operator Console completion má server-owned dispatch cestu; aktuální
  authenticated Operator průchod ověřil claim → start → outcome/order → reload
  → timeline → SQL read-back včetně workspace a actor attribution.
- Custom-object Operator denial je po PR #62/#63 ověřený v preview; pozitivní
  Team Leader/Administrator browser smoke a live RLS denial pro custom objects
  stále nejsou novým průchodem doložené.
- Pozitivní Team Leader/Administrator browser/persistence průchod nebyl
  proveden: dostupná Chrome relace je `mikestudio, Operator`. Nebyl použit
  demo auth, cizí účet ani fixture.
- Analytics role boundary a CSV escaping jsou již sloučené do `main`.
- Produkční negativní browser smoke s reálným účtem `mikestudio` ověřil roli
  `Operator`: `/workspace` nezobrazuje Blueprint administraci, administrátorské
  nav položky jsou skryté a přímé `/workflows` vrací `Unavailable`. Přímé
  odmítnutí RPC/serverové mutace Operatora nebylo v tomto průchodu spuštěno;
  chybí také cizí workspace, opakovaný submit a plný live RLS/concurrency
  důkaz. Idempotence je nyní chráněná v kódu databázovým `event_id` klíčem.

Podrobný nálezový inventář a oddělení static/browser/persistence/authorization/
RLS evidence je v [Project Polish Checkpointu](PROJECT_POLISH_CHECKPOINT_20260826.md).

## Stav otevřených důkazů — 31. 8. 2026

- PR #23 — server-authoritative Blueprint apply: **MERGED** jako `9a8cbc0`.
  Preview/Sandbox má pozitivní Admin apply, reload a SQL read-back; produkce má
  aplikovanou infrastrukturu a čisté `/workspace`, ale Blueprint v ní zatím
  nebyl aktivován.
- PR #61 — explicitní RLS policies: **MERGED** jako `cd1d444`. Přidaný pgTAP
  katalogový test byl ověřen v rollback transakci; role/cross-workspace CRUD
  a live provisioning zůstávají samostatnou bránou.
- PR #44 — persistované order items v checkoutu: **MERGED** jako `853e784`.
  Lokální gates a Preview check prošly; pokročilé live persistence/RLS/
  concurrency důkazy jsou odložené.
- PR #55 — Operator Console state map: **MERGED** jako `67e3003`.
- PR #56 — Operator Console layout hierarchy: **MERGED** jako `20c9a70`.
  Lokální gates a Vercel Preview check prošly; autentizovaný browser smoke a
  live persistence/RLS/concurrency evidence zůstávají samostatné.
- PR #62 — custom-object role boundary: **MERGED** jako `5b9088a`.
  Serverový role guard a focused testy prošly; live RLS/persistence důkaz tím
  není nahrazen.
- PR #63 — custom-object forbidden/unavailable UI: **MERGED** jako `3571d22`.
  Authenticated Operator preview + reload prošly; Team Leader/Administrator
  pozitivní browser + reload persistence smoke je nyní částečně doložený; plný
  call/order, SQL read-back a RLS scénář zůstávají otevřené.
- PR #65 — Re-Order truthfulness: **MERGED** jako `8dea506`. Heuristický
  odhad je omezen na fulfilled historii a 14denní okno; pricing nabídka se
  z UI odstranila.

### Historické draft PR a jejich stav

| PR | Obsah | Aktuální rozhodnutí |
|---|---|---|
| #6 | starý pilot-readiness gate | **CLOSED** 31. 8. 2026; historický dokumentační draft |
| #7 | starší order-checkout větev | **CLOSED** 31. 8. 2026; superseded PR #44 |
| #8 | starý Operator UI smoke záznam | **CLOSED** 31. 8. 2026; evidence-only historie |
| #21 | starší duplicitní atomic business/audit draft | **CLOSED** 31. 8. 2026; superseded PR #45 |
| #28 | starší explicitní RLS policies | **CLOSED** 31. 8. 2026; superseded PR #61 |
| #46 | status dokumentace po starším auditu | **CLOSED** 31. 8. 2026; zastaralý docs draft |
| #47 | custom logo branding TODO | **CLOSED** 31. 8. 2026; mimo schválený MVP scope ikon |

Unique commity byly před uzavřením porovnány; větve zůstávají zachované jako
historie. Uzavření draftu není merge ani důkaz implementace.

- Přihlášený Administrator prošel read-only smoke na `/workspace`, `/leads`,
  `/orders`, `/settings` a `/team`; výsledek je v
  [ADMIN_UI_SMOKE_TEST_20260827.md](ADMIN_UI_SMOKE_TEST_20260827.md). Negativní
  Operator/cross-workspace scénáře tím nejsou nahrazené.
- Čerstvý Administrator průchod v Preview ověřil banner `majkito.studio,
  Administrator`, načtení `/workspace` s leadem a návrat jedinečně označené
  lead note po reloadu (`Note history 1`). Console log zůstal prázdný. Jde o
  browser + UI persistence důkaz; call start skončil pravdivým stavem
  `Audio session could not be initialized` a SQL read-back ani RLS denial tím
  nejsou doložené.
- Přihlášený Operator prošel stejné routy; `/leads` a `/team` vrátily pravdivý
  unavailable stav a admin-only navigace nebyla dostupná. Důkaz je v
  [OPERATOR_UI_SMOKE_TEST_20260827.md](OPERATOR_UI_SMOKE_TEST_20260827.md).
- Aktuální repozitářový gate prošel: testy, lint, typecheck, build a diff
  kontrola. Linked Supabase lint je čistý; linked migration dry-run byl
  bezpečně zastaven bez změny databáze.

## Ověření aktuálního baseline

| Kontrola | Výsledek | Poznámka |
|---|---|---|
| `npm test` | **prošlo** | 107/107 na tree PR #65, nyní sloučeném v `origin/main` |
| `npm run check` | **prošlo** | lint, typecheck a production build prošly na tree PR #65 |
| `git diff --check` | **prošlo** | bez whitespace chyb na tree PR #65 |
| `npm audit --omit=dev --audit-level=high` | **prošlo** | 0 vulnerabilities po čisté instalaci |
| no-unused/static scan | **prošlo** | mrtvý operator status state odstraněn a PR #24 sloučen |
| Blueprint browser smoke | **prošlo v Preview/Sandbox** | Administrator apply + reload; produkce pouze čisté načtení bez aktivace |
| Blueprint persistence | **prošlo v Preview/Sandbox** | SQL read-back potvrdil stav, 4 atributy, workflow a `leads` objekt |
| Call checkout order items | **prošlo staticky** | 96 testů + lint/typecheck/build; live persistence je odložená |
| authorization/RLS | **částečně doloženo** | Operator UI negative smoke prošel; RPC/RLS metadata jsou v obou cílech, přímé denial/RLS provedení chybí |
| Custom-object Operator denial | **prošlo v Preview** | `/objects/deals` + reload; forbidden zpráva, 0 záznamů, 0 create controls, 0 console errors |
| Administrator browser + reload + SQL persistence | **prošlo pro lead note v Preview/Sandbox** | `/workspace` allowed path, lead note po reloadu a matching read-only SQL row; call audio unavailable a RLS denial chybí |
| RLS policy catalog pgTAP | **prošlo rollback testem** | 12/12 kontrol po dočasném vložení PR #61 migrace; bez trvalého lokálního/live zápisu |
| RLS role/workspace runtime pgTAP | **prošlo lokálně** | 46/46 assertions po PR #61 policies; dvě workspace a tři transaction-local identity fixtures; live sandbox migration/cross-workspace denial zůstává neověřený |
| Re-Order truthfulness | **prošlo** | fulfilled-only, 14denní filtr, bez hardcoded slevy; 107/107 testů |

Tento snapshot **neprohlašuje pilot za připravený**. Build/test a SQL metadata
jsou důkazy jednotlivých vrstev. Pro kritický workflow stále potřebujeme
dokončit call/order cestu, SQL kontrolu, negativní role/workspace scénáře a
idempotency/recovery důkaz.

## Aktuální To Dos — 31. 8. 2026

1. **P1 — schválit provisioning a negativní RLS důkaz po PR #61**

   Migration/policy diff, katalogový pgTAP test a rollback-scoped runtime test
   jsou hotové (`46/46`; detail v
   [RLS_ROLE_WORKSPACE_EVIDENCE_20260831.md](RLS_ROLE_WORKSPACE_EVIDENCE_20260831.md)).
   Zbývá schválený role/cross-workspace CRUD test proti sandboxu a samostatné
   rozhodnutí, zda migraci aplikovat. Žádný implicitní `db push`.

2. **P1 — pozitivní pilotní browser/persistence důkaz — lead-note cesta doložena**

   Administrator allowed path, načtení `/workspace`, návrat lead note po reloadu
   a matching read-only SQL row jsou ověřené v Preview/Sandbox. Call start
   skončil stavem `Audio session could not be initialized`, takže nevznikl
   call/outcome důkaz. Zbývá negativní role/cross-workspace/RLS scénář; Operator
   custom-object denial je samostatně doložený v PR #63.

3. **P1 — pravdivost kritických mock/unavailable ploch je zkontrolovaná**

   Re-Order heuristika je opravena a zdokumentována. Monitor, training,
   objection surface a telephony/inbound zůstávají explicitně označené jako
   unavailable nebo simulation; dashboard activity/KPI a workflow provider
   side effects nemají být vydávány za live zdroj bez odpovídající persistence.
   Tento audit neuzavírá pozitivní pilotní ani integrační důkaz.

4. **P2 — uklidit historickou dokumentaci a staré drafty — dokončeno**

   Aktuální checkpoint byl aktualizován a PR #64/#66/#67 jsou sloučené; po
   porovnání unique commits byly #6, #7, #8, #21, #28, #46 a #47 vědomě
   uzavřeny bez merge. `docs/ideas.md` zůstává neschválenou bankou nápadů,
   nikoli aktuálním delivery plánem. Širší sjednocení historických katalogů je
   samostatný P2 follow-up.

## Doporučené pořadí navazujících slices

Každý bod níže je jeden tematický commit. Nepřidávat do něj nesouvisející UI
nebo novou funkci jen proto, aby byl commit větší.

1. **P1 — Dashboard hierarchy pass — dokončeno v PR #58**

   Dashboard nyní zachovává současný vizuální systém, staví týmovou pozornost
   před podpůrná data a prezentuje KPI jako workspace/team scoped. Změna
   nepřidává nové KPI, telephony ani širší release gate.

2. **PR #61 — RLS policy cleanup na aktuálním main — dokončeno**

   PR #28 je historický predecessor. PR #61 je sloučené; katalogový test
   prošel rollbackem. Role/cross-workspace CRUD a live provisioning jsou
   samostatná ověření; žádný implicitní `db push`.

3. **P1 — čerstvý autentizovaný pilotní důkaz**

   Po relevantních mergech projít login → workspace → claim/call/outcome nebo
   order → reload → SQL read-back, včetně negativní role a cizího workspace.

4. **P2 — sjednotit historickou dokumentaci**

   Samostatně projít `README.md`, `docs/architecture.md`, `docs/roadmap.md` a
   `docs/commits.md`, aby vize nebyla zaměněná za současný live scope. Tento
   checkpoint aktualizuje aktuální stav, nikoli všechny historické katalogy.

5. **P2 — Operator Console keyboard action binds — dokončeno v aktuálním slice**

   Operator Console nyní podporuje `C` pro zahájení/ukončení hovoru, `M` pro
   mute/unmute, `1–4` pro post-call outcome a `N` pro focus poznámky. Zkratky
   používají stejné handlery jako klikací ovládání, takže neobcházejí stavové,
   role ani serverové guardy. Při psaní do inputu, textarea, selectu nebo
   contenteditable se neaktivují; stejně tak jsou pozastavené přes otevřený
   incoming-call nebo callback modal. Mapování a ochranné hranice pokrývá
   `tests/operator-keyboard-shortcuts.test.ts`.

6. **P2 — Kompaktní režim karty klienta — plánováno**

   Zachovat kompletní Client Profile, ale umožnit přepnutí do kompaktního
   řádku s nejdůležitějšími údaji během hovoru, aby měl operátor více prostoru
   pro Product Script. Režim nesmí skrývat aktivní stav hovoru ani vytvořit
   druhou variantu datového zdroje.

7. **P2 — Callback modal focus management — dokončeno v aktuálním slice**

   Callback modal nyní po otevření zaměří datum a čas, `Escape` ho zavře,
   po zavření vrátí fokus na původní prvek a po validační nebo serverové chybě
   zaměří chybovou hlášku. Existující callback persistence a stavové guardy se
   nemění.

8. **P2 — Recent context v Operator Console — plánováno**

   Přidat krátký řádek s posledním kontaktem, posledním výsledkem hovoru,
   poslední objednávkou a aktivním callbackem. Každá hodnota musí pocházet z
   uložených a workspace-scoped dat; při chybějící hodnotě se zobrazí pravdivý
   fallback. Nejde o nový tab ani prediktivní doporučení.

9. **P1 — Telephony Foundation přes Telnyx — plánováno**

   Pro první produkční telefonní vrstvu je vybraný Telnyx. Integrovat odchozí a
   příchozí hovory, stavové webhooky, nahrávky, browser audio, media stream a
   stabilní propojení hovoru s leadem, operátorem a objednávkou. Tento slice
   nezahrnuje vlastní VoIP infrastrukturu ani osobní Vodafone číslo; začíná se
   samostatným testovacím/firemním číslem. Lokální SIP provider zůstává možnou
   pozdější cost-optimization variantou.

10. **P1 — Gemini post-call AI — plánováno, závisí na telefonii**

   Po dokončení telefonní vrstvy přidat Gemini přepis hovoru a následné
   generování návrhu verdiktu, poznámky a dalších akcí. Návrh zůstává plně
   editovatelný operátorem; free tier je určený pouze pro vývoj/test a reálná
   zákaznická data patří do placeného režimu. Provider-neutral hranice zůstává
   zachovaná pro případné pozdější přidání OpenAI.

## Nové desatero pro práci na projektu

1. **Nejdřív řekneme, co přesně měníme.** Každý úkol má cíl, co do něj
   nepatří, riziko a jasný způsob ověření.
2. **Jeden commit řeší jednu věc.** Funkce, refaktor, migrace a dokumentace se
   nemíchají jen kvůli pohodlnějšímu pushi.
3. **Kód není důkaz hotového workflow.** U každého důležitého zápisu chceme
   přihlášení, správnou roli, reload a kontrolu výsledku v databázi.
4. **Bezpečnost žije na serveru a v RLS.** UI může něco skrýt, ale nesmí být
   jedinou ochranou workspace nebo role.
5. **Migrace měníme pouze po explicitním source-of-truth rozhodnutí.** Rozdíl
   mezi repozitářem a live databází evidujeme jako samostatný incident; tento
   handoff ani polish plán z něj automaticky nedělají gate pro další práci.
6. **Nevyrábíme falešné signály.** Žádné smyšlené latency, online stav,
   AI skóre, e-mail, telephony nebo „success“, když se nic neuložilo.
7. **Simulace jsou viditelně simulace.** Training, softphone a lokální fallback
   nesmí vypadat jako produkční call centrum.
8. **Kontroly spouštíme před handoffem.** Minimálně test, lint, typecheck,
   build a `git diff --check`; u datové změny navíc browser + SQL smoke.
9. **Opravujeme příčinu, ne masku.** Nevypínat pravidla, nezakrývat chybu
   fallbackem a nemažme test jen proto, aby vyšel zeleně.
10. **Po práci necháme stopu.** Aktualizovat stavový dokument, přesně uvést
    ověření, stageovat konkrétní soubory a push/merge dělat až po kontrole
    divergence větví.

## Kdy smíme říct „interní pilot je připravený“

Teprve až platí všechno níže:

- schema provisioning contract a fresh-schema/policy proof jsou schválené;
  migration-history rozdíl má explicitní rozhodnutí a není automatickou gate;
- bezpečnostní audit nemá otevřený P0 problém;
- reálný Auth uživatel projde hlavním workflow a zápisy přežijí reload;
- role a cizí workspace jsou ověřené negativním testem;
- Product Script má jasný a ověřený zdroj pravdy;
- simulované části jsou zřetelně oddělené od produkčních záznamů;
- testy, lint, typecheck, build a dependency audit mají vysvětlený výsledek;
- dokumentace odpovídá tomu, co skutečně běží.

Do té doby je správný status: **stabilizační práce / interní pilot v přípravě**.
