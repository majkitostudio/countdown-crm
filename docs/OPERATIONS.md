# Countdown CRM — provozní návod

Tento návod obsahuje lokální vývoj, seed katalogu a postupy pro kontrolu migrací. Ověření lokálního prostředí a linked sandboxu jsou oddělené; příkaz pro lokální databázi se nepovažuje za důkaz vzdáleného nasazení.

## Lokální spuštění a kontroly

Požadavky jsou Node.js 22.22.2 až 22.x, 24.15.0 až 24.x nebo 26 a novější a podle režimu lokální Supabase prostředí. CI používá Node.js 22.22.2.

```powershell
npm install
npm run dev
```

Demo používá syntetická data. Nepřipojuj demo k náhodné živé databázi a tajné hodnoty neukládej do `NEXT_PUBLIC_*` proměnných.

Dostupné kontroly:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:all
npm run test:smoke
```

`verify:all` spouští lint, typecheck, testy a build. Smoke test je samostatný browserový běh. Výsledek kontroly vždy vztahuj ke konkrétnímu běhu a jeho prostředí.

### Ověření prostředí — 11. 11. 2026

- Běžné `npm run dev` používá `.env.local` a připojuje aplikaci k sandboxu `countdown-crm-sandbox-20260824`; lokální Supabase je oddělený stack na portech 54321/54322. Docker je nyní spuštěný, lokální Auth health odpovídá HTTP 200 a lokální administrátor se přihlásil.
- Node.js 26.12.0 a npm 11.20.0 splňují požadavky projektu. `npm run test:smoke` skutečně spustil Next.js a Chromium; všech 20 tras vrátilo HTTP 200 a test skončil 20/20. Nejde však o ověření přihlášení ani dat: skript zapíná `NEXT_PUBLIC_ALLOW_DEMO_AUTH`, nekontroluje chyby konzole jako důvod selhání a během běhu byly opakovaně zaznamenány chyby databázových čtení a HTTP 500 (nastavení telefonie a uživatelských předvoleb, leady, produkty, audit a workflows).
- Dashboard potvrdil zdravý stav projektu a po přípravě účtu 14 Auth účtů; ve workspace je 1 `administrator`, 5 `team_leader` a 7 `operator`. Nový syntetický účet `qa.team-leader@example.test` je potvrzený a má roli `team_leader`; jeho e-mail a heslo jsou pouze v místním `.env.local`. Přihlašovací údaje dříve pojmenované jako Team Leader patří jedinému `administrator`; jeho roli jsme zachovali. Tajné hodnoty se do výstupu ani dokumentace nekopírují.
- Nový Team Leader se skutečně přihlásil do lokální Next.js aplikace připojené k sandboxu. `/team`, `/team/reviews`, `/team/exceptions` a `/schedule` vrátily HTTP 200; nebyly zaznamenány odpovědi HTTP 500 ani chyby JavaScriptu. Přihlášení a obrazovky administrátora i operátora byly ověřeny v předchozím průchodu.
- S reálným admin přihlášením v místním Next.js vrátily `/workspace`, `/orders`, `/settings/users` a `/admin` HTTP 200 bez chyb JS ani odpovědí 4xx/5xx. Operátor se přes UI přihlásil, načetl `/settings` a úspěšně uložil nezměněnou hodnotu osobní hlasitosti; po obnovení zůstala stejná. Tím se ověřilo čtení a zápis předvoleb pod rolí operátora; aktualizovalo se pouze technické `updated_at`.
- `npm run verify:parity` po startu Dockeru zjistil 5 chybějících lokálních migrací. Po kontrole jejich obsahu byly aplikovány výhradně na lokální DB příkazem `npx supabase db push --local --yes` (bez `--include-seed`, bez resetu a bez zásahu do linked sandboxu); následná parita je 137/137. Lokální DB obsahuje 1 administrátora, 2 workspace, 2 týmy, 3 leady, 3 položky fronty, 6 produktů a 0 objednávek.
- Lokální průchod administrátora: přihlášení prošlo; z 13 hlavních tras vrátilo 11 HTTP 200. `/products` a `/team` vrací HTTP 500: log hlásí `Invalid workspace ID`, protože ID demo workspace `00000000-0000-0000-0000-000000000001` neprojde validací UUID v `src/lib/dal/workspace.ts`. Ostatní trasy včetně `/console`, `/leads`, `/orders`, `/schedule`, `/reports` a `/admin` vrátily HTTP 200.
- `/console` se v tomto průchodu ověřila pouze jako administrátor. Skutečné otevření operátorem automaticky nastaví dostupnost a může převzít položku fronty; před bezpečným rolovým průchodem je nutný izolovaný lokální operátor. Předchozí smoke test zůstává neprůkazný: používá demo autentizaci a nepočítá databázové chyby a HTTP 500 jako selhání.

### Obnova hesla

Obnovovací e-mail se vrací na `/auth/confirm` na stejné doméně, ze které uživatel o obnovu požádal. Přesnou návratovou adresu je nutné povolit v Supabase Auth Redirect URLs pro dané prostředí; pro lokální provoz se `localhost` a `127.0.0.1` posuzují samostatně. Odkaz PKCE je nutné otevřít ve stejném prohlížeči, ve kterém vznikla žádost. Funkčnost doručení e-mailu a návratu ověřuj samostatně na testovacím účtu.

## Katalog pro lokální demo

`data/seeds/catalog-seed-template.json` je vstupní šablona. Po její úpravě spusť:

```powershell
npm run seed:catalog
```

Skript ověří strukturu a povolená pole, sestaví bezpečné HTML skriptů a vygeneruje `supabase/seed.sql`. Jde o lokální demo seed; příkaz nenasazuje katalog do vzdáleného projektu.

## Migrace a parita

Kontrola počtu a duplicitních verzí:

```powershell
npm run verify:migrations
```

Parita vůči lokální databázi:

```powershell
npm run verify:parity
```

Parita vůči linked projektu:

```powershell
node scripts/verify-migration-parity.mjs --linked
npx supabase migration list --linked
```

Linked kontrola vyžaduje přihlášení do správného projektu. Pro tento běh CLI potřebuje scoped token s oprávněním `Database: Read-write` a `Migrations: Read-write`; token musí být předán jen přes zabezpečené prostředí, nikdy jako text do repozitáře nebo výstupu.

### Nasazení chybějících migrací

Nejdříve zkontroluj cílový projekt a plán:

```powershell
npx supabase db push --linked --dry-run
```

Teprve po kontrole dry-run a potvrzení, že jde o správný sandbox, může oprávněný operátor spustit:

```powershell
npx supabase db push --linked --yes
node scripts/verify-migration-parity.mjs --linked
```

`migration repair` mění evidenci aplikovaných migrací. Použij ho pouze po ručním porovnání názvů a schématu; sám neopraví schéma databáze. Migraci neoznačuj jako aplikovanou ani nevrácenou odhadem. Při nejasném driftu zastav a zjisti původ.

## Bezpečnostní hranice

- Vzdálené migrační operace mohou měnit schéma sandboxu. Nepoužívej je jako běžný lokální test.
- Tokeny mají časovou platnost; jejich aktuální platnost ověř v účtu, ne podle historických dat v dokumentaci.
- Nepoužívej `SUPABASE_SERVICE_ROLE_KEY` jako náhradu za scoped migrační token.
- P0.3 linked evidence runner je oddělený read-only postup s užším tokenem; viz [runner P0.3](P0_3_REMOTE_DB_RUNNER.md).
