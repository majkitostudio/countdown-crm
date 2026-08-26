# Migration provenance reconciliation: call outcome recovery

Stav auditu: 25. 8. 2026. Toto je pouze první, read-only fáze plánu. Dokument zaznamenává provenance důkazy a neuděluje povolení k aplikaci migrace.

## 1. Identita auditu

- **cwd:** `C:\Users\mikes\.codex\worktrees\e544\countdown-crm`
- **branch:** `fix/persist-call-outcome-recovery`
- **HEAD:** `e53b6779b7b5c1cf3f169f321dbe41a0d9dbdbe4` (`docs: clarify migration and acceptance gates`)
- **base / merge-base s `origin/main`:** `02267fe8bd58489792d9f35ab86e981f6d778765`
- **Git remote:** `https://github.com/majkitostudio/countdown-crm.git`
- **PR:** draft [#9](https://github.com/majkitostudio/countdown-crm/pull/9)

Tento checkpoint mění pouze dokumentaci. Nemění kód, SQL migraci, migration history ani databázi.

## 2. Target aplikace a nástroje

Správný target je sandbox Supabase:

- **project ref:** `lpvypihpxhyjljikfzqo`
- **host:** `lpvypihpxhyjljikfzqo.supabase.co`

Projekt `qlzrsookyobtvyekhrqi` je starší projekt a není target tohoto workflow.

Supabase CLI je dostupné přes `npx` ve verzi `2.115.0`. Přihlášený CLI přístup byl ověřen bez zveřejnění jakéhokoli hesla, tokenu, connection stringu nebo jiného secretu. Read-only `migration list` i read-only `db query` se proti targetu připojily.

Použité read-only příkazy:

```text
npx supabase --version
npx supabase migration list --project-ref lpvypihpxhyjljikfzqo --output-format json
npx supabase db query --linked --project-ref lpvypihpxhyjljikfzqo "<read-only schema query>"
```

`db push --dry-run` je uveden níže jako kontrola blokace; dry-run nic nezapisuje.

## 3. Lokální migrace relevantní k tomuto workflow

Lokální soubor je:

```text
supabase/migrations/20260824210525_persist_call_outcome_recovery.sql
```

- **version:** `20260824210525`
- **name:** `persist_call_outcome_recovery`
- **migration list status:** local-only, remote counterpart není uveden

Hlavička migrace popisuje zachování ownershipu započatého hovoru do explicitního post-call outcome/recovery stavu. SQL se dotýká zejména `public.lead_queue_items` a přidává `call_started_at`, `call_ended_at` a `recovery_required`; dále mění stavový constraint a navazující workflow. Přítomnost tohoto souboru v checkoutu není důkazem, že je migrace live aplikovaná.

## 4. Live/local migration history

Výsledek je z `npx supabase migration list --project-ref lpvypihpxhyjljikfzqo --output-format json` pro target `lpvypihpxhyjljikfzqo`.

### Přesné shody podle version ID

`migration list` uvádí 41 řádků, kde se lokální a remote version ID shodují:

```text
20260811235808
202608150001
202608150002
20260816180916
202608170001
20260817200938
20260817201609
20260817201812
20260817235507
202608180001
20260818183147
20260818195000
20260818195500
20260818210000
20260818210500
20260819003504
20260819005242
20260819090000
20260819090500
20260819100000
20260819103000
20260819110000
20260819143532
20260819144339
20260820190153
20260821102718
20260821104557
20260821151606
20260821204210
20260821225730
20260821230217
20260821230307
20260821230326
20260821230550
20260821230618
20260821230811
20260821230905
20260822023213
20260822114853
20260822115016
20260822120928
```

To jsou shody version ID, nikoli důkaz shody SQL obsahu nebo hashů. `migration list` samo o sobě neposkytuje dostatečný podklad pro tvrzení, že všechny odpovídající soubory mají stejný obsah.

### Live-only položky

Remote historie obsahuje těchto 20 version ID, pro která v tomto checkoutu není odpovídající lokální řádek:

```text
20260810071051
20260810071052
20260810071112
20260810071115
20260810071138
20260810071243
20260810071327
20260810071346
20260810104508
20260818162302
20260822134103
20260822134130
20260823010004
20260823041802
20260824100836
20260824104323
20260824104408
20260824104450
20260824104747
20260824112120
```

U těchto položek není z tohoto checkoutu prokázán zdroj, název, SQL obsah ani bezpečná ekvivalence. `migration list` pouze potvrzuje, že version ID existuje remote a chybí lokálně.

### Local-only položky

`migration list` uvádí 10 local-only řádků:

```text
20260809       (2 řádky)
20260810       (7 řádků)
20260824210525 (1 řádek)
```

Prvních devět řádků odpovídá těmto lokálním souborům, jejichž prefix/version je v názvu rozšířen o pořadí:

```text
20260809_0001_workspaces_and_memberships.sql
20260809_0002_workspace_scope_business_data.sql
20260810_0003_workspace_aware_rls.sql
20260810_0004_harden_function_privileges.sql
20260810_0005_harden_legacy_policies.sql
20260810_0006_isolate_authorization_helpers.sql
20260810_0007_harden_workspace_contract.sql
20260810_0008_grant_authenticated_table_access.sql
20260810_0009_seed_builtin_deals_schema.sql
```

Desátý local-only řádek je nová migrace `20260824210525_persist_call_outcome_recovery.sql`. U prvních devíti souborů není v tomto výstupu remote counterpart, proto nelze bezpečně tvrdit, zda jde o přejmenované, sloučené, historicky odlišné nebo jinak ekvivalentní remote změny.

### Položky s neprokázanou ekvivalencí

Z dostupných read-only dat není bezpečně prokázána:

- obsahová nebo hashová ekvivalence 41 shodných version ID;
- provenance 20 remote-only migrací;
- ekvivalence devíti lokálních souborů s prefixy `20260809`/`20260810` vůči live historii;
- jakákoli remote ekvivalence nové migrace `20260824210525`.

To není tvrzení, že ekvivalence neexistuje. Je to pouze hranice současného důkazu.

## 5. Dry-run aplikace

Byl spuštěn pouze:

```text
npx supabase db push --dry-run --project-ref lpvypihpxhyjljikfzqo
```

Výsledek: `LegacyDbPushMissingLocalError` s hlášením, že remote migration versions nejsou v lokálním migrations directory. CLI v chybě navrhlo `migration repair` a `db pull`; tyto kroky nebyly provedeny, protože by měnily migration boundary/historii nebo produktový checkout.

Dry-run tedy nic nezapsal. Současně potvrzuje, že normální `db push` nyní nelze bezpečně použít.

## 6. Read-only schema dotaz

Proveden byl pouze read-only dotaz proti linked targetu. Výsledek:

| Kontrola | Výsledek |
| --- | --- |
| `new_migration_applied` | `false` / `0` |
| `recovery_column_present` | `false` |
| `end_call_rpc_present` | `false` |
| `completion_rpc_present` | `true` |

Dotaz tedy potvrzuje, že nová migration version ani recovery schema/RPC část nejsou v targetu přítomné; existující completion RPC přítomné je.

## 7. Fakta a hypotézy odděleně

### Potvrzená fakta

- Target je `lpvypihpxhyjljikfzqo`; `qlzrsookyobtvyekhrqi` není target.
- CLI `2.115.0` a přihlášený read-only přístup fungují bez odhalení secretů.
- Live/local migration history má 41 version-ID shod, 20 live-only položek a 10 local-only řádků.
- Nová migration `20260824210525` je lokálně přítomná a podle `migration list` remote chybí.
- `db push --dry-run` skončil `LegacyDbPushMissingLocalError` a nic nezapsal.
- Read-only schema dotaz vrátil `0 / false / false / true` v pořadí uvedeném v tabulce.

### Hypotézy, které zatím nejsou důkazem

- Remote-only migrace mohou pocházet z jiného checkoutu, archivované branche, release artefaktu nebo jiného schváleného zdroje. Žádný takový zdroj nebyl v této fázi potvrzen.
- Lokální soubory s prefixy `20260809`/`20260810` mohou mít historický vztah k remote objektům, ale z `migration list` to nelze bezpečně odvodit.
- Nelze z toho určit, zda je možné použít repair, `db pull`, běžný `db push` nebo jinou aplikační strategii. Tyto hypotézy nesmí být podkladem pro live zápis.

## 8. Co lze rozhodnout nyní

Bezpečně lze rozhodnout pouze toto:

- nová migrace není live aplikovaná;
- target DB zůstává bez potvrzeného `recovery_required` a `end_lead_call`;
- normální `db push` je do vysvětlení driftu blokovaný;
- migration history se nesmí opravovat podle samotných počtů nebo tohoto diffu;
- další práce musí zůstat read-only a proběhnout v izolovaném scratch prostoru.

Nelze nyní rozhodnout:

- zda a jak aplikovat novou migraci do sandboxu;
- zda je některá remote-only verze bezpečně reprezentována lokálním souborem;
- zda je vhodná migration repair, `db pull` nebo jiná strategie;
- zda live schema, RLS, grants a RPC odpovídají nové implementaci;
- zda je feature live ověřená nebo připravená k opuštění draft stavu PR #9.

## 9. Závěr a jediný další krok

Nová migrace není live aplikovaná. Standardní `db push` je kvůli remote/local driftu blokovaný. Nebyl proveden žádný live SQL zápis, migration apply, `migration repair`, `db pull` do repozitáře ani jiná změna remote migration history.

Jediný doporučený další krok je **scratch reconciliation strategie**: v izolovaném prostoru dohledat a doložit provenance remote-only verzí a lokálních baseline souborů, porovnat jejich názvy/obsah/hashe a sepsat rozhodnutí. Tento krok nesmí měnit migration history. Dokud není provenance bezpečně vysvětlená, nesmí se volit ani provádět sandboxové nasazení a PR #9 zůstává draft.
