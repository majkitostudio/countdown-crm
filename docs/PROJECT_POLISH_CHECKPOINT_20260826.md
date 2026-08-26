# Countdown CRM — Project Polish Checkpoint

**Datum auditu:** 26. 8. 2026
**Auditní větev:** `docs/polish-progress-slice-9`
**Ověřený baseline:** `origin/main` = `ccb641aa6000d789f03b4060765e3a108e635174` (`chore: remove legacy training response path (#19)`)
**Rozsah:** read-only audit aplikačního shellu, 23 rout, API rout, Server Actions, DAL/RPC, auth/workspace hranic, Workflow/Blueprint/Operator Console/Orders/Product Scripts/Training, testů, konfigurace a dokumentace.

## Výsledek v jedné větě

Repozitář je po merge Slice 1, Slice 9 a Slice 10 čistý; analytics role boundary, CSV escaping i legacy training path jsou uzavřené podle doložených gate. Slice 2 zůstává partial/in progress a projekt stále nelze označit za pilot-ready, protože chybí pozitivní Team Leader/Admin browser důkaz, strict cross-instance exactly-once/webhook idempotency a další authenticated workflow, persistence a RLS důkazy.

Tento dokument je checkpoint a prioritizovaný backlog. Runtime ani databáze se v tomto auditu neměnily.

## Důkazní hranice

| Vrstva | Výsledek tohoto auditu | Co z toho nelze tvrdit |
|---|---|---|
| Git/repozitář | `origin/main` po fetchi = `ccb641a`; Slice 1, Slice 9 a Slice 10 jsou merged jako PR #15/#19/#16; docs změna běží na pojmenované větvi | že live deploy nebo live DB odpovídá checkoutu |
| Statická analýza | zdokumentované nálezy v TS/TSX, SQL a docs; 23 page rout, 4 training API routy, 7 testovacích souborů | že každá větev funguje v přihlášeném browseru |
| Unit/API testy | Slice 1 role tests `48/48`; Slice 9 training API `16/16`, full suite `54/54`; Slice 10 targeted `6/6`; `npm run check` a `git diff --check` green | že jsou ověřené všechny WorkflowEngine/Blueprint/queue/call-order/RLS kontrakty |
| Browser | Slice 1: autentizovaný Administrator allowed + reload a Operator explicit forbidden + reload; čistá konzole, bez exportu/dat | browser smoke není RLS proof; nejde z něj tvrdit persistence ani cross-workspace RLS |
| Persistence | statické čtení ukazuje Server Actions/DAL/RPC hranice | že zápis přežije reload nebo že partial failure nezanechá nekonzistentní stav |
| Authorization/RLS | kód a migrace obsahují workspace membership, role guardy, invoker RPC a hardened queue recovery | že negativní role/workspace a RLS test skutečně proběhl proti live Supabase |

## Inventář rout a hlavních hranic

Všechny routy níže byly nalezeny jako současné `page.tsx` soubory. Přístup je obecně chráněn `src/proxy.ts`; `/login` je veřejná routa. API routy jsou proxy výjimkou, ale training handlers samy volají autentizační kontrolu.

| Routa | Hlavní odpovědnost | Důkazní stav |
|---|---|---|
| `/` | dashboard/AppShell, workspace-scoped přehled | statická hranice; browser neověřen |
| `/analytics` | workspace revenue/call analytics, CSV export | Slice 1 role boundary a Slice 10 escaping jsou merged; browser evidence je uvedena níže |
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

### P1 — Analytics Server Action postrádal deklarovaný role guard *(historical / resolved v Slice 1)*

- **Soubor/symbol:** `src/lib/analytics.ts:178-226` (`getAnalyticsData`), `src/app/actions/analytics.ts:6-8`, `src/app/analytics/page.tsx:53-64`.
- **Historický nález:** funkce dokumentovaná jako „Team Leader analytics“ volala pouze `requireWorkspaceContext()` a neměla deklarovaný server-side role guard; UI stránka také neměla vlastní role gate.
- **Stav po Slice 1:** PR #15 (`fix: enforce analytics role boundary`), merge commit `73ac1775a8a740ad4a655612dfa68b6b9ca3a543`; targeted role tests `48/48`, `npm run check`/build a `git diff --check` green. Autentizovaný browser důkaz: Administrator allowed + reload, Operator explicit forbidden + reload, bez exportu/dat a s čistou konzolí.
- **Důkazní hranice:** browser smoke není RLS proof; persistence je N/A; schema/RLS se nezměnily.
- **Dopad:** pokud route/Server Action zavolá autentizovaný operator, může dostat týmové revenue, call a operator leaderboard metriky určené pro vedoucí. Skrytí položky v navigaci by nebyla dostatečná ochrana.
- **Typ:** potvrzený statický authorization gap vůči deklarovanému účelu; přesná live exploitace nebyla provedena.
- **Nejmenší slice:** přidat server-side role guard a regresní test 401/403/allowed role; současně projít export action, aby sdílela stejnou hranici.
- **Původní acceptance evidence:** zachována jako historický kontext; současný stav je doložen výše a neimplikuje RLS proof.

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
- **Stav po Slice 9:** PR #19 (`chore: remove legacy training response path`), merge commit `ccb641aa6000d789f03b4060765e3a108e635174`; `generateAICustomerResponse` a nepoužitý `chatHistory` byly odstraněny. Kanonická path je `submitTrainingTurnAction → generateTrainingResponseAction`.
- **Důkazní hranice:** training API `16/16`, full suite `54/54`, `npm run check` a `git diff --check` green. Browser, persistence, authorization a RLS jsou N/A; původní nález je historical/resolved.

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

### P3 — CSV export neescapoval vnitřní uvozovky *(historical / resolved v Slice 10)*

- **Soubor/symbol:** `src/lib/analyticsExport.ts:14-17`.
- **Historický nález:** `agentName` se vkládal do uvozovek, ale vnitřní `"` se nenahrazovalo `""`; jméno s uvozovkou mohlo rozbít CSV řádek.
- **Stav po Slice 10:** PR #16 (`fix: escape analytics CSV fields`), merge commit `665c4f465e63c9f634d17e4e06e7a0a457874a49`; targeted tests `6/6`, full suite `54/54`, `npm run check` a `git diff --check` green.
- **Důkazní hranice:** pure formatting; browser, auth, persistence a RLS jsou N/A.
- **Dopad:** nízkorizikový exportní polish; analytická data v aplikaci tím nemění.
- **Typ:** potvrzený statický bug, nyní resolved/historical.
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

`fix/workflow-truth-dispatch` — Slice 2, Workflow truth contract + Operator Console dispatch

Nejdřív opravit P0 false-success kontrakt a současně připojit Operator Console completion na jeden server-owned event dispatcher. Slice musí pokrýt simulation/unavailable/failure/success status, awaitovanou log persistence, webhook error semantics, operator path a unit/integration regresní testy. Teprve tento výsledek může být základem pro další browser/persistence smoke.

Slice 2 je aktuálně `partial / in progress`; draft PR #17 zůstává otevřený a tento checkpoint ho neoznačuje jako merged ani done. Statická evidence je `67/67` a check/diff jsou green. Controlled Operator sandbox doložil one-call/one-execution, truthful unavailable/no durable effect, SQL read-back a nulový fixture cleanup; fresh Operator `/workflows` je forbidden i po reloadu, bez controls/data a s čistou konzolí. RLS policy evidence ukazuje workspace-member SELECT/INSERT potřebný pro dispatcher a manager/admin mutation policy.

Stále chybí pozitivní Team Leader/Admin browser důkaz. Strict cross-instance exactly-once/webhook idempotency zůstává schema gap. Softphone UI zůstalo stuck na `Starting call`, takže nejde o workflow proof. Žádný pilot-ready claim.

### Nejvýše dvě alternativy

1. `fix/atomic-business-mutation-audit` — transakční/idempotentní lead/order mutace s audit failure testem.
2. `fix/server-authoritative-blueprint-apply` — až po vyjasnění transakčního/idempotentního kontraktu.

Blueprint apply, stale `schema.sql` a široký docs cleanup mají následovat jako oddělené slices; neřešit je skrytě v primárním workflow fixu.

## Gate a delivery poznámka

Před dokumentačním commitem byly ověřeny cwd, worktree, branch/base, remote divergence a další worktrees. Po změně proběhly tyto kontroly:

| Kontrola | Výsledek | Přesný stav |
|---|---|---|
| `npm test` | **N/A pro tento docs-only slice** | runtime se neměnil; relevantní merge evidence Slice 1: `48/48`, Slice 10: `54/54` |
| `npm run check` | **N/A pro tento docs-only slice** | runtime se neměnil; oba merged slices mají ověřený green check/build podle evidence výše |
| `git diff --check` | **prošlo** | bez whitespace chyb |
| `npm audit --omit=dev --audit-level=high` | **prošlo** | 0 vulnerabilities |
| no-unused/static TypeScript scan | **neprovedeno** | dostupný compiler bez repo dependencies generoval module-resolution/typové chyby; kandidát `chatHistory` je staticky doložen, bez automatické opravy |

Před commitem bude znovu ověřen explicitní diff pouze těchto dvou dokumentů.

Pokud lokální checkout nemá dostupné dependencies, výsledek gates bude označen jako neproveditelný kvůli prostředí, nikoli jako zelený. Build/test nikdy nebude prezentován jako authenticated browser, persistence, authorization nebo RLS proof.
