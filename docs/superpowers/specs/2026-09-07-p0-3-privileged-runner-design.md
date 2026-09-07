# P0.3 — bezpečný privileged runner pro vzdálené databázové důkazy

**Datum:** 7. 9. 2026

**Stav:** schválený návrh

## Cíl

Přidat opakovatelný runner, který z důvěryhodného hostitele nebo Dockeru
provede read-only důkazy nad konkrétním linked Supabase sandboxem. Runner nesmí
měnit oprávnění aplikačních rolí, publikovat schéma `private`, používat
produkční service-role klíč ani zaměňovat linked sandbox za produkční důkaz.

## Rozhodnutí

Základní režim používá přímo read-only Supabase Management API endpoint
`POST /v1/projects/{ref}/database/query/read-only` proti explicitně zadanému
project ref. Autentizace probíhá samostatným scoped Supabase access tokenem,
omezeným na jediný linked sandbox a oprávnění `Database: Read`. Token je dodán
mimo Git jako runtime secret; runner nepřijímá `SUPABASE_SECRET_KEY` ani
`SUPABASE_SERVICE_ROLE_KEY`.

Docker je distribuční a izolační obal, ne bezpečnostní hranice databáze. Image
obsahuje pouze pinned Node runtime a runner; žádný secret se nepředává při
buildu ani se nezapisuje do image.

Volitelný write-capable režim není součástí výchozího read-only běhu. Pokud bude
později potřeba vzdálený pgTAP test se zápisem, musí mít samostatný explicitní
opt-in, samostatně schválenou credential cestu a SQL testy s unikátním run ID,
read-backem a transakčním rollbackem. Bez takového schválení se tento režim
odmítne před připojením.

## Důkazní rozsah

### Runner poskytuje

- že dotaz byl proveden proti explicitnímu linked project ref,
- read-only katalogový důkaz security režimu, signatur, `search_path`, umístění
  a ACL pěti P0.2 RPC hranic,
- důkaz, že `pgtap` není v `public`,
- kontrolu očekávaných linked migration-history a databázových metadat, pokud
  jsou pro daný dotaz dostupná,
- deterministický výsledek `PASS`/`FAIL` s počtem kontrol a sanitizovaným
  výstupem,
- bezpečné odmítnutí chybějícího, nesprávného nebo zakázaného credentialu,
- verifikovatelnou konstrukci API požadavku bez shell interpolace.

### Runner neposkytuje

- produkční bezpečnostní důkaz,
- důkaz živé telefonie, externího providera, browseru nebo UI autorizace,
- náhradu autentizovaného testu tří rolí přes skutečné Auth session,
- důkaz business mutace, concurrency nebo cleanupu write testu v read-only
  režimu,
- oprávnění k aplikaci migrace, resetu databáze, změně konfigurace nebo čtení
  produkčních dat mimo explicitní allow-list dotazu.

## Tok dat

```text
runtime secret manager / lokální secret store
        │
        ├── P0_3_LINKED_PROJECT_REF
        └── SUPABASE_ACCESS_TOKEN (scoped, jeden sandbox, Database: Read)
                │
        pinned Node runner nebo Docker image
                │
        read-only Supabase Management API
                │
        allow-listed read-only SQL
                │
        sanitizovaný report bez tokenu, URL credentialu,
        hesla, JWT, Auth emailu nebo raw API diagnostiky
```

Runner nebude volat Data API a nebude do prostředí nastavovat žádný
`NEXT_PUBLIC_*` secret. Project ref se předá pouze v URL API požadavku a v
reportu se zobrazí jen jeho bezpečně zkrácený otisk, nikoli credential.

## Bezpečnostní kontrakty

### Konfigurace

Povinné runtime hodnoty:

- `P0_3_LINKED_PROJECT_REF` — pouze syntakticky validní Supabase project ref,
- `SUPABASE_ACCESS_TOKEN` — scoped token určený jen pro linked sandbox.

Runner odmítne:

- chybějící nebo prázdnou hodnotu,
- project ref s neplatným formátem,
- přítomnost `SUPABASE_SECRET_KEY` nebo `SUPABASE_SERVICE_ROLE_KEY`,
- secret v názvu `NEXT_PUBLIC_*`,
- pokus o neallow-listed SQL nebo write flag bez explicitního opt-in.

Chybové zprávy obsahují pouze název chybějící konfigurace nebo bezpečný typ
chyby. Hodnota credentialu, celý connection string, token, Auth identita ani
raw stderr se nikdy nevypíšou.

### Read-only SQL

SQL bude uložený jako verzovaný allow-list. Runner před spuštěním odmítne
nepovolené tokeny typu `insert`, `update`, `delete`, `merge`, `alter`, `drop`,
`create`, `grant`, `revoke`, `truncate`, `copy`, `vacuum`, `refresh` a `call`.
Dotaz bude vracet pouze agregované kontrakty a booleany; nebude vracet řádky
zákazníků, Auth metadata, e-mailové adresy, telephony payloady ani tokeny.

### Volitelné zápisy

Zápisová cesta bude samostatná od read-only runneru. Každý testovací fixture
obdrží UUID run ID a všechny názvy/poznámky budou tímto ID označené. Test:

1. otevře jednu transakci,
2. vytvoří pouze fixture v linked sandboxu,
3. provede očekávaný pozitivní i negativní kontrakt,
4. provede read-back podle run ID,
5. explicitně odstraní fixture v `finally`/exception cestě,
6. dokončí rollback, takže přerušení běhu nezanechá data.

Write mode nebude povolen bez příznaku `--allow-linked-test-writes` a runtime
potvrzení `P0_3_CONFIRM_LINKED_TEST_WRITES=I_UNDERSTAND`. Samotný read-only
režim tento příznak ignoruje jako chybu, aby se konfigurace nespletla tiše.

## Report

Výstup bude strojově čitelný JSON s následujícími poli:

- `runner`: název a verze runneru,
- `target`: `linked-sandbox`,
- `projectRefFingerprint`: jednosměrný otisk refu,
- `mode`: `read-only` nebo explicitně povolený `transactional-test`,
- `checks`: počet kontrol, počet úspěchů a bezpečné identifikátory kontrol,
- `status`: `passed` nebo `failed`,
- `failureCode`: stabilní kód bez raw API výstupu.

Report nebude obsahovat project URL, access token, connection string, SQL
credential, Auth email, heslo, celé UUID fixture ani raw databázový payload.
Při selhání se do reportu uloží pouze stabilní failure code a krátký typový
detail z allow-listu.

## Testování bez linked databáze

Vitest pokryje čisté funkce a orchestraci bez připojení:

- validaci project refu a povinného credentialu,
- odmítnutí app/service-role credentialů,
- odmítnutí `NEXT_PUBLIC_*` secret konfigurace,
- read-only SQL allow-list,
- konstrukci read-only API požadavku,
- parsování očekávaného JSON payloadu,
- fingerprint a redakci citlivých hodnot,
- mapování API failure na stabilní bezpečný error,
- výchozí zákaz write mode a požadavek na přesný opt-in.

Testy nebudou mockovat úspěšný linked důkaz jako náhradu skutečného běhu.
Mockovaná HTTP hranice pouze ověří bezpečnost orchestrace a bude
oddělené od reportu prvního skutečného linked běhu.

## Dokumentace a prostředí

Dokumentace popíše tři odlišné režimy:

1. **lokální runtime:** lokální pgTAP a lokální Supabase databáze,
2. **linked sandbox:** tento runner a jeho skutečný sanitizovaný report,
3. **produkce:** runner se nepoužívá jako produkční authorization nebo
   readiness důkaz.

Setup uvede, že scoped token se vytváří mimo repozitář a že classic/full-account
token není přijatelná náhrada. První linked běh bude zapsán samostatným reportem
bez secretů; jeho absence znamená, že P0.3 není dokončené.

## Scope guard

Tato změna nepřidá:

- žádnou migraci,
- grant pro `anon` nebo `authenticated`,
- veřejnou funkci, testovací backdoor nebo administrátorské RPC,
- Data API exposure schématu `private`,
- změnu Auth konfigurace nebo leaked-password protection,
- řešení `rls_enabled_no_policy`,
- UI, CRM business logiku nebo produktový backlog.
