# Countdown CRM — aktuální stav a desatero

**Snapshot:** 30. 8. 2026
**Ověřený baseline:** `origin/main` = `853e78427dc5e198e826373dc44d52567eba348e`
**Aktuální stav:** PR #23 a PR #44 jsou sloučené; Blueprint infrastruktura je aplikovaná v Preview/Sandbox i produkci, další implementační kandidáty zůstávají v draft PR
**Navazující checkpoint:** [PROJECT_POLISH_CHECKPOINT_20260826.md](PROJECT_POLISH_CHECKPOINT_20260826.md)

## Jedna věta na úvod

Jsme ve fázi **stabilizace před bezpečným interním pilotem**. Základ CRM,
workspace oprávnění, fronta leadů, objednávky a lifecycle hovoru už existují.
Nejsme ale ve fázi, kdy bychom měli bez dalšího přidávat velké funkce nebo
tvrdit, že je produkt připravený pro běžný produkční provoz.

Nejbližší práce je redesign Operator Console. Order checkout items jsou
implementované v PR #44 a lokálně ověřené; pokročilé live persistence/RLS/
concurrency testy zůstávají vědomě odložené. Server-authoritative Blueprint
apply je sloučený v PR #23 a jeho potřebné migrace jsou ověřeně aplikované v
obou aktuálních Supabase cílech.

## Čerstvý delivery checkpoint — 30. 8. 2026

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
- Aktuální repo gate doložený na PR #49: `npm test` 90/90, `npm run check`
  (lint, typecheck, build) a `git diff --check` prošly.
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
- Atomic business mutation + audit kontrakt je po PR #45 v `main`; chybí však
  live Postgres rollback, authenticated persistence a skutečný RLS/concurrency
  důkaz. PR #21 je proto pouze duplicitní historický draft.
- Hlavní Operator Console completion má server-owned dispatch cestu, ale chybí
  nový end-to-end browser/persistence důkaz po aktuálním merge.
- Analytics role boundary a CSV escaping jsou již sloučené do `main`.
- Produkční negativní browser smoke s reálným účtem `mikestudio` ověřil roli
  `Operator`: `/workspace` nezobrazuje Blueprint administraci, administrátorské
  nav položky jsou skryté a přímé `/workflows` vrací `Unavailable`. Přímé
  odmítnutí RPC/serverové mutace Operatora nebylo v tomto průchodu spuštěno;
  chybí také cizí workspace, opakovaný submit a plný live RLS/concurrency
  důkaz. Idempotence je nyní chráněná v kódu databázovým `event_id` klíčem.

Podrobný nálezový inventář a oddělení static/browser/persistence/authorization/
RLS evidence je v [Project Polish Checkpointu](PROJECT_POLISH_CHECKPOINT_20260826.md).

## Stav otevřených důkazů — 30. 8. 2026

- PR #23 — server-authoritative Blueprint apply: **MERGED** jako `9a8cbc0`.
  Preview/Sandbox má pozitivní Admin apply, reload a SQL read-back; produkce má
  aplikovanou infrastrukturu a čisté `/workspace`, ale Blueprint v ní zatím
  nebyl aktivován.
- PR #28 — explicitní RLS policies: **OPEN/DRAFT**. Live databáze nebyla
  změněna; případné nasazení vyžaduje samostatný provisioning plán a souhlas.
- PR #44 — persistované order items v checkoutu: **MERGED** jako `853e784`.
  Lokální gates a Preview check prošly; pokročilé live persistence/RLS/
  concurrency důkazy jsou odložené.

### Inventura otevřených draft PR

| PR | Obsah | Aktuální rozhodnutí |
|---|---|---|
| #6 | starý pilot-readiness gate | historický dokumentační draft; nenahrazuje tento checkpoint |
| #7 | starší order-checkout větev | překrývá se s #44; před jakýmkoli merge nejdříve porovnat unique commits |
| #8 | starý Operator UI smoke záznam | evidence-only draft; aktuální smoke dokumenty jsou v `main` |
| #21 | starší duplicitní atomic business/audit draft | superseded PR #45; nemergovat |
| #23 | server-authoritative Blueprint apply | sloučeno; další důkaz je role-negative a produkční rozhodnutí o aktivaci |
| #28 | explicitní RLS policies | samostatný security slice; bez implicitního live apply |
| #44 | order items v call checkoutu | sloučeno; pokročilé live důkazy jsou odložené |
| #46 | status dokumentace po starším auditu | zastaralý docs draft; tento checkpoint ho nahrazuje |
| #47 | custom logo branding TODO | mimo schválený MVP scope ikon; nemergovat |

Staré drafty se nemažou ani nezavírají automaticky. Nejprve se porovnají jejich
unikátní commity a teprve potom se případně archivují nebo vědomě uzavřou.

- Přihlášený Administrator prošel read-only smoke na `/workspace`, `/leads`,
  `/orders`, `/settings` a `/team`; výsledek je v
  [ADMIN_UI_SMOKE_TEST_20260827.md](ADMIN_UI_SMOKE_TEST_20260827.md). Negativní
  Operator/cross-workspace scénáře tím nejsou nahrazené.
- Přihlášený Operator prošel stejné routy; `/leads` a `/team` vrátily pravdivý
  unavailable stav a admin-only navigace nebyla dostupná. Důkaz je v
  [OPERATOR_UI_SMOKE_TEST_20260827.md](OPERATOR_UI_SMOKE_TEST_20260827.md).
- Aktuální repozitářový gate prošel: testy, lint, typecheck, build a diff
  kontrola. Linked Supabase lint je čistý; linked migration dry-run byl
  bezpečně zastaven bez změny databáze.

## Ověření tohoto průchodu

| Kontrola | Výsledek | Poznámka |
|---|---|---|
| `npm test` | **prošlo** | 90/90 na aktuálním `origin/main` podle PR #49 |
| `npm run check` | **prošlo** | lint, typecheck a production build prošly podle PR #49 |
| `git diff --check` | **prošlo** | bez whitespace chyb |
| `npm audit --omit=dev --audit-level=high` | **prošlo** | 0 vulnerabilities po čisté instalaci |
| no-unused/static scan | **prošlo** | mrtvý operator status state odstraněn a PR #24 sloučen |
| Blueprint browser smoke | **prošlo v Preview/Sandbox** | Administrator apply + reload; produkce pouze čisté načtení bez aktivace |
| Blueprint persistence | **prošlo v Preview/Sandbox** | SQL read-back potvrdil stav, 4 atributy, workflow a `leads` objekt |
| Call checkout order items | **prošlo staticky** | 96 testů + lint/typecheck/build; live persistence je odložená |
| authorization/RLS | **částečně doloženo** | Operator UI negative smoke prošel; RPC/RLS metadata jsou v obou cílech, přímé denial/RLS provedení chybí |

Tento snapshot **neprohlašuje pilot za připravený**. Build/test a SQL metadata
jsou důkazy jednotlivých vrstev. Pro kritický workflow stále potřebujeme
čerstvý browser test s reálným Auth uživatelem, reloadem, SQL kontrolou,
negativními role/workspace scénáři a idempotency/recovery důkazem.

## Doporučené pořadí navazujících slices

Každý bod níže je jeden tematický commit. Nepřidávat do něj nesouvisející UI
nebo novou funkci jen proto, aby byl commit větší.

1. **P1 — Operator Console redesign**

   Navázat na existující brief a zlepšit informační hierarchii hlavní pracovní
   plochy operátora. Neřešit přitom telephony integraci ani širší release gate.

2. **DRAFT PR #28 — RLS policy cleanup**

   Samostatný bezpečnostní slice. Nejdříve přesný diff policies a provisioning
   plán, následně případné sandbox/live ověření; žádný implicitní `db push`.

3. **P1 — čerstvý autentizovaný pilotní důkaz**

   Po relevantních mergech projít login → workspace → claim/call/outcome nebo
   order → reload → SQL read-back, včetně negativní role a cizího workspace.

4. **P2 — sjednotit historickou dokumentaci**

   Samostatně projít `README.md`, `docs/architecture.md`, `docs/roadmap.md` a
   `docs/commits.md`, aby vize nebyla zaměněná za současný live scope. Tento
   checkpoint aktualizuje aktuální stav, nikoli všechny historické katalogy.

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
