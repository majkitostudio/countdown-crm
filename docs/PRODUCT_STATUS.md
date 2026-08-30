# Countdown CRM — Product Status & Refactoring Baseline

**Datum aktualizace:** 2026-08-30
**Status dokumentu:** historická baseline a auditní historie; aktuální stav je v
[`docs/AKTUALNI_STAV_A_DESATERO.md`](AKTUALNI_STAV_A_DESATERO.md)
> **Aktualizace 30. 8. 2026:** Tento dokument obsahuje historickou baseline a
> průběžné záznamy jednotlivých stabilizačních etap. Pro rozhodování podle
> současného checkoutu používej nejdříve
> [`docs/AKTUALNI_STAV_A_DESATERO.md`](AKTUALNI_STAV_A_DESATERO.md), který
> vychází z `origin/main` na `e80bc71` a z odděleného read-only ověření
> produkčního deploymentu. Historické počty a checkpointy níže nejsou nový
> důkaz aktuálního runtime.

**Datum baseline:** 2026-08-09  
**Status:** stabilizační a auditní fáze
**Produktový cíl:** Attio-grade CRM pro call-centra s AI copilotem, telephony workflow a bezpečným interním provozem

> **Aktuální handoff:** Stručný stav, priority commitů a závazná pracovní pravidla jsou v [`docs/AKTUALNI_STAV_A_DESATERO.md`](./AKTUALNI_STAV_A_DESATERO.md). Tento dokument zůstává podrobnější auditní historií; starší části s datem nebo historickými počty se nemají číst jako dnešní ověření.

## Aktuální checkpoint — 2026-08-22

Jádro CRM je v pilot-ready stavu pro ověřené workflow: auth/workspace/role hranice, leady, produkty, hovory, objednávky, queue/callback routing, kalendář, training review a Product Script základ mají skutečné serverové a databázové cesty. Projekt ale není obecně production-ready.

Product Script verzování, publikování a archivace je implementačně uzavřené v
`baabfc3`, který je pushnutý na `feat/order-detail-edit`. Remote Supabase i lokální
migration files evidují `20260822114853`, `20260822115016` a `20260822120928`;
`archived` je sjednocený v SQL, TypeScriptu, DAL i UI. Přihlášený browser smoke
draft → publish → reload → Operator Console read prošel v produkčním buildu;
zbývá pouze oddělená role-only UI relace. Migrace se nesmí slepě znovu aplikovat.

Aktuální checkout obsahuje generované/recovery složky mimo produktový zdroj; Product Script změny jsou již oddělené v `baabfc3`. Proto je nejbližší práce role-only smoke a čistý quality gate, teprve poté Operator Console redesign.

## Ověřený slice: Operator Calendar (2026-08-19)

Operator Console nyní rozlišuje dvě nezávislé věci, které operátor vidí v
jednom kalendáři:

- callback vzniká z explicitního plánování v call flow (outcome `Schedule
  Callback`; také při ukončení aktivního hovoru je nutné vybrat termín) a
  zůstává součástí `lead_queue_items`,
- osobní reminder je samostatný workspace-scoped záznam v
  `operator_reminders` a nemění stav call queue.

Kalendář podporuje zobrazení, filtrování, vytvoření, úpravu, dokončení a
zrušení reminderu. Připomínky jsou zatím pouze in-app; tato změna nezavádí
Google/Outlook synchronizaci, e-mail, SMS, push notifikace ani týmové
remindery. Přístup je chráněn autentizací, workspace/RLS pravidly a serverovou
DAL/Server Action vrstvou.

## 1. Proč tento dokument vzniká

Countdown CRM má velký rozsah implementovaných obrazovek, doménových modulů a prototypových workflow. Dosavadní vývoj byl rychlý, ale kontrola kvality nebyla konzistentní. Některé reporty označovaly projekt za plně ověřený, přestože se část problémů řešila změnou ESLint konfigurace, fallbacky nebo mock daty místo opravy skutečného chování.

Tento dokument je nový autoritativní výchozí bod pro další práci. Popisuje:

- co lze v aktuálním projektu považovat za skutečný základ,
- co je pouze rozpracované nebo demonstrační,
- která rizika mají přednost,
- v jakém pořadí budeme systém stabilizovat,
- jak bude vypadat schvalování a ověřování dalších změn.

Dokument není prohlášení, že projekt je produkčně připravený. Je to vědomě střízlivá baseline.

## 2. Schválená produktová orientace

### MVP

První MVP bude provozováno pro jednu firmu a jeden hlavní workspace. Přesto bude datový model navržen tak, aby bylo možné později produkt prodávat více firmám bez kompletního přepisu:

- entity budou připravené na vazbu k workspace/organizaci,
- oprávnění nebudou navržena pouze jako globální authenticated/unauthenticated přepínač,
- role operator, team leader a administrator jsou určeny pro lidské workspace
  členy; termín agent je rezervovaný pro AI a agentic runtime,
- izolace dat bude řešena na databázové a serverové vrstvě, ne pouze v UI.

### Demo/Sandbox UI

Uživatelský přepínač `Demo Sandbox / Production DB` byl odstraněn. Nebyl
skutečným přepínačem databáze ani workspace a lokální simulace některých akcí
vytvářely nejasnost mezi reálným zápisem a pouhým náhledem.

Objednávkové workflow nyní zapisuje přes skutečnou serverovou datovou vrstvu.
SMS pay-link a externí follow-up zůstávají viditelně nedostupné, dokud nebude
zapojena schválená integrace. Rychlé poznámky nyní zapisuje workspace-scoped
serverová DAL/Server Action do `lead_notes`; timeline je po vytvoření znovu
načte a autor se odvozuje z autentizovaného operátora.

Gemini enrichment při nedostupné integraci vrací explicitní `Unavailable` a
nevyrábí lokální odhady firmy. Dokončení objednávky už také nemění lokální
gamifikační profil s výchozími mock hodnotami. Training, Copilot, příchozí
hovor a softphone zůstávají označené jako simulace nebo pilotní preview; nejsou
zdrojem produkčních CRM záznamů ani důkazem live telephony integrace.

Vývojový `NEXT_PUBLIC_ALLOW_DEMO_AUTH` je samostatný autentizační fallback a
není součástí uživatelského workflow. Zůstává mimo tento slic a nesmí být
zapnutý ve sdíleném stagingu ani v produkci.

### Produktová priorita

Primární cíl další fáze je bezpečný interní pilot. Současně nebudeme dělat architektonická rozhodnutí, která by později znemožnila vznik multi-tenant platformy ve stylu Attio.

### Design

Současný vizuální směr má použitelný základ a nebude plošně zahazován. Je ale nutné provést produktovou revizi míst, která působí genericky nebo jako AI-generated UI. Nejvyšší prioritu má Operator Console, protože je to hlavní pracovní plocha operátora a nejsilnější reprezentace produktu.

## 3. Aktuální technický stav

### Základní stack

- Next.js 16.3.2, App Router, Turbopack
- React 19.2.4
- TypeScript 5
- Tailwind CSS 4
- Supabase PostgreSQL, Auth a SSR klient
- Google Gemini přes `@google/genai`
- Web Speech API, Web Audio API a prototypová telephony vrstva

### Aktuální Git baseline

Dokument vychází z aktuálního checkoutu, ne ze starého historického baseline:

```text
branch: feat/order-detail-edit
HEAD: baabfc3 feat: finalize product script versioning and publishing
origin/feat/order-detail-edit: baabfc3 feat: finalize product script versioning and publishing
```

Lokální větev je synchronizovaná s remote feature větví. Pracovní strom je navíc
nečistý: obsahuje necommitované docs/dependency změny a generované/recovery
artefakty. Product Script implementace a tři migration files jsou v `baabfc3`.

### Ověřovací baseline

Na aktuálním pracovním stavu platí:

- kontraktní a regresní testy (`npm test -- --run`) prošly: 3 soubory, 22 testů,
- `npm run lint` prošel a `npm audit --omit=dev --audit-level=high` hlásí 0 zranitelností,
- filtrovaný TypeScript check zdrojů prošel pro 173 souborů; `npm run typecheck` v běžném checkoutu stále načítá rozbité `node_modules-recovery-*` složky z globálního include, proto není platným zeleným gate,
- `npm run build` ještě nebyl po čisté instalaci zopakován; gate je nutné uzavřít odděleně,
- historické výsledky z předchozích ověřených slice jsou důležité jako evidence, ale nejsou náhradou za kontrolu aktuálního checkoutu,
- dependency audit z aktuálního necommitovaného upgrade je potřeba znovu potvrdit spolu s čistým lockfile gate.

### Dependency hardening — 2026-08-22

- [x] Next.js a `eslint-config-next` byly sjednoceny na `16.3.2` bez `--force` upgradu.
- [x] Lockfile nyní používá PostCSS `8.5.23`, Sharp `0.35.3` a Nanoid `3.3.18`.
- [x] `npm audit` i produkční varianta `npm audit --omit=dev --audit-level=high` hlásí
  `0 vulnerabilities`.
- [ ] Ruční Chrome gate pro mikrofon, Web Speech API a barge-in zůstává odložený do
  finální polish fáze.

Úspěšný build proto není považován za důkaz produkční připravenosti.

### Quality gates po Commitu 2

Autoritativní příkazy projektu jsou:

```text
npm run lint
npm run typecheck
npm run build
npm run check
```

`npm run check` spouští všechny tři hlavní kontroly v tomto pořadí. ESLint se
zaměřuje na aplikační zdrojový kód v `src/**`. Pomocné skripty mimo aplikaci
nejsou součástí hlavního runtime lint gate a budou řešeny odděleně.

Commit 2 nezakrývá existující lint baseline. Dokud nebude technický dluh
opraven v samostatných commitech, může `npm run check` skončit chybou kvůli
již známým ESLint problémům. To je očekávané a důvěryhodnější než globálně
vypnout pravidla nebo tvrdit, že je projekt čistý.

Každý další commit musí zachovat nebo zlepšit počet lint chyb a varování.
Nové globální výjimky, ignorované aplikační složky nebo vypínání pravidel kvůli
zelenému výsledku nejsou povolené bez samostatného schválení.

### Commit 4 — organizační základ

Commit 4 zavádí organizační model `organization → workspace → workspace member`
pro budoucí multi-tenant rozšíření. MVP může nadále používat jednu firmu a jeden
workspace.

Součástí jsou:

- `organizations`,
- `workspaces`,
- `workspace_members`,
- omezené role administrator, team_leader, operator,
- membership helper pouze na serveru,
- základní RLS pro organizační tabulky,
- opakovatelná SQL migrace v `supabase/migrations/`.

Commit 4 záměrně ještě nepřidává `workspace_id` do business tabulek. Tento
mezistav byl dokončen v Commitu 5.

### Commit 5 — datová workspace hranice

Commit 5 přidává přechodový `workspace_id` kontrakt do business tabulek:

- leads, products, calls, orders a objections,
- custom objects, attribute definitions, record entities a record values,
- workflows, workflow executions a audit logs,
- indexy a cizí klíče na `workspaces(id)`,
- bootstrap organizaci `countdown` a workspace `main`,
- backfill existujících řádků do bootstrap workspace.

Sloupce zůstávají v tomto commitu nullable záměrně. Aktuální browser service
vrstva ještě nepředává workspace ID při každém zápisu. Commit 5 proto není
prohlášení o dokončené tenant izolaci a nemění původní business RLS politiky.
Povinný workspace kontext pro DAL a následný RLS cutover musí přijít až po
úpravě aplikačních query a bootstrapu členství.

### Commit 6 — serverová DAL a workspace-aware RLS

Commit 6 zavádí první serverovou datovou hranici a připravuje bezpečné
workspace authorization:

- server-only workspace context s kontrolou membership,
- jednotné chyby datové vrstvy a minimální DTO návraty,
- DAL a Server Actions pro leady, hovory a objednávky,
- validace parent vztahů před vytvořením hovoru nebo objednávky,
- explicitní workspace filtr ve stávajících legacy Supabase službách,
- workspace ID při legacy zápisech, pokud je dostupný aktivní membership,
- workspace-aware RLS migrace,
- ochrana proti změně `workspace_id` při UPDATE,
- role boundary pro Team Leader/Administrator operace.

RLS migrace je připravená v
`supabase/migrations/20260810_0003_workspace_aware_rls.sql`. V tomto lokálním
prostředí nebyla spuštěna proti živému Supabase, protože není dostupný databázový
CLI klient ani potvrzené připojení. Produkční SQL smoke test proto zůstává
explicitním otevřeným bodem.

Některé UI cesty stále používají legacy browser služby a lokální fallbacky.
Tyto cesty mají workspace filtr a zápisový kontext, ale jejich úplný převod na
Server Actions bude pokračovat v navazující etapě. Commit 6 proto nesmí být
označen jako dokončená production-ready tenant izolace bez provedení migrace a
end-to-end ověření přihlášeného uživatele, membership a RLS.

## 4. Co je použitelné jako základ

Projekt není určen k likvidaci ani kompletnímu přepisu. Zachováváme a budeme ověřovat:

- základní Next.js aplikaci a routování,
- existující designový jazyk,
- hlavní produktovou navigaci,
- UI plochy pro leads, produkty, hovory, workflow, analytiku a training,
- existující doménové typy jako návrhový výchozí bod,
- rozpracované Supabase klienty a service vrstvy,
- telephony, speech a AI prototypy jako oddělené integrační základy,
- myšlenku operator-first workflow a Attio-style dynamických objektů.

Tyto části však budou označovány jako hotové teprve po ověření datového kontraktu, oprávnění, error state a skutečného uživatelského workflow.

## 5. Hlavní aktuální mezery a rizika

### P0/P1 — bezpečnost a autentizace

- Původní proxy obsahovala vývojový auth bypass přes klientsky nastavitelný cookie.
- Login při chybě Supabase umožňoval pokračovat bez skutečného přihlášení.
- Server Actions neměly konzistentní vlastní kontrolu identity.
- RLS politiky v SQL schématu dávají přihlášeným uživatelům příliš široký přístup.
- Schéma zatím nemá workspace/organizaci jako datovou hranici.
- Role jsou deklarované, ale nejsou důsledně použité v authorization pravidlech.

### P1 — datová vrstva

- Část Supabase service vrstev používá `as any`.
- Některé datové služby používají browser klienta i pro operace, které vyžadují serverovou autorizaci.
- Datové kontrakty TypeScriptu musí být porovnány se skutečným SQL schématem.
- Chybové stavy se na několika místech mění na mock/fallback data, takže chyba databáze může vypadat jako validní prázdný nebo demo výsledek.
- Některé operace používají implicitní defaulty, které mohou vytvořit neplatnou objednávku nebo nepravdivou analytiku.

### P1/P2 — mock prolínání mimo odstraněné Sandbox UI

Mock data existují v leads, products, calls, analytics, monitoringu, timeline, objektech, telephony a dalších modulech. Musíme přesně rozlišit:

- záměrný demo fixture,
- lokální fallback při chybě,
- skutečný produkční datový tok,
- placeholder, který se nesmí dostat do pilotu.

### P2 — kvalita kódu

- ESLint po obnovení pravidel odhaluje skutečný baseline dluhu.
- Některé React komponenty stále synchronně nastavují state uvnitř effectů.
- Existují nepoužité importy, proměnné a nevyužité disable direktivy.
- Commit `1039ddf` tvrdí odstranění všech `any`, ale v aktuálním zdrojovém kódu několik `any` stále existuje.
- Chybí testy pro nejdůležitější business a bezpečnostní scénáře.

### P2 — produktová důvěryhodnost

- Operator Console potřebuje samostatnou UX/product revizi.
- Některé AI, telephony a messaging části jsou prototypové a nesmí se prezentovat jako produkční integrace.
- Follow-up/paylink workflow zatím obsahuje demonstrační chování, které musí být explicitně označeno nebo nahrazeno skutečnou integrací.

## 6. Schválený postup refactoringu

Budeme postupovat po malých, samostatných a vratných commitech. Každý commit bude mít jeden cíl, vlastní ověření a nebude bez schválení míchat novou funkcionalitu s refaktorem.

### Commit 1 — Product status baseline

Tento dokument. Bez změny aplikačního chování.

### Commit 2 — Ověřovací základ

- sjednotit lint, TypeScript a build,
- definovat autoritativní `check` workflow,
- odstranit nejasnosti v konfiguraci,
- připravit minimální testovací základ.

### Commit 3 — Autentizace a serverové hranice

- dokončit explicitní demo režim,
- zavést konzistentní auth helpery,
- ověřovat identity uvnitř Server Actions,
- oddělit server-only data access od klienta.

### Commit 4 — Workspace, organizace a role

- navrhnout workspace/team/member model,
- připravit role a oprávnění,
- zachovat jednoduchost jednoho MVP workspace,
- vytvořit bezpečný základ pro budoucí multi-tenant provoz.

### Commit 5 — Workspace data boundary

- přidat workspace kontext do business tabulek,
- bezpečně backfillovat existující MVP data,
- připravit indexy a cizí klíče pro tenant boundary.

### Commit 6 — Supabase DAL a RLS

- přesunout citlivé operace do serverové DAL vrstvy,
- opravit RLS podle workspace a rolí,
- odstranit široké authenticated-only politiky,
- sjednotit error handling a DTO návraty.

Detailní implementační návrh je v
`docs/IMPLEMENTATION_PLAN_COMMIT_6.md`. Tento dokument je před implementací
nutné explicitně schválit.

### Commit 7 — Datový model CRM

- sjednotit SQL a TypeScript kontrakty,
- definovat entity a vztahy,
- odstranit implicitní a nebezpečné defaulty,
- vyřešit produkční UUID versus demo ID.

### Commit 8 — Demo/mock izolace (nahrazeno odstraněním Sandbox UI)

- odstranit uživatelský Sandbox přepínač, který nebyl skutečnou datovou izolací,
- odstranit fallbacky, které maskují chyby,
- zavést loading, empty a error stavy,
- označit demonstrační integrace.

### Commit 9 — Kritická CRM workflow

- lead lifecycle,
- call outcome,
- order creation,
- timeline,
- follow-up,
- audit log,
- workflow execution.

### Commit 10 — React a UX stabilizace

- hooky,
- stale data,
- race conditions,
- formuláře,
- modaly,
- loading/error/empty states,
- odstranění ESLint dluhu.

### Commit 11 — Operator Console redesign

- produktová revize hlavního pracovního prostoru,
- odstranění AI-slop prvků,
- zjednodušení operátorského workflow,
- rychlé a čitelné stavy během hovoru,
- přístupnost a práce s chybami.

### Commit 12 — Telephony a AI hranice

- lifecycle audio streamů,
- cleanup a cancellation,
- validace AI odpovědí,
- fallbacky,
- rate/cost limity,
- rozlišení simulátoru a produkční integrace.

### Commit 13 — Testy a release readiness

- kritické testy,
- smoke flows,
- dependency audit,
- produkční konfigurace,
- release checklist,
- pravdivé označení pilot-ready versus prototypové části.

Pořadí nebo obsah jednotlivých commitů může být změněn pouze po společném schválení nového plánu.

## 7. Pravidla další spolupráce

### Před implementací

Každý další krok musí mít:

- jasný cíl,
- seznam dotčených souborů nebo vrstev,
- explicitní ne-cíle,
- popis rizik,
- akceptační kritéria,
- návrh ověřovacích příkazů nebo testů.

Implementace začne až po schválení plánu oběma stranami.

### Po implementaci

Každý commit musí:

- řešit jednu tematickou oblast,
- mít čitelný commit message,
- zachovat nebo zlepšit ověřovací stav,
- projít relevantními kontrolami,
- obsahovat pravdivý report změn,
- uvádět známá omezení.

### Co se nesmí dělat bez výslovného schválení

- globálně vypínat ESLint pravidla kvůli zelenému výsledku,
- skrývat chyby pomocí širokých fallbacků,
- měnit SQL schéma bez migračního plánu,
- mazat nebo přepisovat Git historii,
- označit build za produkčně ověřený bez ověření auth, dat a workflow,
- přidávat novou velkou feature během stabilizačního commitu.

## 8. Git historie a doporučený postup

Dosavadní Git historii nemažeme. Je užitečná jako auditní stopa toho, co bylo implementováno, a umožňuje dohledat rozhodnutí i regresní změny.

Git commity nelze přesunout do běžné složky v repozitáři. Složka může obsahovat pouze dokumentaci nebo export změn, ne historii samotnou.

Doporučený postup je:

1. zachovat současný repozitář a jeho historii,
2. označit současný stav tagem nebo archivní větví například `archive/antigravity-baseline`,
3. pokračovat ve stejném repozitáři s novými, čistě pojmenovanými commity,
4. případně přidat dokumentaci shrnující původní období, nikoli mazat jeho historii,
5. force-push ani nový repozitář použít pouze tehdy, pokud by existoval konkrétní právní, bezpečnostní nebo organizační důvod.

Nový repozitář by nám nepomohl odstranit technický dluh. Pouze by skryl jeho historii a zkomplikoval porovnání. Proto zůstáváme u původního repozitáře.

## 9. Aktuální rozhodovací body

Následující rozhodnutí jsou schválena:

- MVP pro jednu firmu, architektura připravená na multi-tenant rozšíření,
- explicitní lokální demo/sandbox režim,
- priorita bezpečný interní pilot,
- zachování vizuálního směru s redesignem Operator Console,
- zachování GitHub repozitáře a historie,
- průběžný audit a opravy po malých commitech,
- žádná implementace bez předchozího společného plánu.

Další architektonická rozhodnutí budeme schvalovat před konkrétní implementací, především workspace model, RLS strategii, migrační plán SQL schématu a hranici mezi browser a serverovou datovou vrstvou.

## 10. Definice úspěchu stabilizační fáze

Stabilizační fáze bude považována za úspěšnou teprve tehdy, když:

- uživatelé a jejich role budou autentizované a autorizované na serveru,
- data budou izolovaná podle workspace hranice,
- produkční chyby nebudou maskované mock daty,
- kritická CRM workflow budou ověřená end-to-end,
- lint, TypeScript a build budou mít pravdivý a opakovatelný výsledek,
- budou existovat testy nebo smoke kontroly pro hlavní pracovní scénáře,
- Operator Console bude působit jako promyšlený pracovní nástroj, ne jako generický AI prototyp,
- každý modul bude mít pravdivý status: production-ready, pilot-ready, in progress nebo demo-only.

## 11. Roadmap reconciliation — 2026-08-10

The original staged roadmap remains valid as historical planning context, but
the implementation was intentionally consolidated where the work formed one
coherent stabilization boundary.

Current status:

- Commits 1–5 (baseline, quality gates, authentication and workspace boundary):
  complete in the existing history.
- Commits 6–9 (Supabase DAL/RLS, CRM data model, mock isolation and critical
  CRM workflows): complete for the verified one-company pilot scope in
  `3a41273 refactor: harden Supabase-backed CRM workflows`.
- `85134de` and `e547349`: repository-hygiene follow-ups only; they are not
  product roadmap stages.
- Commit 10 (React and UX stabilization): partially complete. Targeted data
  state, modal, form and error-state fixes are landed, while lint debt and
  remaining mock-only surfaces are still open.
- Commit 11 (Operator Console redesign): next major product stage, after the
  documentation reconciliation and any selected hardening checkpoint.
- Commits 12–13 (telephony/AI boundaries and release readiness): later stages.

The database-backed stabilization segment is therefore marked pilot-ready, not
universally production-ready. Remaining follow-up items include leaked-password
protection, explicit negative foreign-workspace tests, duplicate policy cleanup,
remaining mock-only surfaces, and database-backed dashboard activity/KPI data.

## 12. Stabilizační pokračování — 2026-08-17

Po předchozím checkpointu byly dokončeny další serverové hranice:

- Product Catalog: serverová DAL a role/workspace validace jsou v `cc19eb4`.
- Audit Log: serverová DAL, serverová atribuce a viditelné chyby jsou v
  `adfcb10`.
- Workflows: pravidla a execution log jsou v serverové DAL/Server Action cestě
  v `034b169`; klientský `workflowService` a lokální execution log byly
  odstraněny.
- Schema/custom object: připravená změna přesouvá čtení a zápis custom objects,
  atributů a EAV recordů do serverové DAL/Server Actions. Built-in schema
  definice zůstávají součástí kontraktu a server je doplňuje workspace
  atributy; UI už nepovažuje prázdný výsledek po chybě za pravdivá data.

Ověřený stav je pilot-ready pro pokryté cesty, nikoli obecně
production-ready. Zůstává otevřené bezpečné odstranění historického
`Playwright Test Product` byl původně chráněn šesti dokončenými objednávkami a
`ON DELETE RESTRICT`. Objednávky byly přes autorizovanou serverovou cestu
přesměrovány na `FlexiJoint Ultra Collagen`, přičemž jejich uložené částky
zůstaly zachované a vznikl auditní záznam. Produkt nyní nemá žádné order
reference a čeká pouze na samostatně potvrzené odstranění.

## 13. Call Trainer — uzavřený session-only pilot

Call Trainer je po schváleném live-turn slice uzavřený jako session-only
tréninkový pilot. Živý průběh neprovádí production CRM zápisy. Dokončená
session se uloží až po `Finish & evaluate` do oddělených tabulek
`training_sessions` a `training_session_turns` a následně je dostupná v
read-only Teamleader Review.

Ověřena byla autentizovaná typed cesta, serverový kanonický scénář podle
`scenarioId`, klientský turn lifecycle, endpointing stav, TTS barge-in
mechanika, explicitní provider fallback, completion persistence, Teamleader
Review, reload a read-only SQL atribuce workspace/operator/turnů. Anonymní
`/training` i `/training/reviews` se přesměrovávají na `/login`; neexistující
authenticated `sessionId` vrací truthful `Training session not found` bez
falešného transcriptu.

První endpointový slice přidal `POST /api/training/turn`. Route Handler má
vlastní autentizační boundary, validní JSON deleguje do stejné
`submitTrainingTurnAction` logiky jako UI a HTTP výsledky mapuje na 400, 401 a
503. Endpoint zůstává session-only: nevytváří CRM `calls`, `orders` ani
průběžné training-session rows.

Druhý endpointový slice přidal `POST /api/training/session` pro completion-only
persistence. Route Handler deleguje do existujícího
`saveTrainingSessionAction`, odvozuje workspace a operátora na serveru a při
úspěchu vrací `201` se `sessionId`; validační chyba je `400`, nedostupnost nebo
databázová chyba `503`. Endpoint nepodporuje průběžné ukládání ani resume po
pádu browseru.

Read-only Teamleader Review API nyní vystavuje `GET /api/training/reviews` pro
workspace-scoped seznam a `GET /api/training/reviews/:sessionId` pro detail s
transcriptem. Oba endpointy používají stejnou Team Leader/Administrator DAL autorizaci jako
UI; vracejí explicitní `401`, `403`, `404` a `503` stavy a nepřidávají žádnou
novou write cestu.

Authenticated browser voice smoke z 2026-08-18 narazil na odmítnuté mikrofonní
oprávnění. UI nyní zobrazuje persistentní inline notice
`Microphone permission was denied. Use the typed reply instead.`, nevytváří
falešný speech transcript ani request a typed fallback zůstává funkční; local
training engine vrátil odpověď a explicitní provider notice. Úspěšný fyzický
`SpeechRecognition` vstup, skutečné TTS audio a barge-in proto zůstávají
nepotvrzeným browser-dependent gate.

Skutečný fyzický mikrofon a reálný browser `SpeechRecognition` audio vstup
nebyly potvrzeny. Web Speech zůstává označeným browser-dependent preview a
pozdější ruční voice/barge-in smoke test je otevřený. Operator role a
cross-workspace runtime proof už ale proběhl přes reverzibilní disposable
fixture bez změny plánu Supabase. Po úklidu zůstal live projekt na jednom
workspace, jedné `administrator` membership a jednom Auth účtu; tento smoke po sobě
nezanechal live testovací data.

Průběžná persistence, resume po pádu browseru, samostatné HTTP/API endpointy,
post-call audio/transcription a AI review funkce zůstávají mimo schválený
rozsah.

## 14. Release-readiness hardening — 2026-08-18

V migraci `20260817235507_profile_and_lead_notes_policy_hardening.sql` byla
zpřesněna role a workspace hranice databázových policies:

- `profiles` už nejsou čitelné všemi authenticated users; SELECT je omezený na
  profily členů workspace sdíleného s aktuálním uživatelem,
- `lead_notes` SELECT/INSERT policies jsou explicitně cílené na
  `authenticated`,
- `anon` nemá table grants pro `lead_notes`,
- RLS zůstává zapnuté na všech kontrolovaných public tabulkách.

Migrace byla aplikována do připojeného Supabase projektu a ověřena read-only
SQL kontrolou policies a grants. Security advisor po změně ponechal pouze
známý externí bod `Leaked Password Protection Disabled`; tento Auth project
setting se nebude obcházet SQL migrací. Pokus o zapnutí v Dashboardu byl
proveden na správném projektu, ale Supabase uložení odmítl s důvodem, že
HaveIBeenPwned ochrana je dostupná až na Pro plánu a vyšším; serverový stav
proto zůstává vypnutý. Vzhledem k tomu, že jde o interní pilot a aktuální
finanční omezení, upgrade Supabase se nyní neplánuje. Warning je vědomě
odložený hardening bod, nikoli důvod blokovat další vývoj; k přehodnocení se
vrátíme před širším nebo veřejným rolloutem.

Regresní browser smoke po migraci ověřil, že anonymní požadavek na
`/training/reviews` skončí na `/login` a chráněný obsah se nezpřístupní bez
session. Následně autentizovaná session otevřela Teamleader Review, zobrazila
workspace-scoped training session s operátorem `majkito.studio`, přežila
navigaci i reload a po návratu načetla Operator Console s leadem, timeline a
profilovou atribucí `by majkito.studio`. V console logu nebyla runtime chyba;
zůstal pouze existující development/accessibility hint pro `autocomplete` na
login inputu.

Audit importů potvrdil, že `aiStreamerBridge` a `sipAdapter` nejsou součástí
runtime flow; oba nepoužívané moduly byly odstraněny v samostatném cleanup
commitu. `audioEngine` a `softphone` zůstávají zachované, protože jsou stále
importované aktuálním Operator Console pilotem. Tato úklidová změna nemění
tvrzení o dostupnosti skutečného telephony providera.

## 15. Training Review RLS hardening — 2026-08-18

Databázová hranice Training Review byla sladěna s již existující Team Leader/Administrator
autorizací v DAL a API:

- Team Leaders/Administrators mohou číst všechny `training_sessions` a
  `training_session_turns` ve workspace;
- operátor může číst pouze vlastní session a turny, aby zůstal funkční vlastní
  session lifecycle bez zpřístupnění týmových review;
- insert/update/delete policies pro vlastní session zůstaly zachované;
- `auth.uid()` byl v training policies obalený přes `(select auth.uid())`;
- redundantní training DELETE policies byly sloučeny;
- performance advisor už nehlásí training RLS init-plan warning ani training
  duplicate permissive policy.

Live SQL aplikace proběhla v jedné transakci a následná read-only kontrola
potvrdila nové policies. První pokus standardního Supabase `apply_migration`
runneru v tomto prostředí selhal na nekonzistentní chybě `relation
public.training_sessions does not exist`, přestože stejný projekt tabulku přes
SQL a `list_tables` vidí. Po úpravě migration souboru na idempotentní replay
runner proběhl úspěšně a read-only kontrola
`supabase_migrations.schema_migrations` nyní potvrzuje remote history pro
`202608180001_training_review_rls_hardening`.

Stejným reconciliation postupem byla doplněna i chybějící remote history pro
lokální `20260810_0009_seed_builtin_deals_schema`; stav Deals zůstal beze změny
(1 custom object a 4 attributes). Migration provenance pro tyto dva dříve
nesladěné soubory je tímto uzavřená.

Security advisor zachovává pouze známý externí warning `Leaked Password
Protection Disabled`. Obecné duplicate permissive policy warnings mimo
Training Review zůstávají mimo tento slice.

## 16. Runtime role boundary and workspace isolation smoke — 2026-08-18

Byl proveden reverzibilní runtime smoke proti připojenému projektu:

- existující autentizovaná testovací membership byla dočasně přepnuta na roli
  `operator`; `/training/reviews` zobrazilo explicitní `Teamleader Review
  unavailable` a Team Leader/Administrator obsah se nezpřístupnil;
- membership byla ihned obnovena na `administrator` a read-only kontrola potvrdila
  původní stav;
- pro cross-workspace test vznikl disposable workspace bez dat a bez
  membership aktuálního uživatele; skutečná serverová schema action s explicitním
  fixture workspace ID vrátila `User is not a member of this workspace`;
- fixture workspace byl smazán a následná kontrola potvrdila nulové rows pro
  workspace, membership, leady, produkty i training sessions;
- následný smoke se samostatnou disposable Auth identitou zobrazil správnou
  `operator` identitu, ponechal `/training` dostupné, odmítl Teamleader Review,
  workspace-scoped lead list vrátil `0` proti jednomu leadu v hlavním
  workspace a přímý `leadId` z hlavního workspace se neaktivoval;
- serverní log potvrdil skutečný `GET /api/training/reviews → 403` pro agenta;
- Auth účet, profil, membership i workspace byly po testu odstraněny a
  read-only SQL kontrola potvrdila návrat na původní baseline.

Boundary je tímto ověřená na reálné druhé Auth session, roli a workspace
authorization path bez Supabase upgrade a bez ponechaných testovacích dat.

## 17. Workspace schema source of truth and terminal-state UX — 2026-08-18

Produkční schema UI už nepoužívá `SchemaEngine` ani `localStorage` jako fallback
nebo autoritativní zdroj:

- schema metadata se načítá přes `listSchemasAction` a workspace-scoped DAL;
- vytvoření vlastního lead pole jde přes `saveAttributeAction` a po uložení se
  načte znovu ze serveru;
- loading, unavailable a save error jsou v Leads, Filter Engine a Customer
  Panelu viditelné stavy;
- lokální uložené pohledy a aktivní blueprint zůstávají pouze uživatelskými
  preferencemi a nejsou vydávány za schema persistence.

V Operator Console byl uzavřen terminální stav hovoru: dokončení hovoru zruší
order-unlocked modal/context, odstraní stale pitch a nenechá staré oznámení
vypadat jako aktivní call step. Post-call summary nyní rozlišuje `Automation
completed`, `Automation failed`, `Automation skipped` a `No automation
triggered` místo nejednoznačného `0 succeeded`.

## 18. Schema metadata RLS policy hardening — 2026-08-18

`custom_objects` a `attribute_definitions` měly překrývající se permissive
SELECT policies: Team Leader/Administrator `ALL` policy a samostatnou workspace-member
SELECT policy. Migration
`supabase/migrations/20260818183147_schema_policy_hardening.sql` nyní:

- ponechává jediný SELECT path pro authenticated workspace members;
- rozděluje Team Leader/Administrator mutace na explicitní INSERT, UPDATE a DELETE
  policies;
- zachovává workspace ownership a vazbu atributu na objekt ve stejném
  workspace;
- zachovává `UPDATE` dvojici `USING` + `WITH CHECK`;
- nemění grants: `authenticated` má CRUD, `anon` nemá přístup.

Migration runner ji aplikoval do live projektu a remote history ji eviduje pod
`20260818183234 / 20260818183147_schema_policy_hardening`. Performance advisor
už nehlásí duplicate permissive policy pro `custom_objects` ani
`attribute_definitions`; zbývající warnings patří ostatním tabulkám mimo tento
slice.

RLS smoke přes skutečný `authenticated` Postgres role path potvrdil:

- Team Leader může schema metadata číst a INSERT policy projde;
- Operator může vlastní workspace schema číst, ale schema mutation skončí
  `new row violates row-level security policy`;
- workspace bez membership vrací pro stejného uživatele nula řádků;
- disposable workspaces, membership, custom objects a attributes byly po testu
  odstraněny a primary Administrator membership zůstala zachována.
### Role a oprávnění

Countdown rozlišuje lidské workspace role a AI terminologii:

| Produktová role | Databázový klíč | Oprávnění |
|---|---|---|
| Operator | operator | Přístup k Operator Console a AI Training. Nemá lead directory, ruční lead CRUD, Team Leader Review, auditní čtení ani administraci workspace. |
| Team Leader | team_leader | Všechna oprávnění Operatora plus lead directory a lead CRUD, produktový katalog, objection cards, workflows, schema metadata, audit log a Team Leader Review. |
| Administrator | administrator | Všechna oprávnění Team Leadera plus správa workspace členů, změna rolí a workspace/organizace nastavení. |

Agent není lidská role. Používá se pouze pro AI/call-trainer terminologii,
například AI agent nebo agentic workflow. Historické názvy databázových sloupců
agent_id zůstávají kvůli kompatibilitě datového modelu, ale UI a dokumentace
pro lidské uživatele používají výhradně označení Operator.

Lead management je záměrně oddělený od Operator Console. Operator nesmí číst
seznam leadů ani vytvářet, upravovat nebo mazat leady. Operator Console nyní
pracuje přes serverem řízený queue assignment a zobrazí nejvýše jeden aktuální
kontakt. Pokud žádný callable kontakt není k dispozici, zobrazí pravdivý stav
čekání místo workspace lead directory. Napojení na skutečný telephony nebo
inbound provider zůstává samostatný integrační scope.

## Implementovaný assignment slice — 2026-08-19

Schválený assignment model je nyní implementovaný v databázi, serverové datové
vrstvě a Operator Console. Queue, assignment, presence, lease/heartbeat,
recovery, callback preference, auditní eventy a Team Leader override operace
jsou napojené na workspace authorization. Izolovaný autentizovaný browser
smoke s více disposable Operátory je ověřený; zbývá detailnější callback
scheduler a případný externí telephony/inbound provider.

### Oddělení CRM adresáře a pracovní fronty

- **Lead Directory** je úplná CRM databáze leadů. Přístup mají pouze Team
  Leaders a Administrators.
- **Available Pool** je interní systémová fronta. Operator ji nikdy
  neprochází ani si z ní lead nevybírá.
- **My Work** je pracovní scope konkrétního Operatora. Nezobrazuje seznam
  leadů; server Operatorovi poskytne pouze aktuální pracovní kontakt a
  případný stav plánovaného callbacku.
- **Current Lead** je maximálně jeden lead ve stavu `in_progress` na
  Operatora.
- **Routing Engine** atomicky rozhoduje, který lead dostane Operator jako
  další.

Základní databázová pravidla budou vynucená mimo UI:

- jeden lead může mít maximálně jeden aktivní assignment,
- jeden Operator může mít maximálně jeden aktuální lead,
- claim dalšího leadu bude transakční a konkurentně bezpečný,
- historická přiřazení se nemažou.

### Assignment a outcome lifecycle

Lead jako CRM záznam a stav ve frontě budou oddělené. CRM status například
`qualified`, `customer` nebo `closed_lost` nebude nahrazovat provozní queue
state `available`, `assigned`, `in_progress`, `waiting_callback` nebo
`closed`.

- **Order:** zapíše call a order, lead přejde na `customer`, aktuální
  assignment se uzavře a routing přidělí další kontakt.
- **No Answer / Call Later:** aktuální assignment se uvolní a lead dostane
  retry termín; před jeho uplynutím se nevrací do Available Pool.
- **Schedule Callback:** vznikne plánovaný callback. Původní Operator je
  pouze preferovaný, nikoli trvalý vlastník.
- **Fail / Not Interested:** v aktuálním CRM status modelu lead přejde do
  `unresponsive` a automaticky se nevrací do fronty. Reopen provádí explicitně
  Team Leader nebo Administrator. Samostatný status `closed_lost` zůstává
  budoucí rozšíření CRM lifecycle, nikoli předstíraný aktuální stav.

### Callback affinity a dostupnost

Callback se preferenčně vrátí původnímu Operatorovi pouze tehdy, když je ve
stavu `available` a nemá aktivní assignment. Pokud je offline, na pauze nebo
v hovoru, callback dostane jiný dostupný Operator. Pokud není dostupný nikdo,
callback zůstane v routing procesu do dalšího cyklu.

Splatné callbacky mají v routing claimu vždy přednost před běžnými leady,
nezávisle na jejich běžné hodnotě `priority`. Preference původního Operátora
se vyhodnocuje až jako tie-breaker mezi routovatelnými položkami. Callback
nepřeruší probíhající hovor; při návratu Operátora do `available` nebo při
novém claimu se vezme první splatný callback. Pokud není dostupný nikdo,
callback zůstává ve stavu `waiting_callback` a neprovádí se žádný umělý
reschedule.

Assignment bude obsahovat lease/heartbeat ochranu proti pádu browseru nebo
odpojení. Po skončení ochranné lhůty se neaktivní assignment bezpečně uvolní,
aby lead nezůstal trvale zamčený u neaktivního Operatora.

### URL a oprávnění

Kanonická URL pro lead bude `/leads/[leadId]`; `/leads` zůstává Team
Leader/Administrator Lead Directory. Otevření detailové URL samo o sobě
nezahájí hovor ani nepřidělí lead.

- Team Leader/Administrator mohou přes detail zobrazit lead podle své role.
- Operator může zobrazit pouze serverem povolený detail svého aktuálního
  assignmentu nebo platného pracovního callbacku.
- Přímé UUID ani URL Operatorovi neposkytne cizí lead a nebude fungovat jako
  permission bypass.
- Start hovoru bude samostatná serverová operace, která ověří aktuální
  `assignment_id`, vlastníka, stav assignmentu, kapacitu Operatora a lease.

Team Leader akce `View`, `Reassign`, `Release` a `Reopen` jsou oddělené,
serverově autorizované a auditované přes queue eventy. `Reassign` přesune lead
konkrétnímu Operatorovi; `Release` ho vrátí do Available Pool.

### Zbývající implementační scope

Implementovaný slice obsahuje `lead_queue_items`, historii assignmentů a
queue událostí, routing engine, atomický claim, aktuální Operator Console
context, presence/capacity, callback scheduling, lease/heartbeat/recovery,
Team Leader override a context-aware `/leads/[leadId]` route.

Completion call path nyní vyžaduje aktuální `assignment_id`, takže Operator
nemůže dokončit call nad leadem, který mu právě nepřísluší.

Browser smoke s více Operátory, konkurenční claim test a prioritní callback
claim jsou ověřené. Pro schválený MVP model není potřeba samostatný timer
scheduler: callback se routuje při claimu dostupného Operátora, po reloadu,
po dokončení outcome nebo při návratu z pauzy. Zbývá případná integrace
telephony/inbound providera.

Serverní část tohoto routing gate byla následně ověřena 2026-08-19 rollback-safe
SQL smoke testem: dva souběžné claimy rozdělily dvě dostupné položky mezi dva
Operator identity a callback se při `break` preferovaného Operátora přidělil
druhému dostupnému Operátorovi. Navazující browser smoke ve dvou skutečně
oddělených Playwright sessions ověřil přihlášení, claim různých leadů, reload a
stejný callback fallback přes Operator Console. Všechny disposable Auth,
membership, profile, presence, lead, queue a event fixture řádky byly po testu
odstraněny.

## Telephony boundary hardening — 2026-08-19

Schválený provider-neutral telephony slice je dokončený. Lokální softphone už
není zdrojem falešného nebo opožděného call stavu:

- [x] `WebRtcSoftphoneController` ruší delayed dialing timers při cancelu,
  audio failure i ukončení session; starý timer nemůže přepnout nový call do
  `connected`.
- [x] Selhání microphone/WebAudio inicializace vrací softphone do `idle` a
  nepředstírá aktivní audio session.
- [x] `TelephonyAudioEngine` uvolňuje media stream, AudioContext a WebAudio
  nodes po ukončení nebo neúspěšném startu; callback subscribers zůstávají
  znovu použitelné pro další call.
- [x] Operator Console rozlišuje `Starting Call`, `Cancel Dial` a `End Call`.
  Zrušení dialingu používá serverový abort/requeue a nevytváří CRM call.
- [x] Start request je lokálně serializovaný proti dvojkliku a completion je
  chráněný proti souběžnému dvojímu odeslání.
- [x] Při chybě serverového completion zůstává chyba viditelná a lokální call
  se ukončí až po úspěšném serverovém zápisu; outcome lze bezpečně opakovat.
- [x] Browser smoke ověřil start/reload/cancel bez nového callu; SQL recheck
  potvrdil nezměněný počet callů, `available` queue state a žádného vlastníka.
- [x] Vitest regresní testy pokrývají audio failure, cancel dial a ochranu
  před resetem nové session starým ended timerem.

Tento slice nemění Supabase schema ani vzdálené RPC. Zůstává záměrně
simulátor/provider-neutral: skutečný telephony/inbound provider, webhooky,
audio upload, transcription a AI analýza produkčního hovoru jsou samostatná
integrační fáze.

## Operator Console first — redesign direction — 2026-08-19

Po uzavření queue, assignmentu, callback routingu a autentizovaného browser
smoke se mění produktová priorita další etapy: **Operator Console je primární
pracovní plocha produktu**. Její pracovní model, stavy a informační hierarchie
budou určovat další operator-facing obrazovky.

První vizuální audit skutečného autentizovaného běhu zachytil Dashboard a
Operator Console do `output/operator-console-redesign-audit-2026-08-19/`.
Designový základ je konzistentní a použitelný, ale důležité, podpůrné,
unavailable a historické informace často dostávají podobnou vizuální váhu.
To platí pro Dashboard i pro Console.

Další redesign proto nebude plošné překreslení. Zaměří se na priority P0/P1
(aktuální stav a nejbližší akce), P2 (rozhodovací kontext) a P3 (historie a
sekundární podpora). Operator Console redesign je další hlavní produktová
etapa; externí telephony/inbound integrace zůstává pozdější samostatný scope.

Podrobný návrhový brief a akceptační kritéria jsou v
`docs/OPERATOR_CONSOLE_REDESIGN_BRIEF_2026-08-19.md`.

## Product Scripts — implementace a hlavní browser smoke uzavřeny — 2026-08-22

Základní slice pro workspace-scoped Product Scripts je dokončený v commitech
`e4c0947` a `fb68f68`; verzování, publish a archivace jsou v `baabfc3`.

- [x] Administrator-only `/settings/scripts` načítá produkty a uložené skripty
  přes serverový DAL; Team Leader/Operator nemají editor ani save oprávnění.
- [x] Server Actions znovu ověřují přihlášení, workspace membership a roli;
  workspace a product vazba se kontroluje na serveru před upsertem.
- [x] `public.product_scripts` má unique `(workspace_id, product_id)`, RLS,
  authenticated grants, workspace member SELECT a Administrator-only
  INSERT/UPDATE policies s `updated_by = auth.uid()` a stejným workspace
  produktem.
- [x] HTML se čistí na clientu i serveru na omezenou allowlist struktury a
  textových značek; executable tags, event attributes, odkazy, styly a zdroje
  se neukládají. Operator Console při DB chybě nezobrazuje uložený obsah jako
  fallback; fallback se zobrazí jen při explicitním `not_found`.
- [x] Operator Console zobrazuje uložený continuous script, případně zřetelně
  označený vestavěný pilot fallback. Pilot suggestion je oddělený od schváleného
  uloženého textu; osobní highlights a view preferences jsou session-only.
- [x] Přidán index `product_scripts.updated_by`; vzdálený Supabase migration
  history obsahuje `product_scripts_updated_by_index` ve verzi
  `20260822023345`. Lokální migration soubor má timestamp
  `20260822023213`; objekt a SQL byly ověřeny proti vzdálenému projektu.
- [x] Historické lokální důkazy pro základní Product Script slice: `npm test -- --run`
  = 22/22, lint, typecheck, production build a `git diff --check` prošly. Tento
  bod nepředstavuje aktuální gate pro čistou instalaci.
- [x] Read-only SQL ověření: `product_scripts` má RLS enabled, tři očekávané
  policies, workspace/product/updated_by indexy; databáze má nyní 0 skriptů,
  3 produkty, 1 workspace a 3 membership řádky, bez vytvořených fixture dat.
- [x] Unauthenticated browser smoke `/settings/scripts` skončil na `/login`.
- [x] Authenticated Administrator browser smoke provedl draft v1 → publish,
  následně v2 s jedinečným smoke markerem → publish; po reloadu administrace
  zůstala v2 Published, v1 byla Archived a Operator Console po reloadu zobrazil
  v2 marker. Po testu byly odstraněny přesně vytvořené řádky a SQL baseline se
  vrátil na 0 skriptů i 0 verzí.
- [x] Authenticated Postgres RLS simulation s Operator membership provedla
  read fixture, odmítnutý INSERT (`42501`) a UPDATE s 0 ovlivněnými řádky;
  fixture byl následně odstraněn.

Verzovací vrstva používá tabulku `product_script_versions`, draft, publish a
archive RPC. Remote Supabase i lokální migration files evidují stejné verze
`20260822114853`, `20260822115016` a `20260822120928`; `archived` je sjednocený
v SQL, typech, DAL a UI. Remote tabulka je po cleanupu bez fixture řádků.

Implementační slice je uzavřený commitem `baabfc3` a hlavní runtime workflow je
ověřený. Zbývá pouze samostatný browser role smoke; současný workspace má
Administrator + 2 Operators a nemá Team Leader membership.

Zbývá už jen omezený browser-role důkaz, nikoli implementační nebo databázový
blocker:

- [ ] Otevřít Operator/Team Leader UI relaci a ověřit read-only obrazovku.
  Aktuální workspace má pouze Administrator + 2 Operators, bez Team Leader
  membership. Po dokončení Administrator smoke byl browser profilovým
  controlem odhlášen a relace je znovu na `/login`; UI role smoke proto nebyl
  vydáván za provedený. Cross-workspace hranice je pokryta serverovým
  workspace membership guardem, product workspace checkem a RLS.

Globální release body zůstávají beze změny: Supabase Auth Leaked Password
Protection je stále project setting mimo tento slice a skutečný telephony/
inbound provider není jeho součástí.
