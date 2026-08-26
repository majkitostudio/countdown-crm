# Countdown CRM — Project Polish Implementation Plan

**Plán vytvořen:** 26. 8. 2026
**Vychází z:** [Project Polish Checkpoint 2026-08-26](PROJECT_POLISH_CHECKPOINT_20260826.md)
**Baseline:** `origin/main` / `ccb641aa6000d789f03b4060765e3a108e635174`
**Typ:** rozhodovací balíček; tento dokument nemění runtime, testy, migrace, databázi ani artefakty.

## Roadmapa

| Pořadí | Slice | Priorita | Závisí na | Paralelní? | Velikost | Riziko | Gate k dokončení |
|---:|---|---|---|---|---|---|---|
| 0 | Land audit/docs decision package | P2 | žádná | sekvenční | S | nízké | oba docs commity jsou reviewnuté a PR #14 merge-ready |
| 1 | Server-side analytics role boundary — **done** (PR #15) | P0 | 0 | ano s 2–6 | S | nízké | operator dostane 403, leader/admin data ano, CSV sdílí guard |
| 2 | Workflow truth contract + Operator dispatch — **partial / in progress** (draft PR #17) | P0 | 0 | částečně; merge před 7 | L | vysoké | žádný console-only success, operator completion generuje durable event |
| 3 | Atomic business mutation + audit | P1 | 0; pattern může běžet s 2 | ano s 2, 5, 6 | M | vysoké | business data a audit mají atomický/idempotentní kontrakt |
| 4 | Server-authoritative idempotent Blueprint apply | P0 | 3 pro transakční pattern | po 3 | L | vysoké | workspace/reload/login stav je durable a retry-safe |
| 5 | Unified server-owned Operator presence | P1 | 0 | ano s 1–4 | S | střední | Sidebar, CallStatusBar a routing zobrazují stejný stav |
| 6 | Schema provisioning contract + fresh-schema proof | P1 | 0 | ano s 1–5 | M | vysoké | schválený source-of-truth, fresh schema/policy proof, žádný drift rewrite |
| 7 | Critical unit/integration + static test matrix | P1 | 1–4 | po dotčených fixech | M | střední | Workflow, Blueprint, queue/order, roles a failure kontrakty automaticky pokryté |
| 8 | Authenticated Operator/Product Script evidence run | P1 | 2–7, 6 pouze pokud je proof target jasný | sekvenční | M | vysoké | reálný Auth browser, reload/login, negative role/workspace, Product Script role smoke |
| 9 | Legacy training/dead-code cleanup | P2 | 7 | ano s 10–12 | S | nízké | no-unused/import graph čistý, kanonická training path zachovaná |
| 10 | CSV escaping — **done** (PR #16) | P3 | 1 | ano s 9, 11–12 | S | nízké | standardní CSV parser zachová čárky, uvozovky i nové řádky |
| 11 | Hotspot decomposition | P2 | 2–8 | po stabilizaci kontraktů | M/L | střední | menší odpovědnosti bez změny auth/datových kontraktů |
| 12 | Documentation alignment | P2 | 2, 4, 6, 8–11 | poslední docs slice | M | střední | README/architecture/roadmap/commits odpovídají runtime a důkazům |
| 13 | Generated/recovery artifact governance | P2 | 0; rozhodování může běžet průběžně | ano | S | nízké | pravidlo provenance/retence, žádné automatické mazání bez účelu |

Roadmap status: Slice 9 je `done` (PR #19, merged do `origin/main`); Slice 2
je `partial / in progress` (draft PR #17).

### Paralelní běhy a sekvence

Slice 1 je dokončený první implementační PR: PR #15, merge commit
`73ac1775a8a740ad4a655612dfa68b6b9ca3a543`, targeted role tests `48/48`,
check/build/diff green a autentizovaný browser důkaz pro Administrator/Operator.
Slice 10 je dokončený pure-formatting PR: PR #16, merge commit
`665c4f465e63c9f634d17e4e06e7a0a457874a49`, targeted `6/6`, full `54/54`,
`npm run check` a `git diff --check` green; browser/auth/persistence/RLS N/A.
Po nich může paralelně běžet Slice 2, 3, 5 a 6,
pokud každý task zůstane ve vlastním worktree a nezasahuje do stejných souborů.
Slice 4 musí počkat na transakční/idempotentní rozhodnutí ze slice 3. Slice 7
se přidává k opravným PR tam, kde je to nejpřesnější, ale jako konsolidovaný
cross-layer test slice následuje po 1–4. Slice 8 je vždy sekvenční po serverových
opravách; browser smoke nesmí potvrzovat známý false-success kontrakt. Slice
11 a 12 jsou záměrně později, aby nerozbily dosud neuzavřené hranice.

Každý slice má vlastní task, branch, worktree, focused commit a samostatný PR.
Žádný slice nesmí použít `git add .`/`git add -A`, měnit cizí worktree nebo
řešit více než uvedený kontrakt.

## Společná validační legenda

V každém slice se výsledky zapisují odděleně:

- **Static:** diff, typecheck/lint, import graph, SQL policy/function review.
- **Unit/integration:** izolovaný kontrakt, injected failure, idempotency a call graph.
- **Browser:** skutečná UI relace; nikdy demo auth ani mock jako náhrada.
- **Persistence:** kontrola po reloadu a nové session, případně přímý read-only SQL dotaz.
- **Authorization:** pozitivní a negativní role/workspace scénáře přes server boundary.
- **RLS:** live nebo schválený SQL harness s `auth.uid()`, rolemi a cizím workspace; build ani browser smoke tuto vrstvu nenahrazuje.

Obecná stop podmínka: pokud target workspace, Auth účet, DB source-of-truth,
rollback nebo očekávaný objekt není jednoznačný, slice se zastaví před zápisem.
Nikdy se nepoužije demo auth, service-role key ve frontendu, blind migration
apply, migration repair, `db pull` do produktového checkoutu nebo `npm audit
fix --force` jako náhrada rozhodnutí.

## Slice 0 — Land audit/docs decision package

**Task/branch:** `docs: land project polish decision package` /
`audit/project-polish-checkpoint-20260826` (aktuální PR #14)
**Priorita:** P2
**Velikost/riziko:** S / nízké
**Závislosti:** žádné; tento plán je součástí stejného docs balíčku.

**Cíl a problém:** Doručit auditní baseline, nálezy a pořadí oprav jako
reviewovatelný rozhodovací záznam bez runtime změny.

**Soubory/symboly:** `docs/PROJECT_POLISH_CHECKPOINT_20260826.md`,
`docs/PROJECT_POLISH_IMPLEMENTATION_PLAN_20260826.md` a pouze přímá oprava
migration wording v `docs/AKTUALNI_STAV_A_DESATERO.md`.

**Scope:** docs-only diff, čerstvý `origin/main` baseline, explicitní nálezy a
delivery metadata.
**Non-goals:** žádný runtime/test/schema/migration/DB change, žádné PR #6/#7/#8,
žádné mazání artefaktů.

**Implementace:** Udržet checkpoint jako evidence a tento plán jako roadmapu;
handoff smí obsahovat pouze aktuální baseline a explicitní source-of-truth
rozhodnutí.

**DB/migration dopad a stop:** nulový. Stop při nečistém worktree, nejasném
baseline nebo diffu mimo schválené dokumenty.

**Acceptance:** oba dokumenty jsou konzistentní s `origin/main`, obsahují
separátní evidence gates, explicitní P0–P3, a žádný runtime/DB diff.

**Validace:** static `git diff --check`, odkazy a branch names; unit/browser/
persistence/authorization/RLS se zde neprovádí.

**Rollback/delivery:** revert focused docs commit nebo zavřít PR bez zásahu do
runtime; commit/push/draft PR #14 podle `AGENTS.md`.

## Slice 1 — Server-side analytics role boundary — **done**

**Task/branch:** `fix: enforce analytics role boundary` /
`fix/analytics-role-boundary`
**Priorita:** P0
**Velikost/riziko:** S / nízké
**Závislosti:** slice 0; může běžet paralelně se slices 2–6.

**Cíl a problém:** `getAnalyticsDataAction` a případný export musí být
dostupný jen `team_leader`/`administrator`. Současná `getAnalyticsData` volá
jen `requireWorkspaceContext()` a vrací workspace revenue, calls a leaderboard.

**Soubory/symboly:** `src/lib/analytics.ts:getAnalyticsData`,
`getRecentActivity`; `src/app/actions/analytics.ts`; případný export handler
v `src/lib/analyticsExport.ts`; `src/app/analytics/page.tsx`.

**Scope:** server-side guard, jednotný workspace context, explicitní 401/403
výsledek, guard pro export a cílené testy.
**Non-goals:** redesign analytics, forecast/AI, nové KPI, změna RLS policies nebo
oprava CSV escaping (ta patří slice 10).

**Implementace:** Guard dát na server boundary, ne pouze do navigace. Pokud
`getRecentActivity` sdílí privileged data, použít stejný kontrakt; export
nesmí obejít autorizovanou action. Chyba musí být rozlišitelná od unavailable
dat a nesmí vyrábět prázdný success.

**DB/migration dopad a stop:** očekávaně nulový; dotazy zůstanou workspace
scoped. Stop při zjištění, že analytics model záměrně patří operatorům — pak
nejprve vznikne explicitní product/access decision, ne tiché rozšíření přístupu.

**Acceptance:** operator a člen cizího workspace dostane 403; Team Leader/Admin
vidí jen svůj workspace; export má stejnou hranici; UI umí zobrazit forbidden/
unavailable bez datového fallbacku.

**Validace:** static guard/import review; unit/integration role matrix; browser
positive leader/admin a negative operator; persistence nerelevantní; authorization
cross-workspace; RLS read-only potvrzení, že query nepoužívá jiný workspace.

**Rollback/delivery:** revert jediného server/action commitu; žádná migrace.
Focused PR po zeleném lint/typecheck/test gate.

**Delivery evidence:** PR #15 merged; merge commit
`73ac1775a8a740ad4a655612dfa68b6b9ca3a543`; targeted tests `48/48`,
`npm run check`/build a `git diff --check` green. Authenticated browser:
Administrator allowed + reload, Operator explicit forbidden + reload, no
export/data, clean console. Browser není RLS proof; persistence N/A;
schema/RLS beze změny. Původní analytics guard nález je historical/resolved.

## Slice 2 — Workflow truth contract + Operator Console dispatch — **partial / in progress**

**Task/branch:** `fix: make workflow execution truthful and dispatch operator calls` /
`fix/workflow-truth-dispatch`
**Priorita:** P0
**Velikost/riziko:** L / vysoké
**Závislosti:** slice 0; části mohou běžet s 1, 3, 5, 6, ale merge a browser
evidence až po stabilizaci tohoto kontraktu.

**Cíl a problém:** Console-only `compute_ai_summary`, e-mail, status update a
manager notification se nesmí zapisovat jako success. Webhook nesmí být success
po `fetch` chybě a execution log persistence nesmí být skrytý fire-and-forget.
Hlavní operator completion současně nevolá engine.

**Soubory/symboly:** `src/lib/workflows/engine.ts:emit`, `executeActions`,
`createLogEntry`; `src/app/workspace/page.tsx` operator/non-operator completion;
`src/app/workflows/page.tsx` manual test button; workflow DAL/action persistence.

**Scope:** explicitní result model `success`/`failure`/`simulation`/`unavailable`,
HTTP failure semantics, await/propagate log persistence, jeden server-owned
dispatcher pro podporované trigger events a test-only označení manual emit.

**Non-goals:** live telephony, live AI, e-mail provider, manager notification
provider, nový workflow DSL nebo redesign Workflow UI.

**Implementace:** Nevracet pouze `string[] executedActions`; action executor
musí vracet výsledek s důvodem a durable effect. U webhooku kontrolovat
`fetch` exception i HTTP status podle zvoleného kontraktu. Dispatcher musí
navazovat na úspěšné serverové call completion, ne na browser `useState`.
Execution log se uloží před potvrzením success, nebo se celé provedení označí
failure/persistence-failure. Event payload musí být kanonický a bez demo textu.

**DB/migration dopad a stop:** preferovat současnou `workflow_executions` cestu;
nová schema/migrace jen po explicitním návrhu. Stop při nejasném ownershipu
side effectu, nutnosti service role, nebo pokud nelze rozlišit simulation od
real side effectu.

**Acceptance:** každý action type má pravdivý status; failed webhook není
executed; log persistence failure je viditelné; operator call completion
vyvolá event právě jednou; `on_order_placed`, `on_lead_status_changed` a
`on_lead_created` mají buď podporovaný dispatcher, nebo explicitní unavailable.

**Validace:** static call graph a no-fire-and-forget review; unit/integration
action matrix, webhook failure, duplicate event a log failure; browser
authenticated operator call path; persistence execution log po reload/login;
authorization workspace/role; RLS execution row scope a function privileges.

**Rollback/delivery:** feature flag nebo revert commitu vrátí pouze dispatcher/
truth contract; nejprve zachovat stará data, ne mazat execution history. PR je
review-sensitive draft do dokončení cross-layer evidence.

**Current evidence status:** draft PR #17 zůstává otevřený; Slice 2 není merged
ani done. Staticky `67/67` a check/diff jsou green. Controlled Operator sandbox
doložil one-call/one-execution, truthful unavailable/no durable effect, SQL
read-back a nulový fixture cleanup. Fresh Operator `/workflows` byl forbidden i
po reloadu, bez controls/data a s čistou konzolí. RLS policy evidence ukazuje
workspace-member SELECT/INSERT potřebný pro dispatcher a manager/admin mutation
policy. Pozitivní Team Leader/Admin browser důkaz stále chybí; strict
cross-instance exactly-once/webhook idempotency zůstává schema gap. Softphone UI
zůstalo stuck na `Starting call`, takže nejde o workflow proof. Žádný pilot-ready
claim.

## Slice 3 — Atomic business mutation + audit trail

**Task/branch:** `fix: make business mutations and audit atomic` /
`fix/atomic-business-audit`
**Priorita:** P1
**Velikost/riziko:** M / vysoké
**Závislosti:** slice 0; může běžet paralelně se slice 2, ale slice 4 využije
jeho transakční/idempotentní pattern.

**Cíl a problém:** Lead status a product reassignment mění business data před
auditem. Při audit failure klient dostane chybu po business změně; retry může
opakovat operaci.

**Soubory/symboly:** `src/lib/dal/leads.ts:updateLeadStatusForWorkspace`;
`src/lib/dal/orders.ts:reassignOrdersProductForWorkspace`;
`src/lib/dal/audit.ts:createAuditLogForWorkspace`; vhodné současné RPC v
`supabase/migrations/` podle schváleného návrhu.

**Scope:** transakční server/RPC kontrakt nebo výslovný idempotentní partial
result, konzistentní error mapping, audit actor/workspace context a retry key.

**Non-goals:** globální audit redesign, oprava všech historických logů, změna
RLS historie nebo migration reconciliation.

**Implementace:** Preferovat jednu DB operaci, která buď provede business i
audit, nebo vrátí explicitní `partial` s recovery stavem. Nesmí se schovat
chyba ani vracet obecný success. RPC musí zůstat bezpečně invoker/privilege
restricted; nepoužít SECURITY DEFINER jako workaround.

**DB/migration dopad a stop:** pravděpodobný nový/změněný RPC migration slice;
stop při nejasném target workspace, nemožném rollbacku nebo chybějícím RLS
testu před apply. Žádný live apply v implementačním tasku bez samostatného
schválení.

**Acceptance:** audit failure vede k rollbacku nebo explicitnímu recovery
kontraktu; duplicate submit je idempotentní; lead/order stav, audit a klientská
chyba jsou konzistentní; cizí workspace je odmítnut.

**Validace:** static RPC/role review; unit/integration injected audit failure,
retry and concurrency; browser mutation + visible result; persistence reload;
authorization role/workspace negative tests; RLS policy/function and no-public-
execute proof.

**Rollback/delivery:** RPC migration musí mít přesný revert/disable plán a
backward-compatible action rollout; žádné mazání dat. High-risk PR zůstává
draft do negativních testů.

## Slice 4 — Server-authoritative, idempotent Blueprint apply

**Task/branch:** `fix: make blueprint apply workspace-authoritative` /
`fix/blueprint-authoritative-apply`
**Priorita:** P0
**Velikost/riziko:** L / vysoké
**Závislosti:** slice 3 pro atomický/idempotentní mutation pattern; slice 2
pro workflow rule persistence contract.

**Cíl a problém:** `BlueprintEngine.applyBlueprint` mění `localStorage`, pak
paralelně ukládá atributy a fire-and-forget ukládá rules, přesto modal zobrazí
úspěch. Lokální aktivní blueprint není workspace-scoped.

**Soubory/symboly:** `src/lib/blueprints/engine.ts:applyBlueprint`,
`persistActiveBlueprint`; `src/components/blueprints/BlueprintPickerModal.tsx`;
`src/app/actions/schema.ts`, `src/lib/dal/schema.ts`, workflow DAL/actions;
`src/lib/blueprints/registry.ts`.

**Scope:** server-authoritative apply command, workspace identity, idempotency
key, durable result counts/status, retry-safe duplicate handling a UI success
teprve po durable completion.

**Non-goals:** nové industry blueprints, EAV redesign, workflow action provider,
vizuální redesign pickeru, localStorage jako obecná preference platforma.

**Implementace:** Přesunout orchestraci na server boundary; server ověří
workspace/role, aplikuje preset v jedné transakční nebo recovery-safe operaci,
vrátí per-component result a použije stable blueprint/version key. Client
aktualizuje local cache až po success; failure zobrazí retry/unavailable.

**DB/migration dopad a stop:** může vyžadovat blueprint application/version
metadata nebo bezpečný RPC; schema návrh se zastaví, pokud by vyžadoval blind
reconciliation. Stop při nemožnosti atomicky zabránit partial duplicate rules.

**Acceptance:** apply přežije reload i login v jiném browseru stejného workspace;
partial failure nehlásí success; retry nevytvoří duplicate attrs/rules; cizí
workspace/role je odmítnut; audit nebo execution result je dohledatelný.

**Validace:** static client/server boundary review; unit/integration partial
failure and idempotency; browser manager apply; persistence reload/new session;
authorization role/workspace; RLS schema/rule scope and RPC privileges.

**Rollback/delivery:** feature flag/old picker remains available only as explicit
unavailable during rollout; preserve existing attrs/rules, add compensating
recovery command rather than delete. Draft PR due data risk.

## Slice 5 — Unified server-owned Operator presence

**Task/branch:** `fix: unify operator presence state` /
`fix/unified-operator-presence`
**Priorita:** P1
**Velikost/riziko:** S / střední
**Závislosti:** slice 0; může běžet paralelně se slices 1–4.

**Cíl a problém:** `Sidebar` drží vlastní lokální `ready/in_call/break` stav a
nevolá server; `workspace/page.tsx` používá serverové `setOperatorPresenceAction`.
Po navigaci/reloadu může Sidebar tvrdit jiný stav než routing.

**Soubory/symboly:** `src/components/layout/Sidebar.tsx`;
`src/app/workspace/page.tsx:operatorStatus`, `handleOperatorStatusChange`;
`src/components/workspace/CallStatusBar.tsx`; presence DAL/action/RPC.

**Scope:** jeden server-owned source, read model pro Sidebar, explicitní
optimistic/pending/error state a zákaz lokálního statusu ovlivňovat routing.

**Non-goals:** live supervisor monitor, telephony integration, presence schema
reconciliation, redesign status menu.

**Implementace:** Buď Sidebar pouze zobrazuje context status, nebo používá
stejnou server action a po reloadu hydratuje z DB. Přechod `in_call` musí být
svázán s call lifecycle; lokální změna nesmí předstírat persisted presence.

**DB/migration dopad a stop:** očekávaně nulový; využít existující presence
DAL/RPC. Stop při zjištění více autorit v DB bez rozhodnutí o precedence.

**Acceptance:** status je stejný v Sidebar, CallStatusBar, workspace a po
reloadu; failed save je viditelný; status nemění lead assignment pouze v UI.

**Validace:** static state-flow review; unit transition/error tests; browser
navigace/reload s Auth session; persistence presence read-back; authorization
operator versus supervisor; RLS own/operator and supervisor scope.

**Rollback/delivery:** revert UI read model bez datové změny; focused low-risk PR.

## Slice 6 — Schema provisioning contract and fresh-schema proof

**Task/branch:** `docs: establish schema provisioning contract` /
`docs/schema-provisioning-contract`
**Priorita:** P1
**Velikost/riziko:** M / vysoké
**Závislosti:** slice 0; může běžet paralelně, ale musí předcházet každému
novému schema/RPC apply.

**Cíl a problém:** Trackovaný `supabase/schema.sql` je neúplný snapshot se staršími
permissive policies, zatímco repo má současnou migration sadu. Migration history
není tímto plánem vyhlášena source of truth a nesmí se blindně přepisovat.

**Soubory/symboly:** `supabase/schema.sql`; `supabase/migrations/*` pouze jako
inventář schváleného současného contractu; `supabase/config.toml`, README/CI
reference pokud existují; generated database types.

**Scope:** rozhodnout jeden provisioning contract (např. schválený migratory
bootstrap nebo explicitně udržovaný schema artifact), označit stale snapshot,
vytvořit read-only fresh-schema/policy diff a stop/rollback runbook.

**Non-goals:** migration repair, `db pull`, přepis migration history, live apply,
obecný drift projekt, advisor cleanup, změna produkční DB.

**Implementace:** Zmapovat, co skutečně používá provisioning/CI. Pokud `schema.sql`
není aktivní, označit ho historical/non-authoritative; pokud aktivní je, návrh
musí řešit kompletní tabulky, grants, RLS, function privileges a versioning.
Fresh proof má vzniknout v izolovaném scratch targetu nebo schváleném read-only
harnessu a nesmí zapisovat do produktového checkoutu/live DB.

**DB/migration dopad a stop:** rozhodovací slice s nulovým live dopadem; stop při
nejasném targetu, remote-only objektech bez provenance, mismatch v expected
object/policy scope nebo chybějícím cleanup plánu.

**Acceptance:** dokumentovaný source-of-truth; `schema.sql` není omylem
prezentován jako současné schéma; fresh schema obsahuje očekávané objekty,
RLS/grants/policies; rozdíly jsou klasifikované bez opravování historie.

**Validace:** static SQL inventory; unit není relevantní; browser není schema
proof; persistence fresh database introspection; authorization policy matrix;
RLS table enabled/policy/function/grant checks. Vše read-only, dokud není
samostatně schválený apply.

**Rollback/delivery:** revert docs/contract decision; scratch artifacts mají
explicitní cleanup, produktová DB zůstává beze změny. PR je review-sensitive.

## Slice 7 — Critical unit/integration and static test matrix

**Task/branch:** `test: cover critical polish contracts` /
`test/polish-critical-contracts`
**Priorita:** P1
**Velikost/riziko:** M / střední
**Závislosti:** po slices 1–4 nebo jako testy přidané přímo do nich; slice 6
dodá SQL checklist, ne nutně test runner.

**Cíl a problém:** současných 7 test souborů (~37 cases) nechrání WorkflowEngine,
BlueprintEngine, queue, call/order mutation, analytics role boundary ani RLS.

**Soubory/symboly:** nové testy vedle `tests/`; `src/lib/workflows/engine.ts`,
`src/lib/blueprints/engine.ts`, `src/lib/dal/leadQueue.ts`,
`src/lib/dal/leads.ts`, `src/lib/dal/orders.ts`, analytics actions a relevantní
RPC/SQL fixtures.

**Scope:** test matrix s explicitními test IDs pro truth statuses, duplicate
events, failure persistence, blueprint retry, mutation/audit rollback, operator
role/workspace a no-unused/static checks.

**Non-goals:** nahrazovat live RLS browserem, seedovat demo auth, přidávat
dependencies nebo mazat test kvůli zelenému výsledku.

**Implementace:** Unit testy izolují engine/actions; integration testy ověří
server dispatcher/DAL contract; browser/persistence/authorization/RLS evidence
zůstanou samostatné suites/reports. Injected failures musí být deterministic.

**DB/migration dopad a stop:** žádný schema/live dopad pro unit/integration;
stop při testu vyžadujícím neznámý live fixture nebo service-role bypass.

**Acceptance:** coverage mapuje každý P0/P1 acceptance; `npm test`, lint,
typecheck/build mají vysvětlený výsledek; negativní role/workspace a duplicate
submit scénáře jsou explicitně zelené.

**Validace:** static import/no-unused; unit/integration full matrix; browser
subset jen pokud má skutečnou session; persistence reload tests odděleně;
authorization/RLS harness odděleně a s přesnými targety.

**Rollback/delivery:** test-only revert je bezpečný, ale nesmí odstranit
regresi bez evidence; PR může být samostatný, nebo součást fix PR podle
kontraktu.

## Slice 8 — Authenticated Operator lifecycle and Product Script role-only evidence

**Task/branch:** `test: verify authenticated operator and Product Script evidence` /
`test/authenticated-operator-product-script-evidence`
**Priorita:** P1
**Velikost/riziko:** M / vysoké
**Závislosti:** slices 1–7 podle workflow targetu; musí proběhnout až po truth,
dispatch a schema contract rozhodnutí.

**Cíl a problém:** Chybí čerstvý důkaz reálného Auth workflow: login, claim,
call completion/recovery, callback/order, reload/login, negative role/workspace,
idempotency a Product Script role-only smoke.

**Soubory/symboly:** `src/proxy.ts`, auth server, `/workspace`, `/calendar`,
`/orders`, `/settings/scripts`, relevantní actions/DAL/RPC; evidence report mimo
runtime kód.

**Scope:** read-only/controlled test run se skutečnou přihlášenou relací,
explicitní účty/role/workspaces bez hesel, cleanup plan a SQL read-back.

**Non-goals:** demo auth, mock session, live telephony, migration apply, Product
Script UI redesign, tvrzení o pilot readiness pouze z browseru.

**Implementace:** Připravit test matrix: operator queue claim/start/cancel/recovery
bez release při close eventu; outcome/callback/order; reload/login; duplicate
submit; manager/admin recovery; Product Script admin create/publish/archive a
operator read-only/fallback. Každý result označit browser/persistence/
authorization/RLS vrstvou.

**DB/migration dopad a stop:** pouze schválené test fixtures/read-only checks;
stop při chybějící signed-in session, nejasném workspace ID, cleanup mismatch
nebo potřebě demo auth. Žádný live write mimo předem schválený test scope.

**Acceptance:** všechny scénáře mají timestamp, účet/roli bez secretů,
expected/actual, cleanup a SQL read-back; negative operator/cross-workspace
testy prokazují odmítnutí; Product Script source-of-truth je ověřen po reloadu.

**Validace:** static evidence map; unit/integration preconditions; authenticated
browser screenshots/logs; persistence reload/new login; authorization negative
role/workspace; RLS direct read-only checks. Browser smoke není RLS proof.

**Rollback/recovery:** test fixtures musí mít explicitní označení a cleanup;
po failure zastavit a zdokumentovat stav, ne retryovat blind. Evidence report
se revertuje jako docs-only artefakt; data se nemažou bez ověřeného targetu.

## Slice 9 — Legacy training path, unused declarations and no-unused cleanup — **done**

**Task/branch:** `chore: remove confirmed legacy training path` /
`chore/legacy-training-cleanup`
**Priorita:** P2
**Velikost/riziko:** S / nízké
**Závislosti:** slice 7; může běžet se slices 10–13.

**Cíl a problém:** `src/lib/training.ts:generateAICustomerResponse` má nepoužitý
`chatHistory` a nemá consumer v nalezeném graphu; kanonická path vede přes
`generateTrainingResponseAction`.

**Soubory/symboly:** `src/lib/training.ts`; `src/app/actions/training.ts`;
training API/UI imports; TypeScript no-unused output.

**Scope:** potvrdit veřejné imports, odstranit legacy export/parametr nebo ho
explicitně označit jako interní compatibility wrapper, zlepšit no-unused check.

**Non-goals:** změna training scénářů, AI provider, simulator labels nebo
session persistence.

**Implementace:** Nejdřív import graph a package consumer check; pokud je path
interně mrtvá, odstranit ji v malém commitu. Pokud existuje externí consumer,
nejprve zachovat adapter a otevřít samostatné rozhodnutí.

**DB/migration dopad a stop:** nulový. Stop při externím consumeru, testu nebo
documentovaném API, který není v repo graphu.

**Acceptance:** no-unused scan nemá tento nález, UI/API používají jednu
kanonickou training response path, simulator/unavailable labels zůstávají.

**Validace:** static import/no-unused; unit/API training tests; browser training
simulator; persistence session smoke beze změny; authorization/RLS bez dopadu.

**Rollback/delivery:** revert jediného dead-code commitu; žádná data/schema změna.

**Delivery evidence:** PR #19 merged; merge commit
`ccb641aa6000d789f03b4060765e3a108e635174`; odstraněný
`generateAICustomerResponse` a nepoužitý `chatHistory`; kanonická path
`submitTrainingTurnAction → generateTrainingResponseAction`; training API
`16/16`, full suite `54/54`, `npm run check` a `git diff --check` green.
Browser, persistence, authorization a RLS jsou N/A. Původní nález je
historical/resolved.

## Slice 10 — CSV escaping — **done**

**Task/branch:** `fix: escape analytics CSV fields` /
`fix/analytics-csv-escaping`
**Priorita:** P3
**Velikost/riziko:** S / nízké
**Závislosti:** slice 1; může běžet se slices 9, 11–13.

**Cíl a problém:** `src/lib/analyticsExport.ts:14-17` obalí `agentName` do
uvozovek, ale nezdvojí vnitřní uvozovky a neřeší robustně CSV field escaping.

**Scope:** standardní escape helper pro comma/quote/newline a test parserem.

**Non-goals:** změna analytics dat, role guardu, export UX nebo nový formát.

**Implementace:** Escape každé textové pole podle RFC-compatible CSV pravidel,
zachovat `Unavailable` jako text a stávající download contract.

**DB/migration dopad a stop:** nulový; stop při zjištění, že downstream vyžaduje
jíný delimiter/encoding — nejprve contract decision.

**Acceptance:** jména/details s čárkou, uvozovkou a newline se načtou jako jeden
field standardním parserem; numeric/unavailable values zůstanou beze změny.

**Validace:** static; unit export helper; browser download optional; persistence,
authorization a RLS nerelevantní, analytics guard ze slice 1 zůstává.

**Rollback/delivery:** revert malého helper/test commitu.

**Delivery evidence:** PR #16 merged; merge commit
`665c4f465e63c9f634d17e4e06e7a0a457874a49`; targeted tests `6/6`, full suite
`54/54`, `npm run check` a `git diff --check` green. Pure formatting; browser,
auth, persistence a RLS jsou N/A. Původní CSV bug je resolved/historical.

## Slice 11 — Progressive hotspot decomposition

**Task/branch:** `refactor: decompose critical workflow hotspots` /
`refactor/polish-hotspot-decomposition`
**Priorita:** P2
**Velikost/riziko:** M/L / střední
**Závislosti:** slices 2–8; každý hotspot musí být vlastní pod-PR nebo jasný
commit, ne jeden obří cleanup.

**Cíl a problém:** Největší soubory kombinují UI orchestration, async state,
domain decisions a persistence: `types.ts` (~1130), training page (~1109),
workspace page (~867), RuleBuilderModal (~568), workflow page (~499), Product
ScriptManager (~498), OrderCreateForm (~487), ProductOrderPanel (~432),
DAL schema/activity/leadQueue.

**Scope:** vybrat jeden nejbližší hotspot podle změny, extrahovat čisté view/
mapper/contract boundaries a zachovat public auth/data contracts.

**Non-goals:** redesign, změna route topology, auth/RLS rewrite, broad formatting,
nové dependency nebo současné řešení P0 runtime bugů v refactoru.

**Implementace:** Před refaktorem snapshot test/call graph; extrahovat po jedné
odpovědnosti; veřejné Server Action/DAL/RPC signatures ponechat nebo explicitně
versionovat; žádné fire-and-forget schovat do helperu.

**DB/migration dopad a stop:** nulový. Stop při změně workspace/role semantics,
serializace payloadu nebo SQL query behavior; taková změna patří do vlastního
fix slice.

**Acceptance:** menší modul má jednu odpovědnost, všechny gates procházejí,
critical test matrix zůstává zelená a žádná změna auth/datového kontraktu není
implicitní.

**Validace:** static dependency graph; unit/integration affected behavior;
browser/persistence/authorization/RLS smoke jen pokud se dotčená boundary mění.

**Rollback/delivery:** revert jeden hotspot commit bez zásahu do dat; malé PR,
nikdy `cleanup` PR s runtime/security změnami.

## Slice 12 — Documentation alignment with actual product

**Task/branch:** `docs: align product documentation with runtime evidence` /
`docs/product-reality-alignment`
**Priorita:** P2
**Velikost/riziko:** M / střední
**Závislosti:** po slices 2, 4, 6, 8–11, aby se dokumentace neopírala o stale
intermediate state.

**Cíl a problém:** `README.md`, `docs/architecture.md`, `docs/roadmap.md` a
`docs/commits.md` obsahují historické nebo příliš silné claims o Copilot/live
AI/externích integracích a mohou zaměňovat kód za ověřený workflow.

**Scope:** oddělit vizi, historický audit, implementaci a ověřený důkaz; přidat
source links na checkpoint/evidence; uvést simulation/unavailable a otevřené
role/persistence/RLS mezery.

**Non-goals:** měnit runtime, obnovovat odstraněné funkce, měnit migration
history nebo tvrdit production/pilot readiness.

**Implementace:** Pro každý claim určit owner source (code/test/browser/SQL),
datum a status `verified`/`implemented-not-proven`/`historical`. Aktualizovat
jen konkrétní stale passages a zachovat produktovou vizi jako vizi.

**DB/migration dopad a stop:** nulový; stop při dokumentačním tvrzení bez
ověřitelného zdroje nebo live state, zejména u schema/migration claims.

**Acceptance:** README/architecture/roadmap/commits nepopisují simulaci jako
integraci; odkazy vedou na aktuální checkpoint; pilot-ready claim má všechny
required gates.

**Validace:** static links/grep against routes and symbols; unit/browser/
persistence/authorization/RLS evidence se pouze odkazuje, nevyrábí v docs PR.

**Rollback/delivery:** revert focused docs commit; stage explicit docs only.

## Slice 13 — Generated, screenshot and recovery artifact governance

**Task/branch:** `docs: define generated artifact retention rules` /
`docs/generated-artifact-governance`
**Priorita:** P2
**Velikost/riziko:** S / nízké
**Závislosti:** slice 0; rozhodovací část může běžet paralelně s 1–12.

**Cíl a problém:** Tracked `output/playwright/operator-console-01-ready.png`,
`02-in-call.png` a `03-post-call.png` mohou být důkaz nebo generated residue;
recovery artefakty nesmí být mazány podle vizuálního nepořádku.

**Scope:** pravidlo provenance, owner, datum, test run, privacy/sensitivity,
retence a explicitního review před move/delete; označit, co je evidence versus
generated output.

**Non-goals:** automatické mazání, cleanup worktree, nové screenshots nebo
browser smoke, změna `.gitignore` bez rozhodnutí.

**Implementace:** Každý tracked artefakt nejprve klasifikovat read-only; mazat
nebo přesouvat až po potvrzení účelu, referencí a recoverability. Recovery
stopy zůstávají, pokud dokládají bezpečnostní incident/workflow.

**DB/migration dopad a stop:** nulový; stop při nejasné provenance, GDPR/secret
obsahu, aktivní referenci nebo nemožnosti obnovy.

**Acceptance:** žádný artefakt není odstraněn implicitně; evidence má kontext a
date/commit; generated output je buď retain policy, nebo explicitně excluded.

**Validace:** static references/paths; browser jen pokud se artefakt nově
vytváří; persistence/authorization/RLS nerelevantní.

**Rollback/delivery:** preferovat recoverable move a samostatný docs decision;
bez schválení žádné delete. PR může být samostatný nízkorizikový docs PR.

## Doporučený next slice

Analytics role boundary, CSV escaping i Slice 9 už nejsou neprovedené práce.
Slice 2 zůstává partial/in progress. Doporučený next slice může paralelně běžet
Slice 3: `fix: make business mutations and audit atomic` na větvi
`fix/atomic-business-audit`; tento plán netvrdí jeho dokončení ani PR.

Slice 3 je pouze doporučený next slice; jeho minimální acceptance je atomický
nebo explicitně idempotentní kontrakt business mutace a auditu, včetně testu
selhání auditu, retry/idempotency a SQL read-back. Tento dokument netvrdí jeho
dokončení ani existenci PR.

## Prompt-ready handoff pro aktivní next slice

```text
Countdown CRM — implementuj pouze Slice 2: Workflow truth contract + Operator Console dispatch.

Baseline: začni z aktuálního origin/main a čistého worktree. Založ vlastní task,
větev fix/workflow-truth-dispatch a worktree podle AGENTS.md.

Cíl: action execution musí pravdivě rozlišit success/failure/simulation/unavailable
a úspěšné operator call completion musí použít jeden server-owned dispatcher právě
jednou. Současný symptom je false-success u console-only actions a chybějící
operator dispatch.

Scope: explicitní result model, webhook HTTP/fetch failure semantics, awaitovaná
execution-log persistence, operator completion event path a test-only označení
manual emit. Přidej cílené unit/integration testy včetně duplicate event a log failure.

Non-goals: live telephony, live AI, e-mail/notification provider, nový workflow
DSL, schema/migrace bez explicitního návrhu, demo auth/mock a úpravy PR #6/#7/#8.

Acceptance: žádný falešný success, failed webhook není executed, persistence
failure je viditelné a operator completion vytvoří event právě jednou.

Evidence: static call graph; npm test, npm run check, git diff --check;
unit/integration action matrix; skutečný authenticated browser; persistence po
reload/login; authorization workspace/role a RLS odděleně.

Delivery: explicitně stageuj jen dotčené soubory, recheck status/diff/divergence,
focused commit, push a draft PR podle AGENTS.md. Merge až po review všech
negative authorization výsledků.
```

## Definition of Done celé polish iniciativy

- Všechny slices 1–13 mají samostatný commit/PR nebo jsou explicitně uzavřené
  s důvodem; žádný obří cleanup PR.
- Workflow execution rozlišuje success/failure/simulation/unavailable, log
  persistence je pravdivá a hlavní Operator Console cesta dispatchuje event
  právě jednou.
- Analytics, Blueprint, queue, orders, Product Scripts a training mají
  server-side workspace/role boundary; UI není jediná ochrana.
- Business mutace a audit jsou atomické nebo mají zdokumentovaný idempotentní
  partial-result/recovery kontrakt.
- Blueprint apply je server-authoritative, workspace-scoped, retry-safe a
  ověřený po reloadu/loginu.
- Existuje schválený schema provisioning contract a fresh-schema/policy proof;
  migration history nebyla slepě přepisována ani použita jako neověřený live
  source of truth.
- Test mapa odděluje static, unit/integration, browser, persistence,
  authorization a RLS evidence; všechny mezery mají explicitní stav.
- Proběhl autentizovaný Operator lifecycle a Product Script role-only smoke se
  skutečnou relací, včetně negativních scénářů, reload/login a idempotency.
- Potvrzený legacy training path je odstraněn nebo odůvodněně zachován;
  no-unused nálezy jsou klasifikované.
- CSV export je parser-safe; hotspoty jsou postupně rozdělené bez změny auth/
  datových kontraktů.
- README, architecture, roadmap a commits odpovídají skutečnému runtime a
  evidence statusu.
- Screenshoty/generated/recovery artefakty mají provenance/retention decision;
  nic nebylo automaticky smazáno.
- CI/repo gates mají vysvětlený výsledek a projekt není označen pilot-ready,
  pokud chybí některý required browser/persistence/authorization/RLS důkaz.

## Vědomě mimo tuto iniciativu

- live telephony, skutečný AI copilot, e-mail provider, push notifications a
  jiné externí integrace;
- redesign, brand update, Product Script UI redesign a velký UX rewrite;
- obecný migration-drift/reconciliation projekt, migration repair, `db pull`,
  blind `db push` nebo změna live Supabase bez samostatného rozhodnutí;
- mazání branchí/worktrees, screenshots, recovery nebo generated souborů bez
  explicitní provenance/retention review;
- dependency upgrade jako vedlejší efekt, `npm audit fix --force`, nebo změna
  lockfile bez samostatného security tasku;
- PR #6, #7 a #8 a jejich merge/close/edit;
- produkční readiness deklarovaná pouze buildem, preview nebo UI smoke.

## Pravidlo po každém merge

Po každém merged slice se nejprve ověří `origin/main`, commit, diff, relevantní
tests a důkazní vrstvy. Poté se aktualizují pouze dva autoritativní dokumenty:
checkpoint dostane nový snapshot, změněný evidence status a odkaz na commit/PR;
implementation plan dostane stav slice (`done`, `partial`, `blocked`) a případné
dependency změny. Staré tvrzení se přepíše nebo označí historical — nevytváří se
nový podobný stale handoff. Každá změna dokumentace má vlastní focused diff,
explicitní staging, `git diff --check` a jasný Git/PR stav.
