# Countdown CRM — Project Polish Checkpoint

**Datum auditu:** 26. 8. 2026
**Auditní větev:** `audit/project-polish-checkpoint-20260826`
**Ověřený baseline:** `origin/main` = `0b46874b7fa4121de2f2ae35f8c372b8b4333531`
**Rozsah:** read-only audit aplikačního shellu, 23 rout, API rout, Server Actions, DAL/RPC, auth/workspace hranic, Workflow/Blueprint/Operator Console/Orders/Product Scripts/Training, testů, konfigurace a dokumentace.

## Výsledek v jedné větě

Repozitář je po PR #13 čistý a workspace/role hranice jsou v kódu a SQL výrazně pevnější, ale projekt nelze označit za pilot-ready: Workflow a Blueprint runtime mohou vykazovat úspěch bez odpovídajícího durable efektu a chybí čerstvý důkaz přihlášeného workflow, persistence po reloadu, negativních rolí/workspace a RLS.

Tento dokument je checkpoint a prioritizovaný backlog. Runtime ani databáze se v tomto auditu neměnily.

## Důkazní hranice

| Vrstva | Výsledek tohoto auditu | Co z toho nelze tvrdit |
|---|---|---|
| Git/repozitář | `HEAD` i `origin/main` byly před auditem `0b46874`; po fetchi divergence `0/0`; audit běží na pojmenované větvi | že live deploy nebo live DB odpovídá checkoutu |
| Statická analýza | zdokumentované nálezy v TS/TSX, SQL a docs; 23 page rout, 4 training API routy, 7 testovacích souborů | že každá větev funguje v přihlášeném browseru |
| Unit/API testy | v repu je přibližně 37 test cases v 7 souborech; pokryté jsou hlavně headers, settings, script sanitizace, softphone lifecycle, outcome UI a training API | že jsou ověřené WorkflowEngine, Blueprints, leadQueue, call/order lifecycle nebo RLS |
| Browser | v tomto read-only průchodu nebyla použita přihlášená relace | žádný authenticated smoke, logout/login, reload ani cross-workspace důkaz |
| Persistence | statické čtení ukazuje Server Actions/DAL/RPC hranice | že zápis přežije reload nebo že partial failure nezanechá nekonzistentní stav |
| Authorization/RLS | kód a migrace obsahují workspace membership, role guardy, invoker RPC a hardened queue recovery | že negativní role/workspace a RLS test skutečně proběhl proti live Supabase |

## Inventář rout a hlavních hranic

Všechny routy níže byly nalezeny jako současné `page.tsx` soubory. Přístup je obecně chráněn `src/proxy.ts`; `/login` je veřejná routa. API routy jsou proxy výjimkou, ale training handlers samy volají autentizační kontrolu.

| Routa | Hlavní odpovědnost | Důkazní stav |
|---|---|---|
| `/` | dashboard/AppShell, workspace-scoped přehled | statická hranice; browser neověřen |
| `/analytics` | workspace revenue/call analytics, CSV export | Server Action čte workspace; role guard chybí, viz P1 |
| `/audit` | audit log pro vedoucí/adminy | DAL vyžaduje `team_leader`/`administrator` |
| `/calendar` | callback/operator kalendář | DAL a queue hranice staticky přítomné |
| `/calls` | workspace call log | statická hranice; persistence neověřena |
| `/leads` | lead management | DAL vyžaduje vedoucí/admin roli |
| `/leads/[leadId]` | detail leadu, notes, call/order kontext | serverové načtení a workspace scope; browser neověřen |
| `/login` | Supabase login | veřejná routa; skutečný Auth login neověřen |
| `/monitor` | supervisor monitoring | explicitně `Unavailable`, live stream není implementovaný |
| `/objects/[slug]` | dynamické workspace objekty/EAV | schema DAL; role a účel podle operace |
| `/orders` | objednávkový přehled | workspace-scoped čtení staticky přítomné |
| `/orders/[orderId]` | detail objednávky | workspace/detail DAL; browser neověřen |
| `/orders/[orderId]/edit` | řízená editace detailu | role/RPC hranice staticky přítomné |
| `/orders/new` | vytvoření objednávky | operator/current-lead a RPC cesta staticky přítomné |
| `/products` | produkty a produktová data | mutace přes role-guarded DAL |
| `/settings` | workspace schema a preference | serverové schema mutace role-guarded; preference lokální |
| `/settings/scripts` | Product Scripts | DAL mutace vyžaduje administratora |
| `/team` | členové a role workspace | membership DAL role-guarded |
| `/training` | training simulator/session | explicitní simulace; session API má auth testy |
| `/training/reviews` | review sessions | manager/admin hranice v DAL |
| `/training/reviews/[sessionId]` | detail review | manager/admin hranice v DAL/API |
| `/workflows` | pravidla a execution log | manager/admin DAL; manual test event v UI |
| `/workspace` | Operator Console, lead claim/call/outcome/order | queue completion je server-owned, workflow dispatch chybí |

### Server/data mapa

- `src/proxy.ts` obnovuje Supabase cookie session a chrání neveřejné routy.
- `src/lib/auth/server.ts` používá `supabase.auth.getUser()`; demo auth je explicitní lokální výjimka přes `NODE_ENV` a `NEXT_PUBLIC_ALLOW_DEMO_AUTH`.
- `src/lib/dal/workspace.ts` řeší membership a `requireWorkspaceRole`; většina kritických akcí do DAL deleguje.
- Queue a call completion používají serverové RPC/guardy v `src/lib/dal/leadQueue.ts`, `src/lib/dal/calls.ts` a `supabase/migrations/20260811235808_atomic_call_completion.sql` / recovery migraci.
- Orders, Product Scripts, Training Reviews, schema a workflows mají role-guarded DAL; statická existence guardu není live RLS/role důkaz.
- WorkflowEngine je singleton v `src/lib/workflows/engine.ts`; BlueprintEngine je browser-oriented orchestrace v `src/lib/blueprints/engine.ts`.

## Prioritizované nálezy

### P0 — WorkflowEngine zapisuje simulaci jako úspěšné provedení

- **Soubor/symbol:** `src/lib/workflows/engine.ts:184-235` (`executeActions`), `:278-281` (`createLogEntry`).
- **Ověřený symptom:** `compute_ai_summary`, `send_email_followup`, `update_lead_status` a `notify_manager` pouze logují do konzole a přidají název do `executedActions`. Webhook přidá `send_webhook` i po zachycené chybě `fetch`, a také bez URL. Execution log se do Supabase posílá fire-and-forget a chyba persistence se jen varuje.
- **Dopad:** UI i durable execution log mohou tvrdit „success“/„executed“, ačkoli nevznikl AI summary, e-mail, změna statusu ani notifikace; webhook může být označen jako provedený po síťové chybě.
- **Typ:** potvrzený fakt ze zdrojového kódu; live reprodukce nebyla potřeba ani provedena.
- **Nejmenší slice:** zavést explicitní výsledek `simulation`/`unavailable`/`success`/`failure`, pro každý action type; webhook musí kontrolovat HTTP/fetch výsledek; persistence execution logu musí být awaitovaná nebo musí vracet explicitní persistence failure.
- **Acceptance evidence:** unit testy pro všech pět action typů, neúspěšný webhook a selhání uložení logu; žádný zelený success s `executedActions`, pokud nebyl proveden durable efekt; UI labely rozlišují simulation/unavailable.

### P0 — Blueprint apply hlásí aktivaci před dokončením durable workspace zápisu

- **Soubor/symbol:** `src/lib/blueprints/engine.ts:65-107` (`applyBlueprint`), `src/components/blueprints/BlueprintPickerModal.tsx:55-75`.
- **Ověřený symptom:** aktivní blueprint se nejprve uloží do browser `localStorage`; atributy se zapisují paralelně přes `Promise.all`; workflow rules se přidávají přes `workflowEngine.addRule`, jehož Supabase save je fire-and-forget. Po tom metoda bez další verifikace vrátí `success: true` a modal zobrazí „úspěšně aktivována“.
- **Dopad:** při chybě může zůstat lokálně aktivní blueprint, částečně uložené EAV atributy nebo neuložená pravidla, zatímco uživatel vidí úspěch. `localStorage` navíc není workspace-scoped zdroj pravdy.
- **Typ:** potvrzený fakt ze zdrojového kódu; konkrétní partial failure je hypotéza k reprodukci v test doubles, protože live zápis nebyl proveden.
- **Nejmenší slice:** server-authoritative workspace-scoped apply command s transakčním/idempotentním výsledkem; lokální stav aktualizovat až po úspěchu všech částí a explicitně vracet retryable failure.
- **Acceptance evidence:** test selhání atributu i workflow save, žádná falešná success zpráva, reload/nová session se stejným workspace stavem, opakovaný apply nevytvoří duplicity.

### P1 — Primární Operator Console cesta neemitovala workflow event

- **Soubor/symbol:** `src/app/workspace/page.tsx:248-290` versus `:293-342`; `src/app/workflows/page.tsx:154-173`.
- **Ověřený symptom:** operator větev dokončení volá `completeLeadCallAction`, nastaví `workflowEntries` na prázdné pole a vrací se; obecná ne-operator větev teprve volá `workflowEngine.emit("on_call_ended", ...)`. V celém `src` jsou produkční emit call sites pouze tato obecná větev a ruční tlačítko `Test: Emit Call Ended` s hardcoded demo payloadem.
- **Dopad:** pravidla navázaná na dokončení hovoru se v hlavní queue workflow nemusí spustit, a ruční test může vytvořit dojem produkční integrace.
- **Typ:** potvrzený fakt o současném call graphu; přesný live dopad pravidel je hypotéza k reprodukci, protože browser/DB workflow smoke nebyl proveden.
- **Nejmenší slice:** zavést jeden server-owned dispatcher po úspěšném operator call completion a napojit podporované trigger events; manual test jasně označit jako test-only.
- **Acceptance evidence:** unit/integration test operator completion → event → execution record; test `on_order_placed`, `on_lead_status_changed`, `on_lead_created`; žádný demo payload v cestě vnímané jako produkční; výsledky přežijí reload.

### P1 — Analytics Server Action postrádá deklarovaný role guard

- **Soubor/symbol:** `src/lib/analytics.ts:178-226` (`getAnalyticsData`), `src/app/actions/analytics.ts:6-8`, `src/app/analytics/page.tsx:53-64`.
- **Ověřený symptom:** funkce dokumentovaná jako „Team Leader analytics“ volá pouze `requireWorkspaceContext()`, načte všechny workspace orders/calls/profiles a nemá `requireWorkspaceRole(["team_leader", "administrator"])`. UI stránka také nemá vlastní role gate.
- **Dopad:** pokud route/Server Action zavolá autentizovaný operator, může dostat týmové revenue, call a operator leaderboard metriky určené pro vedoucí. Skrytí položky v navigaci by nebyla dostatečná ochrana.
- **Typ:** potvrzený statický authorization gap vůči deklarovanému účelu; přesná live exploitace nebyla provedena.
- **Nejmenší slice:** přidat server-side role guard a regresní test 401/403/allowed role; současně projít export action, aby sdílela stejnou hranici.
- **Acceptance evidence:** negativní operator test, cross-workspace test, pozitivní Team Leader/Admin test, žádné analytics/CSV data v odpovědi pro nepovolenou roli.

### P1 — Business mutace může být úspěšná, ale klient dostane chybu kvůli auditu

- **Soubor/symbol:** `src/lib/dal/leads.ts:198-246` (`updateLeadStatusForWorkspace`); `src/lib/dal/orders.ts:243-299` (`reassignOrdersProductForWorkspace`).
- **Ověřený symptom:** lead status nebo product_id orders se zapisuje před následným insert/update auditní stopy. Lead větev při chybě auditu explicitně vyhodí „status changed but audit event was not saved“; order větev nechá chybu z `createAuditLogForWorkspace` projít ven po změně objednávek.
- **Dopad:** UI může zobrazit failure/retry, i když business data už změněná jsou; retry může vést k duplicitě, zmatku a nesouladu mezi daty a auditem.
- **Typ:** potvrzený fakt o pořadí operací; injected audit failure a následný retry jsou hypotéza k reprodukci.
- **Nejmenší slice:** transakční RPC pro business data + audit, nebo explicitní idempotentní recovery kontrakt; sjednotit chybu a klientský stav.
- **Acceptance evidence:** test audit insert failure, atomický rollback nebo pravdivě reportovaný partial result, retry/idempotency test a ověření auditní stopy.

### P1 — Aktuální `supabase/schema.sql` je neúplný a obsahuje starší permissive policy snapshot

- **Soubor/symbol:** `supabase/schema.sql:197-339` a `:414-497`; aktuální migration set obsahuje mimo jiné `order_items`, order history, Product Script versions a recovery migraci.
- **Ověřený symptom:** snapshot neobsahuje novější tabulky nalezené v migration historii a starší policy blok používá obecné `auth.role() = 'authenticated'`/`FOR ALL` pro několik business tabulek. Repo zároveň obsahuje 51 migration souborů.
- **Dopad:** pokud někdo použije `schema.sql` jako fresh provisioning nebo bezpečnostní referenci, může vytvořit neúplné schéma a širší autorizaci než současný DAL/migration design.
- **Typ:** potvrzený rozdíl mezi trackovaným artefaktem a současným repo SQL; zda je `schema.sql` aktivně používaný provisioningem, je hypotéza — v běžných README/scripts nebyl nalezen aktivní apply command.
- **Nejmenší slice:** rozhodnout a zdokumentovat jediný source-of-truth; pokud má snapshot zůstat, označit ho jako historický nebo ho bezpečně regenerovat v samostatném schema tasku. Tento audit migrace neaplikoval ani nereconcilioval.
- **Acceptance evidence:** fresh database/schema check proti schválenému source-of-truth, policy diff, explicitní zákaz použití stale snapshotu v CI/docs.

### P2 — Testovací mapa nepokrývá nejrizikovější datové a autorizační cesty

- **Soubor/symbol:** `tests/` obsahuje 7 souborů a přibližně 37 test cases; chybí cílené testy pro `src/lib/workflows/engine.ts`, `src/lib/blueprints/engine.ts`, `src/lib/dal/leadQueue.ts`, call/order lifecycle, analytics role guard a RLS.
- **Ověřený symptom:** existují testy UI/header/settings/script/training API/softphone, ale ne testy výše uvedených kritických hranic.
- **Dopad:** nejdůležitější false-success, race, partial-failure a negative-access regresní scénáře mohou projít review bez automatické ochrany.
- **Typ:** potvrzený fakt o současném test inventory; neznamená, že neexistuje žádný externí/manual smoke.
- **Nejmenší slice:** test matrix navázaná na primární workflow fix, začít WorkflowEngine + operator dispatch + failure persistence; poté queue/order negative tests a live RLS harness.
- **Acceptance evidence:** oddělené unit/integration/browser/persistence/authorization/RLS výsledky, ne pouze zelený build.

### P2 — Potvrzený nepoužitý parametr a pravděpodobně legacy training path

- **Soubor/symbol:** `src/lib/training.ts:113-117`, `generateAICustomerResponse`.
- **Ověřený symptom:** TypeScript no-unused kontrola označuje parametr `chatHistory` jako nepoužitý; tělo funkce používá jen scenario a userMessage. Aktuální UI/API používá `generateTrainingResponseAction` v `src/app/actions/training.ts`, nikoli tuto funkci.
- **Dopad:** dvojí training response path zvyšuje riziko opravy nesprávné implementace a zamlžuje, která simulace je kanonická.
- **Typ:** potvrzený nepoužitý parametr; funkce/export je potvrzeně bez consumeru v nalezeném `src/tests` graphu, ale odstranění samo není součástí tohoto docs tasku.
- **Nejmenší slice:** ověřit veřejné importy mimo repo, pak legacy funkci odstranit nebo sjednotit s kanonickou action cestou v samostatném training tasku.
- **Acceptance evidence:** `noUnusedParameters` bez tohoto nálezu, grep/import graph, training API/UI testy a zachované explicitní `Simulation` označení.

### P2 — Největší a nejvíce propojené soubory zvyšují riziko změn

- **Ověřené hotspots:** `src/lib/supabase/types.ts` (~1130 řádků), `src/app/training/page.tsx` (~1109), `src/app/workspace/page.tsx` (~867), `RuleBuilderModal.tsx` (~568), `workflows/page.tsx` (~499), `ProductScriptManager.tsx` (~498), `OrderCreateForm.tsx` (~487), `ProductOrderPanel.tsx` (~432), `src/lib/dal/schema.ts` (~400), `src/lib/dal/activity.ts` (~377), `src/lib/dal/leadQueue.ts` (~365).
- **Ověřený symptom:** UI orchestrace, async persistence a domain decisions jsou ve velkých souborech s mnoha importy; není to samo o sobě dead code.
- **Dopad:** větší blast radius a horší izolace testů, zejména u workspace/call/order změn.
- **Typ:** potvrzený udržovatelnostní fakt, nikoli automaticky bug.
- **Nejmenší slice:** po uzavření P0/P1 rozdělit pouze nejbližší soubor kolem konkrétního workflow, s testem před/po; neprovádět široký refaktor.
- **Acceptance evidence:** menší odpovědnosti, žádná změna veřejných auth/data kontraktů, zachované plné gates.

### P2 — Dokumentační dluh a stale historical claims

- **Soubor/symbol:** `docs/architecture.md` označuje původní architekturu jako historickou, ale dále popisuje odstraněné cesty jako live modul; `docs/AKTUALNI_STAV_A_DESATERO.md` před tímto checkpointem uváděl snapshot `158e650`, Next `16.2.12`, 44 migrací a staré test výsledky.
- **Ověřený symptom:** dokumentace míchá vizi, historický audit a současný stav; starý handoff doporučoval migration reconciliation jako první práci, ačkoli to není zdroj pravdy tohoto polish auditu.
- **Dopad:** další implementace může vycházet ze špatného baseline nebo tvrdit hotové integrace, které runtime pouze simuluje.
- **Typ:** potvrzený dokumentační fakt; `architecture.md` není tímto úkolem měněn, aby zůstal diff omezený na schválené dva dokumenty.
- **Nejmenší slice:** samostatný docs cleanup po stabilizaci, se source-of-truth mapou a datem ověření.
- **Acceptance evidence:** každý současný claim má odkaz na kód/test/browser/SQL vrstvu a historical sections jsou viditelně označené.

### P3 — CSV export neescapuje vnitřní uvozovky

- **Soubor/symbol:** `src/lib/analyticsExport.ts:14-17`.
- **Ověřený symptom:** `agentName` se vloží do uvozovek, ale vnitřní `"` se nenahradí `""`; jméno s uvozovkou může rozbít CSV řádek.
- **Dopad:** nízkorizikový exportní polish; analytická data v aplikaci tím nemění.
- **Typ:** potvrzený statický bug.
- **Nejmenší slice:** malý CSV escape helper a test pro čárku, uvozovku a nový řádek.
- **Acceptance evidence:** export lze načíst standardním CSV parserem a zachovává přesný název.

## Potvrzeně v pořádku / není problém

- **Auth a workspace základ:** `src/proxy.ts`, `src/lib/auth/server.ts` a `src/lib/dal/workspace.ts` tvoří skutečnou serverovou hranici; UI hiding není jediný guard u většiny kontrolovaných kritických akcí.
- **Queue role boundary:** operator queue operace v `src/lib/dal/leadQueue.ts` mají operator guard; supervisor recovery operace mají vedoucí/admin guard. SQL recovery/call-completion funkce kontrolují `auth.uid()`, membership/workspace a mají invoker/privilege hardening podle migrací.
- **Call recovery contract:** současná recovery migrace zachovává `awaiting_outcome`/`recovery_required` a neřeší zavření okna aktivního hovoru přes `beforeunload` jako release/reassign mechanismus. To je správná server-owned ochrana; chybí však live negative/recovery důkaz.
- **Truthful unavailable/simulation UI:** monitor vrací explicitně prázdný/unavailable stav; training a softphone jsou označené jako simulace; Product Script fallback je explicitní a read-only. To je code-level evidence, nikoli live Product Script role/persistence smoke.
- **Generated artefakty:** tracked `output/playwright/operator-console-01-ready.png`, `02-in-call.png`, `03-post-call.png` byly zachovány; nebyly nalezeny recovery soubory určené k odstranění. Jejich existence není nový browser důkaz.
- **No TODO/FIXME/HACK:** v kontrolovaných TS/TSX cestách nebyl nalezen takový marker. `eslint-disable` výskyty jsou lokální výjimky pro `<img>` a React effect rule; samy o sobě nejsou potvrzený swallowed error.

## Doporučené pořadí navazujících slices

### Primární slice

`fix/workflow-execution-truth-and-operator-dispatch`

Nejdřív opravit P0 false-success kontrakt a současně připojit Operator Console completion na jeden server-owned event dispatcher. Slice musí pokrýt simulation/unavailable/failure/success status, awaitovanou log persistence, webhook error semantics, operator path a unit/integration regresní testy. Teprve tento výsledek může být základem pro další browser/persistence smoke.

### Nejvýše dvě alternativy

1. `fix/server-side-analytics-role-boundary` — malý samostatný authorization slice s negativními role/workspace testy.
2. `fix/atomic-business-mutation-audit` — transakční/idempotentní lead/order mutace s audit failure testem.

Blueprint apply, stale `schema.sql` a široký docs cleanup mají následovat jako oddělené slices; neřešit je skrytě v primárním workflow fixu.

## Gate a delivery poznámka

Před dokumentačním commitem byly ověřeny cwd, worktree, branch/base, remote divergence a další worktrees. Po změně proběhly tyto kontroly:

| Kontrola | Výsledek | Přesný stav |
|---|---|---|
| `npm test` | **neprovedeno** | script skončil před Vitestem: lokální `vitest` binárka není dostupná |
| `npm run check` | **neprovedeno** | script skončil v lint kroku: lokální `eslint` binárka není dostupná |
| `git diff --check` | **prošlo** | bez whitespace chyb |
| `npm audit --omit=dev --audit-level=high` | **prošlo** | 0 vulnerabilities |
| no-unused/static TypeScript scan | **neprovedeno** | dostupný compiler bez repo dependencies generoval module-resolution/typové chyby; kandidát `chatHistory` je staticky doložen, bez automatické opravy |

Před commitem bude znovu ověřen explicitní diff pouze těchto dvou dokumentů.

Pokud lokální checkout nemá dostupné dependencies, výsledek gates bude označen jako neproveditelný kvůli prostředí, nikoli jako zelený. Build/test nikdy nebude prezentován jako authenticated browser, persistence, authorization nebo RLS proof.
