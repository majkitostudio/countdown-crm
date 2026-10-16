# Vzdálená databáze — migrace a parita

Provozní postup pro **linked sandbox** (`countdown-crm-sandbox-20260824`). Týká se
nasazování migrací a kontroly, že soubory v repozitáři a vzdálená databáze
souhlasí. Není to bezpečnostní evidence (tu řeší [P0_3_REMOTE_DB_RUNNER.md](P0_3_REMOTE_DB_RUNNER.md)).

## Proč to existuje

17. 10. 2026 se ukázalo, že vzdálený sandbox měl **měsíc zastaralé schéma**, protože
**vypršel migrační access token** a nikdo ho neobnovil. Nasadilo se naposledy
19. 9. 2026. Projevilo se to v UI: nefungovalo riziko výdejny (pruh „Rizika a
prodlevy“ i Exception Queue hlásily jen částečnou dostupnost). Drift byl navíc
zamaskovaný tím, že 12 migrací z 14.–16. 9. bylo v databázi zapsaných pod
**přečíslovanými verzemi** (jiné číslo, stejný název).

Poučení: **expirace tokenu není vidět** — drift vzniká tiše. Paritu je proto
potřeba občas ověřit, ne jen jednou zavést.

## Přístup

- **Projekt:** ref je v `supabase/.temp/project-ref` (dnes `lpvypihpxhyjljikfzqo`).
- **Token:** scoped access token z `Account → Access Tokens`. Musí mít
  **`Database: Read-write`** a **`Migrations: Read-write`**.
  - **Scoped read-only token (jen `database_read`) nestačí.** CLI si před každou
    operací zakládá dočasnou login roli, a to vyžaduje `database_write`. S read-only
    tokenem skončí i pouhé čtení historie chybou
    `Missing required permission(s): database_write`.
  - Token nastav přes proměnnou prostředí `SUPABASE_ACCESS_TOKEN`. Uložený je
    v `.env.local` (mimo git) jako `SUPABASE_MIGRATE_ACCESS_TOKEN` — před spuštěním
    CLI ho načti do `SUPABASE_ACCESS_TOKEN`.
  - **Hlídej expiraci** (tokeny mají zvolenou platnost). Po vypršení se přestane
    nasazovat, aniž by to kdokoli poznal.

## Ověření parity

```powershell
$env:SUPABASE_ACCESS_TOKEN = "<scoped token s právem zápisu>"
node scripts/verify-migration-parity.mjs --linked
```

Očekávaný výsledek: `Migration files on disk: N` = `Versions applied in the database: N`
a `MIGRATION PARITY OK`. Jakýkoli rozdíl v obou směrech znamená drift.

Rychlý pohled na historii (včetně chybějících verzí) dá:

```powershell
npx supabase migration list --linked
```

## Nasazení chybějících migrací

```powershell
npx supabase db push --linked --yes
```

Nejprve se vyplatí dry-run: `npx supabase db push --linked --dry-run`.

## Přečíslované a osiřelé záznamy

Když `migration list` ukáže dvě řady verzí se **stejným názvem** (např. v repu
`20260914152000_team_leader_exception_scope`, v DB `20260914183420_team_leader_exception_scope`),
jde o **přečíslování** souborů v repu po jejich nasazení. Schéma v DB je správné,
jen evidence nesouhlasí — a `db push` by se pak pokusil migraci spustit znovu
(některé operace, např. `create policy`, nejsou idempotentní, takže by spadl).

Řešení — srovnat evidenci, nic nespouštět:

```powershell
# verze z repa, které jsou v DB pod jiným číslem → označit jako aplikované
npx supabase migration repair --status applied <verze...> --linked

# záznamy v DB, které v repu nejsou (přečíslované protějšky, sloučené migrace) → odstranit
npx supabase migration repair --status reverted <verze...> --linked
```

Po srovnání ověř paritu znovu.

## Když něco nesedí

- **„MISSING IN DATABASE“** — migrace v repu nebyla nasazena. Spusť `db push`.
- **„MISSING ON DISK“** — záznam v DB nemá soubor v repu. Buď přečíslování
  (viz výše), nebo migrace vznikla mimo repozitář; zjisti, o co šlo, než záznam smažeš.
- **Chyba oprávnění** — doplň scope tokenu (`Database`/`Migrations: Read-write`).
