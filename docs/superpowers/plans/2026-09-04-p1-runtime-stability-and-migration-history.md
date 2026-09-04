# P1 Runtime Stability a Migration History — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox ( - [ ] ) syntax for tracking.

**Goal:** Prokázat a stabilizovat běh Countdown CRM v autentizovaném linked Supabase prostředí, zachovat dostupná data při dílčím selhání Calendar/Wallet a srovnat migration history bez neověřených nebo destruktivních zásahů.

**Architecture:** Zachováme stávající serverové DAL a workspace/role guardy. Calendar a Wallet dostanou oddělené načítání zdrojů s typovaným stavem "available", "unavailable" nebo "not_applicable", takže chyba jedné podpůrné datové části neschová funkční data z ostatních částí. Migration history se nejdříve pouze porovná; oprava historie nebo nová forward migrace proběhne jen po důkazu, že cílové schéma odpovídá zamýšlenému stavu.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase PostgreSQL/Auth/RLS, Server Actions, Vitest, ESLint, TypeScript compiler, Supabase CLI.

**Spec:** docs/AKTUALNI_STAV_A_DESATERO.md — části "P1 — bezpečnost a pilotní důkaz" a "P1 — runtime stabilita před pilotem"; doplňující kontext: PROJECT.md, docs/DEVELOPMENT_WORKFLOW.md a Review.md.

## Global Constraints

- Databáze a server musí vynutit workspace a roli. Skrytí tlačítka, přímá URL ani znalost UUID nejsou bezpečnostní hranice.
- UI stav není důkaz persistence; kritické zápisy ověřujeme po reloadu a v databázi.
- U migrace ověř cílové schéma, RLS a migration history.
- supabase/schema.sql je historický snapshot; zdrojem databázových změn jsou verzované migrace a ověření konkrétního cílového prostředí.
- Build a unit test nejsou důkaz persistence, RLS, concurrency ani live provideru.
- NEXT_PUBLIC_ALLOW_DEMO_AUTH=true zůstává pouze pro lokální vývoj; autentizovaný důkaz používá skutečný Auth účet a konkrétní workspace.
- Kritické mutace zůstávají v serverové DAL, Server Actions nebo RPC.
- Chybějící zdroj nesmí být prezentován jako prázdná množina nebo nulová hodnota bez pravdivého označení unavailable.
- supabase migration repair mění pouze tracking history, nikoli schéma; použije se jen po kontrole, že schéma už odpovídá dané migraci.
- Stávající necommitnuté změny v PROJECT.md, docs/AKTUALNI_STAV_A_DESATERO.md a Review.md patří uživateli; implementace je nesmí přepsat ani zahrnout do commitů bez výslovného důvodu.

---

## Scope tohoto plánu

Tento plán řeší pouze první aktuální prioritu: P1 runtime stabilitu, migration history, Calendar/Wallet partial failure a autentizovaný persistence důkaz. Neimplementuje post-call wrap-up, Conversation Brief, Team Leader Exception Queue, role-aware domovské plochy, Telnyx pilot ani Gemini. Workspace Readiness UI vznikne až v navazující prioritě; tato fáze připraví pouze spolehlivé diagnostické podklady.

## Mapa souborů

- src/lib/dal/calendar.ts — načtení callbacků a osobních reminders; nově stav jednotlivých zdrojů.
- src/app/actions/calendar.ts — serverová hranice pro nový CalendarLoadResult.
- src/app/calendar/page.tsx — celková chyba kontextu versus částečná nedostupnost dat.
- src/components/calendar/OperatorCalendar.tsx — dostupné položky, warning zdroje a refresh.
- src/lib/dal/wallet.ts — nezávislé načtení Wallet sekcí.
- src/app/wallet/page.tsx — odlišení empty od unavailable.
- src/components/wallet/WalletManagerPanel.tsx — manager-only controls; upravit jen pokud je nutné předat stav sekcí.
- tests/calendar-runtime.test.ts — partial-load kontrakty Calendaru.
- tests/wallet-runtime.test.ts — partial-load kontrakty Walletu.
- tests/wallet-contract.test.ts — existující Wallet security/UI testy.
- supabase/migrations/ — nová forward migrace pouze při konkrétním prokázaném driftu.
- docs/superpowers/reports/2026-09-04-p1-runtime-stability-verification.md — auditovatelný výsledek ověření.
- supabase/schema.sql — v této fázi se neupravuje jako zdroj pravdy.

### Task 1: Zachytit výchozí stav a oddělit lokální, demo a linked prostředí

**Files:**
- Create: docs/superpowers/reports/2026-09-04-p1-runtime-stability-verification.md
- Read only: PROJECT.md, docs/AKTUALNI_STAV_A_DESATERO.md, docs/DEVELOPMENT_WORKFLOW.md, .env.example, .env.local
- Test: repository verification commands

**Interfaces:**
- Report obsahuje sekce Repository, Supabase target, Migration history, Runtime smoke, Persistence, Negative matrix a Blockers.
- Report neobsahuje credentials, passwords, private keys ani celé osobní telefonní číslo.
- Demo auth, lokální Supabase, linked Supabase a autentizovaný target workspace jsou evidované odděleně.

- [ ] **Step 1: Zkontrolovat stav repozitáře bez změny uživatelské práce.**

Run:

```powershell
git status --short
git branch --show-current
git log -8 --oneline
Get-ChildItem supabase\migrations -File | Sort-Object Name | Select-Object -ExpandProperty Name
```

Expected: report obsahuje větev, baseline commit, seznam lokálních migrací a existující uživatelské změny. Není nic stageováno.

- [ ] **Step 2: Spustit repository baseline.**

Run each command separately:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Expected: report uvádí exit code a skutečný počet testů. Zelený baseline není důkaz runtime persistence.

- [ ] **Step 3: Ověřit dostupnost CLI a linku.**

Run:

```powershell
supabase --version
supabase status
```

Expected: report uvádí, zda je dostupný Supabase CLI, lokální projekt a linked target. Pokud CLI nebo target chybí, označ runtime/migration ověření jako blocked a zastav se před remote mutací; nepoužívej demo auth jako náhradu.

- [ ] **Step 4: Zapsat baseline report a samostatně ho commitnout.**

Použij pozorovaný stav:

```markdown
## Repository
- Branch:
- Baseline commit:
- Local migration files:
- Existing user changes preserved:

## Supabase target
- CLI available:
- Linked project available:
- Auth mode used for evidence: real Auth / blocked
- Demo auth used for evidence: no
```

Commit:

```powershell
git add docs/superpowers/reports/2026-09-04-p1-runtime-stability-verification.md
git commit -m "docs: capture p1 runtime baseline"
```

Expected: commit obsahuje pouze report; uživatelské změny zůstanou mimo něj.

### Task 2: Porovnat a bezpečně srovnat migration history

**Files:**
- Modify: docs/superpowers/reports/2026-09-04-p1-runtime-stability-verification.md
- Create: jedna nová timestampovaná forward migrace v supabase/migrations/ pouze při prokázaném schema driftu
- Do not modify: supabase/schema.sql
- Test: Supabase CLI migration/schema comparison

**Interfaces:**
- Report obsahuje pro každou lokální/remote verzi klasifikaci same, local-only, remote-only, schema-drift nebo blocked.
- History-only mismatch se opravuje tracking operací; schema mismatch forward migrací nebo blockerem.
- Žádná verze se neoznačí jako applied jen kvůli názvu souboru.

- [ ] **Step 1: Vypsat local/linked history.**

Run:

```powershell
supabase migration list --linked
```

Expected: výpis local/remote verzí je zapsaný v reportu. Oficiální popis příkazu je v Supabase CLI reference: https://supabase.com/docs/reference/cli/su

- [ ] **Step 2: Klasifikovat rozdíly před jakoukoli opravou.**

Použij tuto rozhodovací tabulku:

| Stav | Akce |
|---|---|
| Local a remote verze se shodují | Pokračovat kontrolou target schématu |
| Remote history chybí, ale schéma přesně obsahuje změnu | Ověřit objekty, constrainty, grants a RLS; teprve potom repair jako applied |
| Remote history obsahuje verzi bez lokálního souboru | Získat schema/migration evidence, reviewovat ji a nevymýšlet původní SQL |
| Local verze čeká a schéma změnu nemá | Zkontrolovat dry-run a aplikovat až po schváleném targetu |
| History říká applied, ale objekt v targetu chybí | Stop a blocker; neoznačovat znovu jako applied |
| Target má objekty bez odpovídající migrace | Zachytit diff a připravit jedinou reviewed forward migraci |

- [ ] **Step 3: Zkontrolovat schema drift bez aplikování změn.**

Run:

```powershell
supabase db push --linked --dry-run
supabase db diff --linked --schema public
```

Expected: report určí, zda Calendar/Wallet problém souvisí s tabulkou, sloupcem, RPC, grantem nebo RLS. supabase db push se v tomto kroku nespouští bez dry-run review.

- [ ] **Step 4: Opravit history pouze při prokázaném history-only mismatch.**

Pro konkrétní verzi z předchozího reportu nastav P1_MIGRATION_VERSION na přesně pozorovanou hodnotu a spusť:

```powershell
supabase migration repair $env:P1_MIGRATION_VERSION --status applied --linked
supabase migration list --linked
```

Expected: změněn je pouze tracking záznam; report obsahuje důkaz, že target schéma už mělo všechny tabulky, funkce, constrainty, grants a RLS dané migrace.

- [ ] **Step 5: Při schema driftu vytvořit jednu forward migraci.**

Nová migrace smí obsahovat pouze konkrétní chybějící forward změnu. Musí uvádět workspace scope, RLS chování a dotčené objekty. Staré migrace se nepřepisují a generated dump se nepřidává do supabase/schema.sql.

- [ ] **Step 6: Otestovat migraci před linked push.**

Pokud je nakonfigurovaný lokální Supabase:

```powershell
supabase db reset
supabase test db
```

Expected: migrace projdou v pořadí názvů a SQL RLS testy projdou. Bez lokální instance se tato skutečnost zapíše jako omezení; lokální replay se nesmí vydávat za provedený.

- [ ] **Step 7: Commitnout databázové srovnání odděleně od aplikačního kódu.**

```powershell
git add supabase/migrations docs/superpowers/reports/2026-09-04-p1-runtime-stability-verification.md
git commit -m "fix: align p1 database migration history"
```

### Task 3: Zachovat Calendar data při selhání jedné zdrojové části

**Files:**
- Modify: src/lib/dal/calendar.ts
- Modify: src/app/actions/calendar.ts
- Modify: src/app/calendar/page.tsx
- Modify: src/components/calendar/OperatorCalendar.tsx
- Create: tests/calendar-runtime.test.ts

**Interfaces:**

Přidej:

```ts
export type CalendarSourceState =
  | { state: "available" }
  | { state: "unavailable"; message: string };

export interface CalendarLoadResult {
  entries: CalendarEntryDTO[];
  sources: {
    callbacks: CalendarSourceState;
    reminders: CalendarSourceState;
  };
}
```

listOperatorCalendarEntriesForWorkspace a listCalendarEntriesAction vrací Promise<CalendarLoadResult>. Callback-only listScheduledCallbacksAction zůstává beze změny. Authorization/validation chyby zůstávají thrown DataAccessError; pouze nezávislé source/database failure se mapují na partial status.

- [ ] **Step 1: Napsat failing pure composition test.**

Test musí pokrýt callback success + reminder failure:

```ts
const result = buildCalendarLoadResult(
  { status: "fulfilled", value: [callback] },
  { status: "rejected", reason: new DataAccessError("DATABASE", "Operator reminders could not be loaded.") },
);

expect(result.entries).toEqual([expect.objectContaining({ type: "callback" })]);
expect(result.sources.callbacks).toEqual({ state: "available" });
expect(result.sources.reminders).toEqual({
  state: "unavailable",
  message: "Operator reminders could not be loaded.",
});
```

Doplň reminders-only success, obě části failed, sorting a unknown rejection se safe fallbackem.

- [ ] **Step 2: Ověřit, že test nejdřív selže.**

Run: npm test -- tests/calendar-runtime.test.ts

Expected: FAIL, protože helper/result contract zatím neexistuje.

- [ ] **Step 3: Implementovat Promise.allSettled v Calendar DAL.**

Zachovej date-range validaci a workspace guard. Fulfilled zdroje převedou data do stávajícího CalendarEntryDTO; rejected zdroje vytvoří bezpečný unavailable status. Nesmí vzniknout falešný prázdný kalendář a fulfilled entries se vždy zachovají.

- [ ] **Step 4: Upravit Server Action a komponentu.**

OperatorCalendar drží CalendarLoadResult při initial load i refreshi. Zobrazí dostupné položky a kompaktní warning pro konkrétní zdroj. Full-page lock screen zůstává pouze pro celkové selhání auth/workspace kontextu. Reminder mutace zůstávají serverově guardované.

- [ ] **Step 5: Spustit focused Calendar testy a commit.**

Run:

```powershell
npm test -- tests/calendar-runtime.test.ts tests/operator-next-action-ui-contract.test.ts tests/lead-queue-contract.test.ts
npm run lint
npm run typecheck
```

Expected: partial-load testy projdou a callback-only Operator Console contract zůstane stejný.

Commit:

```powershell
git add src/lib/dal/calendar.ts src/app/actions/calendar.ts src/app/calendar/page.tsx src/components/calendar/OperatorCalendar.tsx tests/calendar-runtime.test.ts tests/operator-next-action-ui-contract.test.ts
git commit -m "fix: keep calendar data available on partial failure"
```

### Task 4: Zachovat Wallet overview při selhání jedné závislosti

**Files:**
- Modify: src/lib/dal/wallet.ts
- Modify: src/app/wallet/page.tsx
- Modify: src/components/wallet/WalletManagerPanel.tsx only if required by incomplete manager data
- Create: tests/wallet-runtime.test.ts
- Modify: tests/wallet-contract.test.ts

**Interfaces:**

Přidej:

```ts
export type WalletSectionState =
  | { state: "available" }
  | { state: "unavailable"; message: string }
  | { state: "not_applicable" };

export interface WalletSectionStates {
  settings: WalletSectionState;
  rules: WalletSectionState;
  transactions: WalletSectionState;
  balances: WalletSectionState;
  members: WalletSectionState;
  profiles: WalletSectionState;
}
```

Rozšiř WalletOverviewDTO o sections: WalletSectionStates. getWalletOverview zůstává workspace-scoped a nevrací raw Supabase errors.

- [ ] **Step 1: Napsat failing tests pro partial Wallet load.**

Mockuj existující DAL dependencies a pokryj:

```ts
it("keeps transactions when settings and balances fail", async () => {
  const overview = await getWalletOverview();

  expect(overview.transactions).toHaveLength(1);
  expect(overview.settings).toBeNull();
  expect(overview.sections.settings.state).toBe("unavailable");
  expect(overview.sections.balances.state).toBe("unavailable");
});
```

Doplň profile failure s Unknown user, operator not_applicable pro manager-only části, empty-but-successful ledger a forbidden workspace jako thrown error.

- [ ] **Step 2: Ověřit fail-first.**

Run: npm test -- tests/wallet-runtime.test.ts

Expected: FAIL, protože dnešní Promise.all shodí celé overview a neexistují section states.

- [ ] **Step 3: Implementovat nezávislé načtení Wallet sekcí.**

Použij Promise.allSettled pro settings, rules, transactions, balances a members. Profiles jsou závislé na úspěšně načtených IDs; při profile failure zachovej řádky a použij Unknown user. Failed balances nesmí být označené jako available zero.

- [ ] **Step 4: Odlišit empty od unavailable v page.**

wallet/page.tsx používá full-page error pouze pro celkový auth/workspace failure. Failed transactions, balances nebo manager settings mají vlastní warning. No wallet transactions yet se zobrazí pouze při úspěšném dotazu s nulovým počtem. Write actions zůstávají role-guarded.

- [ ] **Step 5: Spustit focused Wallet testy a commit.**

Run:

```powershell
npm test -- tests/wallet-runtime.test.ts tests/wallet-contract.test.ts tests/analytics-actions.test.ts
npm run lint
npm run typecheck
```

Expected: partial data, operator/manager role boundaries a existing security contracts projdou.

```powershell
git add src/lib/dal/wallet.ts src/app/wallet/page.tsx src/components/wallet/WalletManagerPanel.tsx tests/wallet-runtime.test.ts tests/wallet-contract.test.ts
git commit -m "fix: preserve wallet sections on partial failure"
```

### Task 5: Provést autentizovaný runtime smoke test a persistence read-back

**Files:**
- Modify: docs/superpowers/reports/2026-09-04-p1-runtime-stability-verification.md
- Modify: docs/AKTUALNI_STAV_A_DESATERO.md only after evidence
- Modify: PROJECT.md only if verified canonical status changed
- Read/execute: scripts/provision-test-team-leader.mjs

**Interfaces:**
- Report dokládá real Auth user, workspace, role a cleanup.
- Prokazuje call → outcome/order → reload → database read-back.
- Negative matrix pokrývá wrong role, cross-workspace a unavailable dependency.
- Demo auth a live Telnyx zůstávají vypnuté.

- [ ] **Step 1: Provisionovat disposable Team Leader účet.**

Nastav již dokumentované TEST_TEAM_LEADER_* variables v bezpečném lokálním environmentu a spusť:

```powershell
npm run provision:test-team-leader
```

Expected: script vrátí Auth user a team_leader membership. Pokud účet už existuje, nevytvářej druhý; bezpečně zapiš důvod blockeru.

- [ ] **Step 2: Přihlásit se bez demo auth a ověřit workspace/role.**

Otevři /workspace, /calendar, /wallet a /team jako skutečný Team Leader. Ověř, že direct URL ani supplied workspace ID neumožní cizí workspace a že operator-only mutace zůstávají zakázané.

- [ ] **Step 3: Ověřit runtime surfaces.**

Zapiš do reportu, zda je každý surface skutečně dostupný, explicitně unavailable, nebo blokovaný. Zvlášť ověř, že chyba reminders, wallet settings nebo balances neschová funkční nezávislá data.

- [ ] **Step 4: Projít existující call → outcome/order tok s reálným operátorem.**

Použij podporovaný fallback/simulation path, protože live Telnyx patří do pozdější priority. Proveď claim, start, end, outcome a případně order. Úspěch ber jako potvrzený až po serverové odpovědi a následujícím read-backu.

- [ ] **Step 5: Reload a ověřit databázový stav.**

V linked targetu ověř v lead_queue_items, calls, orders a příslušných auditních tabulkách workspace, lead, operator, status, outcome, duration, notes a očekávané counts. Po reloadu musí zůstat stejný stav; opakovaný submit/reload nesmí vytvořit duplicate call, outcome ani order.

- [ ] **Step 6: Spustit negative matrix.**

Ověř unauthenticated request, wrong-role mutation, cross-workspace read, unavailable dependency, successful empty query a zákaz demo auth. Každý výsledek uveď jako pass/fail/blocked, ne jako předpoklad.

- [ ] **Step 7: Provedení cleanup a evidence.**

Po dokončení evidence spusť:

```powershell
npm run provision:test-team-leader -- --cleanup --delete-auth-user --confirm-cleanup
```

Expected: membership i Auth user jsou odstraněné nebo report obsahuje konkrétní cleanup blocker.

### Task 6: Full verification, diff review a předání

**Files:**
- Review: všechny změny Tasks 1–5
- Modify: docs/superpowers/reports/2026-09-04-p1-runtime-stability-verification.md
- Do not modify: nesouvisející user changes a budoucí feature files
- Test: full repository and database verification

**Interfaces:**
- Report conclusion je právě verified, partially verified nebo blocked.
- Diff neobsahuje secrets, speculative migrations ani falešné pilot-ready claims.
- Další priorita je uvedena jako post-call wrap-up.

- [ ] **Step 1: Zkontrolovat diff a scope.**

Run:

```powershell
git status --short
git diff --stat
git diff --check
git diff --name-only
```

Expected: změny odpovídají plánovaným reportům, tests, Calendar/Wallet resilience a případné prokázané forward migraci.

- [ ] **Step 2: Zkontrolovat únik secrets a misleading copy.**

Run:

```powershell
rg -n -S "SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|TELNYX_API_KEY|TELNYX_PUBLIC_KEY|TEST_TEAM_LEADER_PASSWORD|NEXT_PUBLIC_ALLOW_DEMO_AUTH=true" src tests scripts docs supabase
```

Expected: výsledky jsou pouze názvy proměnných, bezpečné příklady nebo existující guard dokumentace; žádná hodnota credentialu se nedostane do reportu, testu, browser response ani logu.

- [ ] **Step 3: Spustit kompletní automatické ověření.**

Run each command separately:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Pokud existuje lokální Supabase:

```powershell
supabase test db
supabase migration list --linked
```

Expected: report obsahuje skutečné exit codes/counts a odděluje repository checks od linked runtime/database proof.

- [ ] **Step 4: Uzavřít report a status dokumentaci podle důkazu.**

Použij:

```markdown
## Conclusion
- Runtime code checks: verified / blocked
- Migration history: verified / partially verified / blocked
- Calendar partial failure: verified / blocked
- Wallet partial failure: verified / blocked
- Authenticated persistence read-back: verified / blocked
- Overall P1 status: verified / partially verified / blocked
- Remaining blocker:
- Next priority: post-call wrap-up
```

Pilot-ready se neprohlašuje, dokud nejsou splněná všechna kritéria v docs/AKTUALNI_STAV_A_DESATERO.md; live Telnyx je záměrně mimo tento plán.

- [ ] **Step 5: Commitnout pouze finální P1 report.**

```powershell
git add docs/superpowers/reports/2026-09-04-p1-runtime-stability-verification.md
git commit -m "docs: close p1 runtime stability review"
```

## Self-Review

### Spec coverage

- P1 runtime stability: Tasks 1, 3, 4, 5 a 6.
- Migration history a bezpečný repair: Task 2.
- Calendar data-layer, missing migration a partial failure: Tasks 1–3.
- Wallet data-layer, missing migration a partial failure: Tasks 1, 2, 4.
- Authenticated call → outcome/order → reload → database read-back: Task 5.
- Role/cross-workspace negative cases: Tasks 2, 5 a 6.
- RLS, target schema a migration evidence jsou před každou remote změnou.
- Post-call, Conversation Brief, Exception Queue, role-aware plochy, Telnyx a Gemini zůstávají mimo scope.

### Placeholder scan

- Plan nepoužívá zakázané zástupné značky ani formulaci "write tests for the above".
- Target-specific údaje se získávají z pozorovaného linked prostředí nebo stávajících env variables; nevymýšlejí se ani necommitují.
- Forward migration vzniká pouze při konkrétně prokázaném schema driftu.

### Type consistency

- Calendar consumers používají CalendarLoadResult; callback-only action zůstává beze změny.
- Wallet consumers používají WalletOverviewDTO.sections; stávající data fields zůstávají zachované.
- available, unavailable a not_applicable jsou explicitní stavy a nejsou nahrazené prázdnými arrays.
- Authorization errors zůstávají thrown DataAccessError; partial status se používá jen pro independent source/database failures.
