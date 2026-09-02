# Countdown CRM — projektový kontext

**Účel tohoto souboru:** jeden aktuální, stručný zdroj kontextu pro člověka i
Codex. Tento soubor není povinný workflow protokol, nenahrazuje testy a sám o
sobě neprokazuje, že je nějaká funkce pilot-ready nebo production-ready.

**Snapshot:** 2. 9. 2026  
**Repo baseline:** `main` na commitu `e307aa7`  
**Produktový stav:** stabilizace před bezpečným interním pilotem; aktuální slices 1–4 jsou implementované

## 1. Co Countdown CRM je

Countdown CRM je workspace-scoped CRM pro výkonnostní call centra a tele-sales.
Hlavní pracovní plocha je Operator Console: operátor dostane serverem řízený
lead, vede hovor, zaznamená výsledek a podle výsledku pokračuje dalším leadem,
callbackem nebo objednávkou.

Produkt stojí na těchto pilířích:

- leady, zákaznický kontext, produkty a produktové skripty,
- serverem řízená fronta leadů, assignment, callback a recovery,
- hovory a objednávky s lifecycle a auditní stopou,
- workspace timeline, kalendář, dashboard a týmové přehledy,
- role `operator`, `team_leader` a `administrator`,
- workspace-scoped oprávnění, serverové guardy a Supabase RLS,
- administrace produktů, objection cards, workflow a blueprintů,
- oddělený training/simulator workflow,
- Customer 360 retention snapshot, vysvětlitelný Next Best Action a Team Leader
  Daily Brief; všechny tři vrstvy jsou deterministické nad uloženými daty,
- wallet ledger a pravidla pro delivered-order bonus a měsíční provizi.

## 2. Co dnes skutečně běží

Repozitář a poslední stavové dokumenty popisují stabilizační základ, nikoli
obecnou produkční připravenost.

### Jádro CRM

- Next.js App Router, React, TypeScript a Tailwind CSS.
- Supabase PostgreSQL a Auth jsou datový a autentizační základ.
- Kritické zápisy vedou přes serverovou datovou vrstvu, Server Actions nebo
  databázové RPC.
- Workspace se odvozuje z membership uživatele; UI není jediná autorizace.
- Operator Console má claim, start/cancel hovoru, heartbeat, outcome,
  callback, lease/recovery a routing dalšího leadu.
- Objednávky mají lifecycle, historii stavů, položky checkoutu a auditní stopu.
- Product Scripts mají administrator-only editor, draft/publish/archive model,
  sanitizaci a read-only zobrazení pro operátora.
- Blueprint apply je server-authoritative a ukládá stav, atributy i workflow
  společně.
- Lead detail obsahuje Customer 360 retention snapshot; Dashboard obsahuje
  Next Best Action a Team Leader Daily Brief. Nejde o live AI predikci ani
  o nahrazení serverového queue assignmentu.
- Wallet MVP má immutable ledger, delivered-order bonus, měsíční provizi a
  auditované ruční úpravy; fulfillment webhook a settlement job zatím nejsou
  připojené.

### Role

| Role | Hlavní odpovědnost |
|---|---|
| Operator | Aktuální assignment, hovor, skript, outcome, callback, objednávka a vlastní pracovní data. |
| Team Leader | Lead directory, týmové řízení, reassign/release/reopen, přehledy, schválené manažerské akce a auditované ruční wallet adjustmenty `+ / −`. |
| Administrator | Katalog, skripty, objection cards, workflow, blueprinty, audit, workspace administrace a globální nastavení provizí a bonusů. |

Databáze musí vynutit workspace a roli. Přímá URL, skryté tlačítko ani UUID
nesmí sloužit jako permission bypass.

### Wallet

- Zůstatek je odvozený z immutable ledgeru, nikoli ručně upravovaný stav.
- Bonus vzniká pouze na serverem autoritativní `delivered` události.
- Vrácená objednávka vytváří reversal; opakovaný event je chráněný ID.
- Měsíční provize je samostatná transakce za uzavřený měsíc.
- Fulfillment event i měsíční settlement jsou service-role hranice.
- Bankovní převod nebo produkční payout není součástí tohoto scope.

### Odložené wallet nastavení a role

Konfigurace provizí a automatických bonusových pravidel je nyní v administrační
části `/settings`. Tato sekce je pro Team Leadera/Administrátora a zahrnuje
měnu, provizní sazbu a bonusové thresholdy/pravidla.

Ve Wallet zůstane finanční přehled. `team_leader` může ve Wallet provádět
ruční auditované kladné nebo záporné bonusové úpravy konkrétního člena, ale
nesmí měnit globální provizní sazbu ani automatická bonusová pravidla.
`operator` uvidí pouze vlastní zůstatek, bonusy a transakce; administrační
formuláře ani týmové zůstatky se mu nezobrazují.

Stejné hranice jsou v UI, Server Actions, DAL a RPC guardech. `/wallet` ponechává
přehled a auditovanou ruční úpravu; globální nastavení už se tam nezobrazují.

## 3. Co se nesmí vydávat za hotové

Starší vize a roadmapy místy popisují cílový produkt jako hotový live AI
copilot. Aktuální interpretace je střízlivější:

- Browser softphone a training jsou simulace, ne živá ústředna.
- Inbound provider, webhooky, audio upload a produkční transcription/AI call
  analysis jsou budoucí integrační scope.
- Live sentiment, live supervisor monitoring, live presence stream a část
  forecast/KPI zůstávají `Unavailable`, pokud pro ně neexistuje skutečný zdroj.
- E-mail, SMS, WhatsApp a pay-link dispatch nejsou potvrzené live integrace.
- `AI-assisted` nebo fallback label není důkaz živé AI.
- Build, unit test nebo lokální fixture test není důkaz persistence,
  authorization, RLS ani concurrency.
- `NEXT_PUBLIC_ALLOW_DEMO_AUTH=true` patří pouze do lokálního vývoje; nesmí se
  objevit ve sdíleném stagingu ani produkci.
- `supabase/schema.sql` je historický/neúplný snapshot. Pro další změny jsou
  zdrojem verzované migrace, aplikační kód a schválené SQL; nasazení se ověřuje
  proti skutečné migration history a schématu konkrétního cíle.

## 4. Poslední zaznamenaná evidence

Níže uvedené výsledky jsou převzaté z dokumentace s posledním snapshotem kolem
31. 8. 2026. Nejsou automaticky novým testem po resetu Codexu.

### Čerstvé lokální ověření — 2. 9. 2026

- `npm test`: 30 testovacích souborů, 126 testů, vše prošlo.
- `npm run lint`, `npm run typecheck` a `npm run build` prošly.
- Production build zkompiloval všech 25 statických stránek a aktuální route
  mapu včetně `/wallet`, `/leads/[leadId]`, `/training/reviews` a serverových
  training API.
- Toto je pouze repo/build evidence; nepotvrzuje live persistence, RLS,
  concurrency ani externí integrace.

### Zaznamenáno jako ověřené

- Repo gates v příslušných mergeh: testy, lint, typecheck, production build a
  `git diff --check`.
- Queue/assignment routing, callback affinity, recovery a multi-operator
  browser smoke.
- Operator Console telephony boundary: audio failure/cancel se nepřetvařují
  jako aktivní nebo dokončený call.
- Product Script draft → publish → archive, sanitizace a role boundary.
- Custom-object Operator denial a pravdivý `Unavailable` stav.
- Administrator Preview/Sandbox `/workspace`, lead-note persistence po reloadu
  a read-only SQL read-back.
- Lokální rollback-scoped RLS katalogový test; evidence uvádí 58 úspěšných testů
  ve spojeném běhu.
- Blueprint infrastruktura je podle evidence aplikovaná v Preview/Sandbox i
  produkci; Preview má pozitivní activation/read-back, produkce zůstává bez
  aktivovaného blueprintu.

### Stále otevřené nebo omezené

- Čerstvý authenticated end-to-end důkaz call → outcome/order → reload → SQL
  read-back po aktuálních mergech.
- Pozitivní Team Leader/Administrator browser průchod a negativní
  cross-workspace/RLS scénáře v odpovídajícím cíli.
- Live persistence, opakované eventy, rollback a skutečný concurrency důkaz
  mimo rollback/disposable testy.
- Fulfillment provider a service-role webhook pro wallet.
- Skutečná telephony/inbound integrace.
- Jeden starší historický order/item mismatch v Preview/Sandbox zůstává
  explicitně evidovaný k data remediation; nové zápisy už mismatch odmítají a
  analytics částky nezapočítávají přes různé měny.
- Rozlišení aktuálního produktu od historických AI, omnichannel a workflow
  slibů.

Správný status bez nového důkazu je **stabilizační práce / interní pilot v
přípravě**, nikoli obecné `production-ready`.

## 5. Nejbližší smysluplný směr

1. Řídit nejbližší práci podle [balíčku dalších slice](docs/NEXT_WORK_PACKAGE_20260902.md):
   nejprve důkazní gate hlavního workflow, potom re-order truthfulness a wallet
   boundary.
2. Každý slice držet malý a samostatně ověřitelný; průběžně ukládat smysluplný
   checkpoint;
   není nutné čekat na absolutní jistotu o celém produktu před každým commitem.
3. Live databázové změny, migration apply, externí provider a produkční deploy
   řešit jako samostatně schválené operace.
4. Nové funkce z velkých historických roadmap přidávat až po stabilizaci
   hlavního Operator Console workflow.

## 6. Jak číst starší dokumentaci

Když se dokumenty rozcházejí, použij toto pořadí:

1. aktuální kód, migrations a skutečné ověření konkrétního cíle,
2. tento `PROJECT.md`,
3. nejnovější stavový dokument,
4. konkrétní evidence s přesnou hranicí důkazu,
5. starší roadmapa, vize, implementační plán nebo commitový katalog.

Historické dokumenty nejsou automaticky instrukce pro Codex. Zachovávají
provenienci, rozhodnutí a důkazy, ale staré příkazy typu „další commit musí
projít celým workflow“ se po resetu nepřenášejí jako povinný pracovní režim.

## 7. Mapa dokumentace

### Aktivní kontext

- `PROJECT.md` — tento soubor; jediný sjednocený projektový kontext.

### Stav produktu a stabilizace

- `docs/AKTUALNI_STAV_A_DESATERO.md` — poslední podrobný stavový snapshot,
  otevřené důkazy a historické desatero; slouží jako zdroj při této konsolidaci,
  nikoli jako nový povinný workflow.
- `docs/PRODUCT_STATUS.md` — detailní produktový status, baseline, rizika a
  historický refactoringový kontext.
- `docs/PROJECT_POLISH_CHECKPOINT_20260826.md` — audit nálezů a priorit.
- `docs/PROJECT_POLISH_IMPLEMENTATION_PLAN_20260826.md` — historický plán
  polish slices; neřídit podle něj nový task bez nového rozhodnutí.

### Produktová vize, architektura a backlog

- `README.md` — veřejný vstup do projektu a rychlé spuštění.
- `docs/vision.md` — původní vize rolí a produktu.
- `docs/architecture.md` — architektonická vize, EAV, workflow a směrování.
- `docs/roadmap.md` — původní vícefázová roadmapa.
- `docs/NEXT_WORK_PACKAGE_20260902.md` — aktuální výběr a pořadí nejbližších
  implementačních a důkazních slice.
- `docs/commits_roadmap.md` — historický katalog plánovaných fází.
- `docs/commits.md` — historický katalog commitů.
- `docs/ideas.md` — neschválená banka nápadů, nikoli současný delivery plán.

### Databáze, migrace a autorizace

- `docs/DATABASE_COMPLETION_CHECKLIST.md`
- `docs/DATABASE_STABILIZATION_CHECKPOINT.md`
- `docs/SUPABASE_PROVISIONING_CONTRACT_20260827.md`
- `docs/RLS_ROLE_WORKSPACE_EVIDENCE_20260831.md`
- `docs/CALL_OUTCOME_RECOVERY_MIGRATION_PROVENANCE_20260825.md`
- `docs/CALL_OUTCOME_RECOVERY_MIGRATION_RECONCILIATION_20260825.md`
- `docs/CALL_OUTCOME_RECOVERY_SANDBOX_APPLICATION_20260825.md`

Tyto soubory oddělují lokální test, rollback evidence, migration provenance a
live cíle. Žádný z nich sám o sobě nepovoluje produkční `db push`.

### Operator Console, UX a browser evidence

- `docs/OPERATOR_CONSOLE_AUDIT_2026-08-11.md`
- `docs/OPERATOR_CONSOLE_REDESIGN_BRIEF_2026-08-19.md`
- `docs/OPERATOR_CONSOLE_STATE_MAP_2026-08-30.md`
- `docs/OPERATOR_UI_SMOKE_TEST_20260827.md`
- `docs/ADMIN_UI_SMOKE_TEST_20260827.md`
- `docs/ADMIN_PILOT_PERSISTENCE_20260831.md`
- `design-qa.md` — historický design QA záznam.

### Implementační plány a předávky

- `docs/CALL_OUTCOME_RECOVERY_IMPLEMENTATION_PLAN.md`
- `docs/IMPLEMENTATION_PLAN_COMMIT_6.md`
- `docs/IMPLEMENTATION_PLAN_HARDENING_CHECKPOINT.md`
- `docs/IMPLEMENTATION_PLAN_ROADMAP_RECONCILIATION.md`
- `docs/USER_WALLET_MVP_HANDOFF_20260831.md`

Tyto soubory popisují dílčí scope a přijetí konkrétního slice. Nejsou
globálním pracovním řádem.

### Legacy workflow artefakty

- `docs/GIT_WORKFLOW.md` — historický jednoduchý Git workflow; po resetu není
  automatickým pravidlem.
- `CLAUDE.md` — starý jednorádkový odkaz na odstraněný `AGENTS.md`; je
  zastaralý a nemá být zdrojem nových instrukcí.

## 8. Co je po konsolidaci záměrně zachováno

Staré dokumenty se v tomto kroku nemažou. Obsahují historické důkazy, přesné
hranice testů, migration provenance a rozhodnutí, která by se při slepém
sloučení nebo smazání ztratila. `PROJECT.md` je nový kanonický vstup; později
lze po samostatné kontrole staré soubory přesunout do archivu nebo odstranit
jednotlivě.
