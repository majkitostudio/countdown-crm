# Countdown CRM — Implementační plán Commitu 6

**Status:** návrh ke schválení  
**Datum návrhu:** 2026-08-10  
**Navazující commit:** `5131217 feat: scope business data to workspaces`

## 1. Cíl

Commit 6 má vytvořit důvěryhodnou datovou a autorizační hranici mezi uživatelem,
workspace a Supabase. Po jeho dokončení nesmí citlivá business operace spoléhat
pouze na klientský kód, URL, lokální stav nebo obecné pravidlo
`authenticated = full access`.

Hlavní výsledek:

> Každý serverový zápis a každý serverový business dotaz musí mít ověřeného
> uživatele, ověřený workspace a oprávnění odpovídající roli.

Commit je infrastruktura a bezpečnostní refaktor. Nepřidává novou produktovou
funkci ani redesign UI.

## 2. Výchozí stav

Commit 5 přidal `workspace_id` do business tabulek, bootstrap organizaci
`countdown`, workspace `main`, foreign keys a indexy. Sloupce jsou zatím
nullable, protože současné služby ještě nepředávají workspace kontext při
každém zápisu.

Současně stále existují tato omezení:

- některé služby používají browser Supabase klienta přímo,
- některé služby obsahují `as any`,
- business RLS politiky jsou stále příliš široké,
- aplikace nemá jednotný serverový resolver aktivního workspace,
- role Administrator, Team Leader a Operator nejsou konzistentně vynucovány v databázi,
- lokální demo režim nesmí být zaměněn za produkční authorization mechanismus.

## 3. Navržený rozsah implementace

### 3.1 Serverový workspace context

Rozšířit serverovou auth vrstvu o jednotný resolver aktuálního workspace.
Resolver bude:

- fungovat pouze na serveru,
- nejprve ověřovat autentizovaného uživatele,
- načítat membership z `workspace_members`,
- vracet pouze bezpečný minimální DTO kontrakt,
- odmítat chybějící, neplatný nebo uživateli nepřístupný workspace,
- rozlišovat skutečný auth režim od explicitního lokálního demo režimu.

Aktivní workspace nesmí být považován za bezpečný jen proto, že přišel z
klientského query parametru, localStorage nebo nekontrolované cookie.

Pro MVP lze použít jeden explicitní výchozí workspace, ale jeho existence a
přístup uživatele k němu musí být ověřeny serverem.

### 3.2 Datová access layer

Vytvořit tenkou server-only DAL vrstvu pro nejdůležitější operace. V první
etapě pokryje minimálně:

- leads,
- products,
- calls,
- orders,
- custom objects a record entities,
- workflows a workflow executions,
- audit logs.

DAL bude zajišťovat:

- `import "server-only"`,
- auth check před databázovým dotazem,
- workspace check před čtením i zápisem,
- explicitní `.eq("workspace_id", workspaceId)` nebo ekvivalentní bezpečný
  dotaz,
- bezpečné DTO návraty namísto předávání celých databázových řádků do klienta,
- rozlišení `not authenticated`, `not a member`, `forbidden`, `not found` a
  databázové chyby,
- žádné automatické nahrazení databázové chyby mock daty.

Browser klient může zůstat pro čisté session/auth operace, ale citlivé
business zápisy a role-sensitive operace musí projít serverovou hranicí.

### 3.3 Role a oprávnění

Definovat minimální role matrix pro MVP:

| Operace | Operator | Team Leader | Administrator |
|---|---:|---:|---:|
| číst lead directory a spravovat leady | ne | ano | ano |
| používat Operator Console s routingem přiděleným zákazníkem | implementovaný serverový assignment/routing slice; externí telephony provider zbývá | ano | ano |
| upravovat katalog a objection data | ne | ano | ano |
| spravovat workflows | ne | ano | ano |
| spravovat workspace members | ne | ne | ano |
| měnit workspace/organizaci | ne | ne | ano |
| číst Team Leader Review a audit log | ne | ano | ano |

Termín agent je vyhrazený pro AI a agentic runtime; není to role lidského
workspace člena.

Finální business rozhodnutí u audit logu a katalogu musí být potvrzeno při
implementaci, pokud existující UI vyžaduje jiný rozsah. Nesmí se však vrátit
globální `authenticated` přístup bez role kontroly.

### 3.4 RLS cutover

Po zavedení DAL a ověření query přepnout business RLS z obecných politik na
workspace-aware politiky:

- `SELECT` pouze pro členy daného workspace,
- `INSERT` pouze tehdy, když `workspace_id` odpovídá workspace, ke kterému má
  uživatel oprávnění,
- `UPDATE` a `DELETE` podle role,
- `workspace_id` nesmí být běžným uživatelem změněno na cizí workspace,
- child entity nesmí být zapsána do workspace, který neodpovídá parent entitě.

RLS policy musí používat bezpečné helper funkce s kontrolovaným
`search_path`. Nesmí se spoléhat na hodnotu z klienta bez membership kontroly.

### 3.5 Přechod nullable → NOT NULL

V tomto commitu nejprve upravit všechny produkční zápisy tak, aby workspace ID
skutečně předávaly. Poté ověřit, že v databázi nezůstaly business řádky bez
workspace. Teprve následně lze v samostatné migraci nebo v bezpečné druhé fázi
tohoto commitu změnit sloupce na `NOT NULL`.

Pokud by rozsah byl příliš velký pro jeden bezpečný commit, `NOT NULL` a finální
RLS cutover se oddělí do Commitu 6B. Nesmíme ponechat falešný pocit izolace jen
proto, že sloupec existuje.

## 4. Pravděpodobně dotčené soubory a vrstvy

### Auth a serverové hranice

- `src/lib/auth/server.ts`
- `src/lib/auth/workspace.ts`
- `src/lib/auth/config.ts`
- `src/app/actions/*`
- případné nové `src/lib/server/*` nebo `src/lib/dal/*`

### Supabase služby

- `src/lib/supabase/client.ts`
- `src/lib/supabase/types.ts`
- `src/lib/supabase/leadsService.ts`
- `src/lib/supabase/ordersService.ts`
- `src/lib/supabase/schemaService.ts`
- `src/lib/supabase/workflowService.ts`
- `src/lib/supabase/auditService.ts`
- `src/lib/calls.ts`
- další přímé `.from(...)` přístupy nalezené při auditu

### SQL

- nová navazující migrace v `supabase/migrations/`
- `supabase/schema.sql`

RLS změny budou nejprve zmapovány vůči existujícím tabulkám a foreign keys.
Nebudeme mechanicky přepsávat všechny policies bez ověření, jak aplikace data
čte a zapisuje.

### Dokumentace

- `docs/PRODUCT_STATUS.md`
- tento plán
- případně `docs/architecture.md` a `docs/commits.md`

## 5. Co Commit 6 neřeší

Commit 6 nebude obsahovat:

- redesign Operator Console,
- nové CRM moduly,
- telephony nebo Gemini feature development,
- kompletní odstranění všech `any` v celém repozitáři,
- kompletní odstranění všech mock dat,
- finální multi-tenant onboarding a billing,
- změnu Git historie,
- spuštění migrace na živé databázi bez explicitního přístupu a ověření,
- skrytí lint chyb nebo rozšíření ESLint výjimek.

## 6. Rizika a jejich řízení

### Riziko: lockout uživatelů po RLS cutoveru

Řízení: nejdříve ověřit membership bootstrap, přístup admina a testovacího
uživatele; RLS přepnout až po ověření serverových query.

### Riziko: data bez workspace

Řízení: před `NOT NULL` provést SQL kontrolu pro všechny dotčené tabulky a
nepovažovat nullable sloupec za dokončenou izolaci.

### Riziko: cross-workspace parent/child vztahy

Řízení: kontrolovat nejen vlastní `workspace_id`, ale také parent entity;
nejkritičtější vztahy jsou lead–call, lead/product–order a object–record.

### Riziko: rozbití demo režimu

Řízení: demo režim musí mít jasně definovaný lokální workspace context a nesmí
se propsat do produkčního auth nebo RLS bypassu.

### Riziko: skryté přímé Supabase přístupy

Řízení: před implementací udělat `rg` audit všech `.from(`, `.insert(`,
`.update(`, `.upsert(` a `.delete(` v `src/`; žádný citlivý zápis nesmí zůstat
bez rozhodnutí, proč je jeho umístění bezpečné.

## 7. Akceptační kritéria

Commit 6 bude považován za hotový pouze tehdy, když:

- serverová cesta odmítne nepřihlášeného uživatele,
- uživatel bez membership nedostane data workspace,
- Operator nemůže provést Administrator-only operaci,
- každý podporovaný business zápis nese workspace context,
- dotazy explicitně respektují workspace boundary,
- RLS politiky už nepoužívají globální authenticated-only přístup pro
  workspace business data,
- cross-workspace parent/child zápis je odmítnut,
- chyba databáze se nepromění v mock nebo prázdný úspěch,
- demo režim zůstane dostupný pouze v explicitním lokálním režimu,
- `npm run typecheck` projde,
- `npm run build` projde,
- `npm run lint` nepřidá nové chyby ani warnings proti baseline,
- `git diff --check` projde,
- pracovní strom bude před commitem vědomě zkontrolován,
- migrace bude idempotentní nebo bude mít jasně zdokumentovanou jednorázovou
  část.

## 8. Ověřovací příkazy

```text
rg -n "\.from\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(" src
npm run typecheck
npm run lint
npm run build
git diff --check
git status --short --branch
```

Pokud bude k dispozici bezpečné připojení k Supabase, doplní se databázové
kontroly:

```sql
SELECT COUNT(*) FROM public.leads WHERE workspace_id IS NULL;
SELECT COUNT(*) FROM public.products WHERE workspace_id IS NULL;
SELECT COUNT(*) FROM public.calls WHERE workspace_id IS NULL;
SELECT COUNT(*) FROM public.orders WHERE workspace_id IS NULL;
SELECT COUNT(*) FROM public.workspace_members;
```

## 9. Navržené pořadí implementace

1. Zmapovat všechny přímé business Supabase přístupy.
2. Dokončit serverový `workspace context` helper.
3. Přidat serverové DAL funkce pro nejkritičtější lead/call/order tok.
4. Přesměrovat existující Server Actions a citlivé zápisy na DAL.
5. Doplnit workspace filtr a bezpečné DTO návraty pro čtení.
6. Doplnit role checks a bootstrap Administrator membership.
7. Připravit a zkontrolovat RLS policy migraci.
8. Provést statickou a aplikační verifikaci.
9. Teprve po úspěchu zvážit `NOT NULL` a finální uzavření přechodového stavu.
10. Aktualizovat status dokumentaci, commitnout a pushnout jednu tematickou
    změnu.

## 10. Schválení

Tento dokument je návrh. Implementace Commitu 6 může začít až po explicitním
schválení tohoto rozsahu, pořadí a případných změn v role matrix nebo strategii
nullable → `NOT NULL`.
