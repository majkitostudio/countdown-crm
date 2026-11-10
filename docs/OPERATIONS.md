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

### Ověření prostředí — 10. 11. 2026

- Místní aplikace používá `npm run dev`; `.env.local` ji připojuje k projektu Supabase `countdown-crm-sandbox-20260824` (sandbox), nikoli k lokální DB. `supabase/config.toml` definuje lokální API/DB na portech 54321/54322. `npx supabase status` lokální stack nepotvrdil, protože neběží Docker daemon.
- Node.js 26.12.0 a npm 11.20.0 splňují požadavky projektu. `npm run test:smoke` skutečně spustil Next.js a Chromium; všech 20 tras vrátilo HTTP 200 a test skončil 20/20. Nejde však o ověření přihlášení ani dat: skript zapíná `NEXT_PUBLIC_ALLOW_DEMO_AUTH`, nekontroluje chyby konzole jako důvod selhání a během běhu byly opakovaně zaznamenány chyby databázových čtení a HTTP 500 (nastavení telefonie a uživatelských předvoleb, leady, produkty, audit a workflows).
- Dashboard potvrdil zdravý stav projektu a 13 Auth účtů; v `workspace_members` jsou 1 `administrator`, 4 `team_leader` a 7 `operator`. Přihlašovací údaje pro operátora a účet pojmenovaný Team Leaderem jsou v místním prostředí a oba fungují, ale druhý účet je jediným `administrator` v členství, nikoli Team Leaderem. Jinému účtu ani heslu Team Leadera se nepodařilo přiřadit ověřené přihlašovací údaje. Roli jediného administrátora jsme neměnili, aby se neztratil ověřený admin přístup. Přihlašovací údaje ani tokeny se do výstupu ani dokumentace nekopírují.
- S reálným admin přihlášením v místním Next.js vrátily `/workspace`, `/orders`, `/settings/users` a `/admin` HTTP 200 bez chyb JS ani odpovědí 4xx/5xx. Operátor se přes UI přihlásil, načetl `/settings` a úspěšně uložil nezměněnou hodnotu osobní hlasitosti; po obnovení zůstala stejná. Tím se ověřilo čtení a zápis předvoleb pod rolí operátora; aktualizovalo se pouze technické `updated_at`.
- Předchozí `npm run test:smoke` dal 20/20 jen s demo autentizací; jeho databázové chyby a HTTP 500 patřily neplatné demo identitě v připojeném sandboxu. Smoke příkaz tedy neprokazuje běh rolí a má být opraven. Lokální databáze stále není spuštěná bez Dockeru; ověřený běh aplikace používá sandbox.
- Pro úplné ověření rolí zbývá získat přihlášení skutečného testovacího Team Leadera. Čtyři membership záznamy samy nedokazují, že se jejich účty mohou přihlásit. Admin účet zachovat; před opravou smoke testu i širšími zápisovými scénáři nejdřív doplnit bezpečně spravované přihlašovací údaje pro Team Leadera.

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
