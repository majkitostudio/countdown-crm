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

### Webhook kurýra

Endpoint `/api/carriers/webhook` přijímá události pouze tehdy, když jsou nastavené serverové proměnné `CARRIER_WEBHOOK_SECRET` a `CARRIER_WEBHOOK_WORKSPACE_ID`. Druhá proměnná určuje jediný workspace, jehož objednávky může tento endpoint aktualizovat; samotný `workspace_id` v těle požadavku není důvěryhodný. Pokud proměnná chybí, endpoint vrací HTTP 503 a události nezpracuje. Tajný klíč ani jeho hodnoty neukládej do repozitáře nebo `NEXT_PUBLIC_*`.

### Ověření prostředí — 11. 11. 2026

- Běžné `npm run dev` používá `.env.local` a připojuje aplikaci k sandboxu `countdown-crm-sandbox-20260824`; lokální Supabase je oddělený stack na portech 54321/54322. Docker nyní běží a lokální Supabase odpovídá; při dřívějším pokusu byl daemon dočasně nedostupný.
- Node.js 26.12.0 a npm 11.20.0 splňují požadavky projektu. Smoke test byl opraven: používá aktuální trasy a jako selhání počítá HTTP 4xx/5xx, chyby JavaScriptu a konzole i viditelný chybový stav načítání dat; neúspěšné interakční kontroly také nastaví neúspěšný exit code. Lze mu předat již běžící lokální server přes `SMOKE_TEST_BASE_URL` a přihlášení přes `SMOKE_TEST_EMAIL` / `SMOKE_TEST_PASSWORD`; tím se nekoliduje s vývojovým serverem a test jej nevypíná. Ověření proti lokální aplikaci a syntetickým datům jako administrátor skončilo 20/20 tras a 5/5 kontrol včetně přihlášení a chyb během interakcí, bez HTTP, konzolových a JS chyb. Demo-autentizovaný běh sám o sobě není důkazem rolového přístupu; pro tento průchod bylo použito skutečné lokální přihlášení.
- Dashboard potvrdil zdravý stav projektu a po přípravě účtu 14 Auth účtů; ve workspace je 1 `administrator`, 5 `team_leader` a 7 `operator`. Nový syntetický účet `qa.team-leader@example.test` je potvrzený a má roli `team_leader`; jeho e-mail a heslo jsou pouze v místním `.env.local`. Přihlašovací údaje dříve pojmenované jako Team Leader patří jedinému `administrator`; jeho roli jsme zachovali. Tajné hodnoty se do výstupu ani dokumentace nekopírují.
- Nový Team Leader se skutečně přihlásil do lokální Next.js aplikace připojené k sandboxu. `/team`, `/team/reviews`, `/team/exceptions` a `/schedule` vrátily HTTP 200; nebyly zaznamenány odpovědi HTTP 500 ani chyby JavaScriptu. Přihlášení a obrazovky administrátora i operátora byly ověřeny v předchozím průchodu.
- S reálným admin přihlášením v místním Next.js vrátily `/workspace`, `/orders`, `/settings/users` a `/admin` HTTP 200 bez chyb JS ani odpovědí 4xx/5xx. Operátor se přes UI přihlásil, načetl `/settings` a úspěšně uložil nezměněnou hodnotu osobní hlasitosti; po obnovení zůstala stejná. Tím se ověřilo čtení a zápis předvoleb pod rolí operátora; aktualizovalo se pouze technické `updated_at`.
- `npm run verify:parity` po startu Dockeru zjistil 5 chybějících lokálních migrací. Po kontrole jejich obsahu byly aplikovány výhradně na lokální DB příkazem `npx supabase db push --local --yes` (bez `--include-seed`, bez resetu a bez zásahu do linked sandboxu); následná parita je 137/137. Po lokálním QA průchodu DB obsahuje 1 administrátora, 2 workspace, 2 týmy, 6 leadů, 6 položek fronty, 6 produktů, 1 objednávku a 1 dokončený hovor.
- Lokální průchod administrátora po opravě UUID validace: přihlášení prošlo a všech 13 hlavních tras včetně `/products` a `/team` vrátilo HTTP 200 bez chyb JavaScriptu. Následně byla příčina tří chybajících obrázků odstraněna: lokální seed už neukládá URL souborů, které v `public/` neexistují, a katalogy zobrazují přístupný stav „No product image“ také při nefunkčním odkazu. Ověření `/products` později našlo tři fallbacky, žádné požadavky na obrázky, HTTP chyby ani chyby JavaScriptu. Lokální fronta po průchodu měla 3 volné položky a tabulka událostí fronty zůstala prázdná.
- Sandboxový rolový průchod po přihlášení: operátor otevřel Operator Console a prošel 12 tras, Team Leader prošel 14 tras; vše HTTP 200, bez HTTP chyb a chyb JavaScriptu. Před a po otevření Console měl operátor stejný počet přiřazených položek fronty. Jde o syntetická data sandboxu.
- Hlavní scénář byl ověřen pouze lokálně s novým syntetickým leadem a QA účty: Team Leader vytvořil lead, operátor jej převzal, simulovaný hovor dokončil výsledkem `order_placed`, vytvořil objednávku za USD 29.99 a Team Leader uložil první lidskou kontrolu hovoru. Stránka kontroly i ukládání doběhly bez HTTP chyb a chyb JavaScriptu; databáze potvrzuje uzavřenou položku fronty bez recovery a jednu revizi kontroly. Sandbox nebyl změněn.
- Omezení lokálního průchodu: úspěšný hovor trval podle serverových časů 0,401 s; databáze délku ukládá v celých sekundách zaokrouhlených na nejbližší sekundu, proto výsledek 0 s odpovídá krátkému testovacímu hovoru a není potvrzenou chybou měření. Delší hovor samostatně ověřen nebyl. Dva jiné nově vytvořené QA leady zůstaly po přerušených pokusech ve stavu `awaiting_outcome` s `recovery_required=true`; tento stav je záměrný, aby operátor doplnil výsledek, a záznamy zůstaly zachované. Ověřena a opravena byla chyba tlačítka `Recover`, které původně nevedlo k volbě výsledku; nyní panel zobrazí a přesune na něj fokus. Průchod recovery panelem při šířkách 320, 390 a 1280 px prošel bez horizontálního přetečení, HTTP chyb a chyb JavaScriptu; na 320 a 390 px byl ověřen také režim omezeného pohybu.
- Smoke test nyní spolehlivě selhává na HTTP 4xx/5xx a chybách konzole/JavaScriptu. Autentizovaný běh pod účtem operátora prošel 14/20 tras; neúspěšné trasy (`/team`, `/team/exceptions`, `/leads`, `/audit`, `/telephony`, `/automations`) odpovídají omezením role operátora, nikoli databázovým chybám. Interakční kontroly prošly 4/5; jediná neúspěšná je administrátorská kontrola Users & Teams. Team Leader i administrátor byli ověřeni samostatně níže.
- Délka hovoru delší než 1 s byla ověřena pouze lokálně se syntetickým QA leadem a simulovaným režimem. Dokončený hovor uložil do `calls.duration_seconds` hodnotu 3, což odpovídá `ROUND(call_ended_at − call_started_at) = 3,259 s` ze serverových časů; položka fronty se uzavřela bez `recovery_required`. Původní překážka byla odstraněna: `getScopedLeadForWorkspace` pro operátora už nevolá mutující `get_current_lead`, ale ověří vlastnictví přiřazení bez změny stavu hovoru. Hodnota 3 s vznikla se záměrným zdržením požadavku o 3 s a není důkazem přirozeně dlouhého hovoru; ověření bez umělého zdržení ještě nebylo provedeno.
- Opakovaný smoke běh 11. 11. 2026 proti lokálnímu serveru připojenému k sandboxu: administrátor 20/20 tras a 5/5 interakcí, Team Leader 19/20 tras a 4/5 interakcí, operátor 14/20 tras a 4/5 interakcí. Jediná selhání odpovídají omezením rolí (`/telephony`, `/team`, `/leads`, `/audit`, `/automations` a administrátorská kontrola Users & Teams); ani jeden běh nevrátil HTTP 500.
- Chybějící řádek `workspace_user_preferences` sám o sobě nezpůsobuje HTTP 500: `getUserPreferencesForWorkspace` vrací výchozí hodnoty s `persisted=false` a stránka Settings je zobrazí. Předvolby testovacích účtů byly doplněny: operátor je měl, Team Leader je uložil přes UI bez HTTP/JS chyb a administrátorské účty dostaly výchozí řádek s hlasitostí 80. Ověřeno dotazem do sandboxu.
- Pro administrátorský smoke běh byl v sandboxu vytvořen syntetický účet `qa.admin@example.test` s rolí `administrator` a doplněnými předvolbami. Jeho heslo je pouze v místním `.env.local`; do dokumentace se nekopíruje.
- Při ručním přihlašování po ztrátě session se v dev logu objevil jeden `POST /login` s HTTP 500 z `heartbeatLeadAssignmentAction` (`Error: Unauthorized`): stará Console komponenta zavolala akci bez platné session. Nesouviselo to s `user_preferences`. Opraveno: akce nyní neplatnou session vrátí jako no-op (`null`) a obě klientské smyčky heartbeat po této odpovědi zastaví; ostatní chyby se dál předávají. Ověřeno testem `tests/lead-queue-heartbeat-action.test.ts`.
- Kontroly po tomto kroku: `npm run lint` prošel, `npm run typecheck` prošel a `npm test` 987/987.

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
