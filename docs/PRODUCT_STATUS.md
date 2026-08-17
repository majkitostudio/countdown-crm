# Countdown CRM — Product Status & Refactoring Baseline

**Datum baseline:** 2026-08-09  
**Status:** stabilizační a auditní fáze  
**Produktový cíl:** Attio-grade CRM pro call-centra s AI copilotem, telephony workflow a bezpečným interním provozem

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
- role agent, manager a admin zůstanou součástí návrhu,
- izolace dat bude řešena na databázové a serverové vrstvě, ne pouze v UI.

### Demo režim

Demo režim zůstane zachován pro lokální vývoj, prezentace a bezpečné sandbox testování. Nesmí však:

- implicitně obcházet přihlášení,
- být aktivní v produkčním prostředí,
- zaměňovat mock data za skutečná CRM data,
- maskovat databázové nebo integrační chyby.

Demo režim musí být explicitně zapnutý environment konfigurací a viditelně oddělený od produkčního režimu.

### Produktová priorita

Primární cíl další fáze je bezpečný interní pilot. Současně nebudeme dělat architektonická rozhodnutí, která by později znemožnila vznik multi-tenant platformy ve stylu Attio.

### Design

Současný vizuální směr má použitelný základ a nebude plošně zahazován. Je ale nutné provést produktovou revizi míst, která působí genericky nebo jako AI-generated UI. Nejvyšší prioritu má Operator Console, protože je to hlavní pracovní plocha operátora a nejsilnější reprezentace produktu.

## 3. Aktuální technický stav

### Základní stack

- Next.js 16.2.12, App Router, Turbopack
- React 19.2.4
- TypeScript 5
- Tailwind CSS 4
- Supabase PostgreSQL, Auth a SSR klient
- Google Gemini přes `@google/genai`
- Web Speech API, Web Audio API a prototypová telephony vrstva

### Aktuální Git baseline

Dokument vychází z commitovaného HEAD:

```text
42ed707 docs: record Commit 51 in commits log
1039ddf refactor: eliminate all any types, fix React hook purity, and achieve strict build compliance
b6edcac chore: migrate middleware to proxy for Next.js 16 and optimize eslint config
```

V pracovním stromu existují samostatné necommitované bezpečnostní úpravy z počátečního refactoringového průchodu. Tyto změny nejsou součástí tohoto dokumentačního commitu a budou posouzeny jako samostatný schválený krok.

### Ověřovací baseline

Na aktuálním pracovním stavu platí:

- TypeScript (`npx tsc --noEmit`) prochází,
- produkční build (`npm run build`) prochází,
- striktní ESLint aktuálně odhaluje 29 chyb a 116 varování,
- v repozitáři není dostatečná automatizovaná testovací sada pro kritická CRM workflow,
- dependency audit dříve odhalil závažné zranitelnosti v produkčních závislostech, které musí být znovu ověřeny v rámci release přípravy.

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
- omezené role `admin`, `manager`, `agent`,
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
- role boundary pro manager/admin operace.

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

### P1/P2 — demo a mock prolínání

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

### Commit 8 — Demo/mock izolace

- oddělit sandbox data od produkčního toku,
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
