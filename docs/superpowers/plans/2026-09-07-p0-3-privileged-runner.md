# P0.3 — bezpečný privileged runner pro vzdálené databázové důkazy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Přidat read-only runner pro opakovatelné ověření linked Supabase databázových kontraktů bez rozšíření produkčních oprávnění aplikace.

**Architecture:** Node runner bude používat explicitní project ref a scoped `SUPABASE_ACCESS_TOKEN`. Spustí pouze verzovaný read-only SQL allow-list přes Supabase Management API endpoint `/v1/projects/{ref}/database/query/read-only`, z odpovědi vytvoří sanitizovaný JSON report a při chybě vypíše pouze stabilní bezpečný kód. Docker image bude stejný runner pouze izolovat a nepřevezme žádné secrets při buildu.

**Tech Stack:** Node.js ESM, `fetch`, `node:crypto`, Supabase Management API, Docker, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-07-p0-3-privileged-runner-design.md`

## Global Constraints

- Runner nesmí používat `SUPABASE_SECRET_KEY` ani `SUPABASE_SERVICE_ROLE_KEY`.
- Žádný secret nesmí být v Git, Docker image, `NEXT_PUBLIC_*`, konzoli, reportu, chybové zprávě ani snapshotu.
- Základní režim smí spustit pouze allow-listed read-only SQL.
- Nebude přidána migrace, grant pro `anon`/`authenticated`, veřejné RPC ani Data API exposure schématu `private`.
- Nebude řešeno leaked-password protection ani `rls_enabled_no_policy`.
- Linked testovací zápis se v tomto plánu nespouští; případný write režim zůstane explicitně odmítnutý.
- Každý krok končí vlastním testem a tematickým commitem.

---

### Task 1: Zaveď bezpečný konfigurační kontrakt a čisté pomocné funkce

**Files:**
- Create: `scripts/p0-3-remote-db-evidence-lib.mjs`
- Test: `tests/p0-3-remote-db-evidence.test.ts`

**Interfaces:**
- Produces `readRunnerConfig(env)`, `validateReadOnlySql(sql)`, `buildReadOnlyQueryRequest(options)`, `fingerprint(value)`, `sanitizeDiagnostic(text)` and `makeFailureReport(input)`.
- `readRunnerConfig` vrací pouze bezpečná metadata `{ projectRef }`; credential zůstává pouze v API hlavičce požadavku a nikdy se nevrací.
- `buildReadOnlyQueryRequest` vrací explicitní read-only Management API URL, hlavičky a JSON body.

- [ ] **Step 1: Napiš první failing testy pro chybějící konfiguraci.**

```ts
it("rejects a missing scoped access token without exposing a value", () => {
  expect(() => readRunnerConfig({ P0_3_LINKED_PROJECT_REF: "abcdefghijklmnopqrst" }, paths))
    .toThrow("MISSING_SUPABASE_ACCESS_TOKEN");
});

it("rejects application service credentials", () => {
  expect(() => readRunnerConfig({
    P0_3_LINKED_PROJECT_REF: "abcdefghijklmnopqrst",
    SUPABASE_ACCESS_TOKEN: "scoped-token",
    SUPABASE_SERVICE_ROLE_KEY: "must-not-be-used",
  }, paths)).toThrow("FORBIDDEN_APPLICATION_CREDENTIAL");
});
```

- [ ] **Step 2: Spusť testy a ověř, že selžou kvůli chybějícím funkcím.**

Run: `npm test -- tests/p0-3-remote-db-evidence.test.ts`

Expected: FAIL s chybou, že importované konfigurační funkce neexistují.

- [ ] **Step 3: Implementuj minimální validaci konfigurace.**

Požaduj project ref odpovídající `/^[a-z0-9]{20}$/`, neprázdný
`SUPABASE_ACCESS_TOKEN` a nepřítomnost
`SUPABASE_SECRET_KEY`/`SUPABASE_SERVICE_ROLE_KEY`. Název chyby musí být stabilní
safe code; nesmí obsahovat hodnotu env proměnné.

- [ ] **Step 4: Přidej failing test pro read-only API požadavek.**

```ts
it("accepts only a single read-only select or with query", () => {
  expect(() => validateReadOnlySql("select 1;")).not.toThrow();
  expect(() => validateReadOnlySql("delete from public.workspaces;")).toThrow("NON_READ_ONLY_SQL");
});

it("builds the read-only Management API request", () => {
  expect(buildReadOnlyQueryRequest({
    projectRef: "abcdefghijklmnopqrst",
    token: "scoped-token",
    sql: "select 1;",
  })).toEqual({
    url: "https://api.supabase.com/v1/projects/abcdefghijklmnopqrst/database/query/read-only",
    options: expect.objectContaining({ method: "POST" }),
  });
});
```

- [ ] **Step 5: Spusť testy, ověř očekávané selhání a doplň implementaci.**

Run: `npm test -- tests/p0-3-remote-db-evidence.test.ts`

Expected: nejdřív FAIL na nepřítomných funkcích, potom po implementaci PASS.

- [ ] **Step 6: Přidej testy a implementaci fingerprintu, redakce a failure reportu.**

Fingerprint použije SHA-256 a vrátí pouze prvních 12 hex znaků. `sanitizeDiagnostic`
musí nahradit access tokeny, JWT, `postgresql://` credentialy, `password=...`
a známé `sb_secret_`/`sbp_` hodnoty řetězcem `[REDACTED]`. Failure report smí
obsahovat jen `status`, `failureCode`, `target`, `mode` a fingerprint.

- [ ] **Step 7: Spusť cílené testy a commituj slice.**

Run: `npm test -- tests/p0-3-remote-db-evidence.test.ts`

Expected: PASS; commit:
`git add scripts/p0-3-remote-db-evidence-lib.mjs tests/p0-3-remote-db-evidence.test.ts && git commit -m "test: define p0-3 runner safety contract"`

### Task 2: Přidej read-only SQL allow-list a bezpečné parsování výsledku

**Files:**
- Create: `scripts/p0-3-remote-db-evidence.sql`
- Modify: `scripts/p0-3-remote-db-evidence-lib.mjs`
- Test: `tests/p0-3-remote-db-evidence.test.ts`

**Interfaces:**
- Produces `parseEvidencePayload(output)` returning only `{ checks: Record<string, boolean> }`.
- SQL returns one JSON object containing booleans for the five public invoker RPC boundaries, five private definer implementations, empty `search_path`, grant restrictions and `pgtap` outside `public`.

- [ ] **Step 1: Napiš failing test pro očekávaný JSON payload a odmítnutí neznámého tvaru.**

```ts
it("parses one safe evidence row", () => {
  expect(parseEvidencePayload("status text\n{" +
    '"rows":[{"evidence":{"public_rpc_boundaries":true,"pgtap_not_public":true}}]}' +
    "\n")).toEqual({ checks: { public_rpc_boundaries: true, pgtap_not_public: true } });
});

it("rejects a payload with arbitrary database rows", () => {
  expect(() => parseEvidencePayload('{"rows":[{"email":"person@example.test"}]}'))
    .toThrow("INVALID_EVIDENCE_PAYLOAD");
});
```

- [ ] **Step 2: Spusť test a ověř RED.**

Run: `npm test -- tests/p0-3-remote-db-evidence.test.ts`

Expected: FAIL, protože parser ještě neexistuje.

- [ ] **Step 3: Implementuj parser s allow-listem klíčů.**

Extrahuj pouze JSON pole z read-only API odpovědi, vyžaduj právě jeden řádek,
objekt `evidence` a booleovské hodnoty pod známými check keys. Ignoruj a nikdy
nepropaguj jiné databázové hodnoty.

- [ ] **Step 4: Vytvoř SQL dotaz bez zápisových klíčových slov.**

Použij katalogy `pg_proc`, `pg_namespace`, `pg_extension` a `aclexplode`.
Dotaz smí vrátit pouze booleany/počty nutné k vyhodnocení kontraktu. Nesmí
číst zákaznické řádky, Auth metadata, e-maily, telephony payloady ani secrets.

- [ ] **Step 5: Ověř SQL allow-list proti souboru.**

Run: `node -e "import('./scripts/p0-3-remote-db-evidence-lib.mjs').then(async ({validateReadOnlySql}) => validateReadOnlySql(await (await import('node:fs/promises')).readFile('scripts/p0-3-remote-db-evidence.sql','utf8')))"`

Expected: process exit 0 and no output containing SQL payload.

- [ ] **Step 6: Spusť testy a commituj slice.**

Run: `npm test -- tests/p0-3-remote-db-evidence.test.ts`

Expected: PASS; commit:
`git add scripts/p0-3-remote-db-evidence.sql scripts/p0-3-remote-db-evidence-lib.mjs tests/p0-3-remote-db-evidence.test.ts && git commit -m "feat: add p0-3 linked evidence query"`

### Task 3: Zaveď runner s bezpečným read-only API požadavkem a JSON reportem

**Files:**
- Create: `scripts/p0-3-remote-db-evidence.mjs`
- Modify: `scripts/p0-3-remote-db-evidence-lib.mjs`
- Test: `tests/p0-3-remote-db-evidence.test.ts`

**Interfaces:**
- Node entrypoint: `node scripts/p0-3-remote-db-evidence.mjs`.
- Default mode is read-only and requires `P0_3_LINKED_PROJECT_REF` plus
  `SUPABASE_ACCESS_TOKEN`.
- It invokes only the checked-in SQL file and prints a sanitized JSON report.
- It exits `0` only when every allow-listed check is true; otherwise exits `1`.

- [ ] **Step 1: Napiš failing test pro default read-only orchestration.**

Testuj přes dependency injection HTTP požadavku, že scoped token je pouze v
Authorization hlavičce, ale výstup ani report ho neobsahují. Ověř také, že
`--allow-linked-test-writes` bez přesného potvrzení skončí před API voláním.

- [ ] **Step 2: Spusť cílený test a ověř RED.**

Run: `npm test -- tests/p0-3-remote-db-evidence.test.ts`

Expected: FAIL na chybějícím `runLinkedEvidence`/entrypoint orchestration.

- [ ] **Step 3: Implementuj runner.**

Načti env bez logování hodnot, načti a validuj SQL, zavolej pouze read-only
Management API endpoint, zpracuj JSON a vyrob report. Při HTTP chybě vrať pouze
`API_QUERY_FAILED`. Při parseru nebo validaci vrať stabilní safe code. Raw API
odpověď ani diagnostiku nikdy nepředej do chyby ani reportu.

- [ ] **Step 4: Přidej testy pro API error, invalid JSON a všechny false checks.**

Každý scénář musí ověřit `exitCode === 1`, stabilní `failureCode` a absenci
řetězců reprezentujících token, URL credentialu nebo raw API výstup.

- [ ] **Step 5: Spusť cílené testy a lokální bezpečný preflight.**

Run: `npm test -- tests/p0-3-remote-db-evidence.test.ts`

Expected: PASS.

Run: `$env:P0_3_LINKED_PROJECT_REF='abcdefghijklmnopqrst'; Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue; node scripts/p0-3-remote-db-evidence.mjs`

Expected: exit `1`, JSON failure code `MISSING_SUPABASE_ACCESS_TOKEN`, bez
výpisu project refu nebo secretu.

- [ ] **Step 6: Přidej npm script a commituj slice.**

Modify `package.json` script:
`"verify:linked-security": "node scripts/p0-3-remote-db-evidence.mjs"`.

Run: `npm test -- tests/p0-3-remote-db-evidence.test.ts`

Expected: PASS; commit:
`git add scripts/p0-3-remote-db-evidence.mjs scripts/p0-3-remote-db-evidence-lib.mjs tests/p0-3-remote-db-evidence.test.ts package.json && git commit -m "feat: add safe linked security runner"`

### Task 4: Přidej Docker runtime bez secretů v image

**Files:**
- Create: `docker/p0-3-runner/Dockerfile`
- Create: `docker/p0-3-runner/README.md`
- Test: `tests/p0-3-remote-db-evidence.test.ts`

**Interfaces:**
- Build command: `docker build -f docker/p0-3-runner/Dockerfile -t countdown-crm-p0-3-runner .`
- Run command passes `P0_3_LINKED_PROJECT_REF` and `SUPABASE_ACCESS_TOKEN` only at runtime.

- [ ] **Step 1: Napiš test, že Dockerfile nekopíruje env soubory ani secret values.**

Ověř, že Dockerfile používá pinned Node image a neobsahuje `COPY .env`,
`ARG SUPABASE`, `ENV SUPABASE_ACCESS_TOKEN` ani service-role key.

- [ ] **Step 2: Spusť test a ověř RED, pokud Dockerfile neexistuje.**

Run: `npm test -- tests/p0-3-remote-db-evidence.test.ts`

Expected: FAIL pouze na chybějícím Dockerfile.

- [ ] **Step 3: Vytvoř minimální Dockerfile.**

Použij Node 22 slim image a zkopíruj pouze runner library, runner entrypoint a
SQL allow-list.
Nespouštěj `npm install` s secrets a nastav entrypoint na runner.

- [ ] **Step 4: Přidej README s bezpečným runtime příkladem.**

Dokumentuj, že token je vložen přes secret manager nebo runtime env, nikdy přes
Dockerfile/build arg, a že výchozí režim nemá linked zápisy.

- [ ] **Step 5: Ověř Dockerfile testem a pokud je Docker dostupný, proveď build.**

Run: `npm test -- tests/p0-3-remote-db-evidence.test.ts`

Optional run: `docker build -f docker/p0-3-runner/Dockerfile -t countdown-crm-p0-3-runner .`

Expected: test PASS; build PASS nebo explicitně zdokumentovaná nedostupnost
Docker engine bez vydávání lokálního testu za linked důkaz.

- [ ] **Step 6: Commituj slice.**

`git add docker/p0-3-runner && git commit -m "build: package p0-3 runner in docker"`

### Task 5: Doplň provozní dokumentaci a bezpečné env názvy

**Files:**
- Create: `docs/P0_3_REMOTE_DB_RUNNER.md`
- Modify: `.env.example`
- Modify: `docs/README.md`
- Modify: `PROJECT.md`
- Modify: `docs/AKTUALNI_STAV_A_DESATERO.md`
- Test: `tests/p0-3-remote-db-evidence.test.ts`

**Interfaces:**
- Documentation gives exact local, linked-sandbox and production distinction.
- `.env.example` contains names/comments only, never real secrets.
- P0.3 remains open until a real sanitized linked run report exists.

- [ ] **Step 1: Napiš failing documentation tests.**

Ověř, že docs mention `SUPABASE_ACCESS_TOKEN`, `P0_3_LINKED_PROJECT_REF`,
read-only default, no production, no service-role key, Docker runtime injection,
and that local pgTAP is not linked evidence.

- [ ] **Step 2: Spusť testy a ověř RED.**

Run: `npm test -- tests/p0-3-remote-db-evidence.test.ts`

Expected: FAIL na chybějícím operational guide nebo env entries.

- [ ] **Step 3: Napiš operational guide.**

Uveď bezpečný preflight, read-only command, expected sanitized report shape,
failure meanings, credential provisioning mimo repo a výslovný zákaz produkčního
project refu. Uveď také, co runner nedokazuje.

- [ ] **Step 4: Aktualizuj env example a aktivní indexy.**

Přidej pouze komentované názvy `P0_3_LINKED_PROJECT_REF` a
`SUPABASE_ACCESS_TOKEN`; nepřidávej token, URL ani password. Aktualizuj stavový
dokument tak, aby P0.3 popisoval skutečný rozsah a zůstal oddělený od P0.4.

- [ ] **Step 5: Spusť docs testy a commituj slice.**

Run: `npm test -- tests/p0-3-remote-db-evidence.test.ts`

Expected: PASS; commit:
`git add docs/P0_3_REMOTE_DB_RUNNER.md .env.example docs/README.md PROJECT.md docs/AKTUALNI_STAV_A_DESATERO.md tests/p0-3-remote-db-evidence.test.ts && git commit -m "docs: document p0-3 linked runner"`

### Task 6: Proveď první skutečný linked read-only běh

**Files:**
- Create: `docs/superpowers/reports/2026-09-07-p0-3-linked-run.md`

**Interfaces:**
- Report contains exact sanitized runner JSON and command metadata without any
  token, URL credential, Auth email, password or raw API diagnostic.
- No migration, `db push`, `db reset`, `db diff` write path or test fixture write
  is used in this task.

- [ ] **Step 1: Ověř, že credential je vložený mimo repozitář.**

Check only boolean presence of `SUPABASE_ACCESS_TOKEN` and project ref. Never
print values. If scoped token is absent, stop and report the precise blocker;
do not fall back to an app service key or any other broader credential.

- [ ] **Step 2: Spusť read-only runner.**

Run: `npm run verify:linked-security`

Expected: exit `0` and sanitized JSON with all checks true. If it fails, save
only the safe failure code and stop; do not rerun with a broader credential.

- [ ] **Step 3: Zkontroluj report proti secret-safety testu.**

Run: `rg -n "sbp_|sb_secret_|eyJ|postgresql://|password=|@.*:" docs/superpowers/reports/2026-09-07-p0-3-linked-run.md`

Expected: no matches. If a match exists, delete the report before committing,
fix sanitizer and rerun locally; never copy raw API output into the report.

- [ ] **Step 4: Commituj pouze report.**

`git add docs/superpowers/reports/2026-09-07-p0-3-linked-run.md && git commit -m "docs: record first p0-3 linked evidence"`

### Task 7: Spusť úplné ověření a připrav review

**Files:**
- Modify only files needed to fix verification failures.

- [ ] **Step 1: Zkontroluj scope a diff.**

Run: `git status --short --branch`, `git diff --check`, `git diff --stat`,
`git diff --name-only main...HEAD`.

Expected: pouze P0.3 runner, testy, Docker a dokumentace; žádné UI, migrace,
Auth hardening, `rls_enabled_no_policy` nebo P1/P0.4 soubory.

- [ ] **Step 2: Spusť kompletní aplikační kontroly.**

Run: `npm test`

Expected: all existing tests plus runner tests pass.

Run: `npm run lint`

Expected: exit `0`.

Run: `npm run typecheck`

Expected: exit `0`.

Run: `npm run build`

Expected: exit `0`.

- [ ] **Step 3: Zkontroluj tajné hodnoty v celém diffu.**

Run: `git diff main...HEAD -- . ':!package-lock.json' | rg -n "sbp_|sb_secret_|eyJ|postgresql://|password=|SUPABASE_SECRET_KEY=.*[^_]"`

Expected: no real secret values; allowed matches are variable names and safe
documentation placeholders only.

- [ ] **Step 4: Proveď code review diffu.**

Review the complete `main...HEAD` diff against the spec and all ten P0.3
acceptance criteria. Critical/important findings must be fixed and retested.

- [ ] **Step 5: Aktualizuj stav pouze podle důkazů.**

P0.3 lze označit jako dokončené jen pokud existuje skutečný linked report,
scoped identity je doložená provozním setupem, všechny lokální kontroly prošly
a diff neobsahuje secrets ani scope creep. Jinak dokumentace explicitně uvede
blokující stav.
