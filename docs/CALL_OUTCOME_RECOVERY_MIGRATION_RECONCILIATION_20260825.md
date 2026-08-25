# Migration provenance reconciliation: call outcome recovery

Stav k 25. 8. 2026. Toto je druhá, scratch-reconciliation fáze. Je read-only vůči live Supabase a neautorizuje sandboxové nasazení.

## 1. Rozsah a hranice průchodu

Průchod pokryl:

- bezpečný fetch dostupných remote refs a tagů bez prune;
- lokální heads, remote heads, tagy, reachable Git historii a všechny registrované worktrees;
- stav a migration soubory v relevantních worktrees;
- dohledání všech 20 remote-only version IDs z předchozího read-only migration list;
- Git historii souborů, které tyto version IDs nesou;
- porovnání názvu/version/name a SHA-256 obsahu mezi dohledanými soubory;
- kontrolu lokálních souborů na aktuální branch proti versionovaným variantám v jiných checkoutch.

Pomocné výpočty proběhly v paměti. Nebyl vytvořen žádný pomocný soubor v repozitáři ani scratch artefakt, který by se měl stageovat.

Použité zdroje a příkazy byly read-only:

- git fetch --all --tags
- git remote -v, git branch --all, git ls-remote --heads/tags origin
- git worktree list --porcelain
- git log --all --diff-filter=A -- supabase/migrations/<file>
- Get-FileHash -Algorithm SHA256 nad migration soubory v worktrees
- předchozí read-only npx supabase migration list pro target sandbox

Nebyl spuštěn žádný db push, apply, migration repair ani db pull.

## 2. Identita a target

- cwd: C:/Users/mikes/.codex/worktrees/e544/countdown-crm
- branch: fix/persist-call-outcome-recovery
- HEAD: b6e1307e090fbf384d2c66fb99a2480d8738672f
- base / merge-base s origin/main: 02267fe8bd58489792d9f35ab86e981f6d778765
- remote Git: https://github.com/majkitostudio/countdown-crm.git
- Supabase target: lpvypihpxhyjljikfzqo
- Supabase host: lpvypihpxhyjljikfzqo.supabase.co

qlzrsookyobtvyekhrqi je starší projekt a není target.

## 3. Dostupné refs a worktrees

Po fetchi byly dostupné tyto relevantní zdroje:

| Zdroj | Ref / HEAD | Relevance |
| --- | --- | --- |
| e544 | fix/persist-call-outcome-recovery / b6e1307 | Aktuální branch; obsahuje novou local-only migraci 20260824210525 |
| c8e0 | chore/close-pilot-readiness-gate / b83673b | Obsahuje část remote-only migration chain, včetně baseline a verzí do 20260823041802 |
| lead-call-order | feat/lead-call-outcome-order / d37b53e | Obsahuje všech 20 dohledaných remote-only migration souborů |
| .projects | docs/codex-workflow-and-context-skill / 21fa852 | Má stejnou starší lokální, neversionovanou baseline jako aktuální branch |
| 8ade | test/operator-ui-role-smoke / b836e43 | Má stejnou starší lokální baseline; remote-only versionované soubory nemá |
| Temp smoke | detached c4e8eeb; pracovní AGENTS.md změna | Relevantní pouze jako kontrolovaný worktree; remote-only migration soubory nemá |

Relevantní Git provenance commity:

- e23e80c7a563dbfcd217842dd87b4c82564b1808, větev chore/close-pilot-readiness-gate: restore migration provenance baseline;
- f5391ca1a4d2041a88e5ee42280e4b09981ec054, stejná větev: align local Supabase replay with live;
- 171ee81395aae00dde7bf7813c32ceba7214f632, větev feat/lead-call-outcome-order: restore remote migration provenance;
- e897edbb05316683df8c5d06febf76130a15fb0b, archivní tag archive/20260823/feat-push-reminder-notifications;
- 3eb2ac1402b44e2cf49002921c23e22f93e2547b, archivní worktree snapshot archive-cleanup;
- 5b4e2c8deaa0968755fc3e5990996323961b9767, 1c79c897cf6aa153f4d7357ee217ab4c887baefd a 7dfbb944d0f7ea0a6e3c79ad623866aea17b1df8, historie call-order migration chain.

PR #6, #7 a #8 nebyly měněny.

Dodatečná kontrola tree a Git blob IDs potvrdila, že těchto 14 remote-only IDs je dohledatelných v commitu 171ee813 i ve f5391ca/e23e80c na větvi chore/close-pilot-readiness-gate: 20260810071051, 20260810071052, 20260810071112, 20260810071115, 20260810071138, 20260810071243, 20260810071327, 20260810071346, 20260810104508, 20260818162302, 20260822134103, 20260822134130, 20260823010004 a 20260823041802. To je Git evidence přítomnosti path; není to samo o sobě důkaz live SQL obsahu.

Porovnání blob IDs mezi 171ee813 a f5391ca je u 12 z těchto 14 IDs shodné: 20260810071051, 20260810071052, 20260810071112, 20260810071115, 20260810071138, 20260810071243, 20260810071327, 20260818162302, 20260822134103, 20260822134130, 20260823010004 a 20260823041802. U 20260810071346 a 20260810104508 se blob IDs liší, takže jejich obsah není mezi těmito dvěma source commity ekvivalentní.

U 20260824100836 byla ověřena přítomnost v 171ee813 a v commitu 5b4e2c8 na větvi feat/lead-call-outcome-order. V aktuálně fetchnutém tree f5391ca/e23e80c ani v origin/chore/close-pilot-readiness-gate tento path přítomný není. Proto jej nelze uvádět jako potvrzený source z chore větve bez dalšího ref důkazu.

## 4. Vstupní live/local stav

Předchozí read-only npx supabase migration list pro lpvypihpxhyjljikfzqo uvedl:

- 41 přesných shod version ID;
- 20 remote-only version IDs;
- 10 local-only řádků: 2× 20260809, 7× 20260810 a 1× 20260824210525.

Remote-only IDs byly:

20260810071051, 20260810071052, 20260810071112, 20260810071115, 20260810071138, 20260810071243, 20260810071327, 20260810071346, 20260810104508, 20260818162302, 20260822134103, 20260822134130, 20260823010004, 20260823041802, 20260824100836, 20260824104323, 20260824104408, 20260824104450, 20260824104747, 20260824112120.

Faktická hranice live dat: migration list poskytuje version ID a informaci local/remote. Live výstup neposkytl SQL obsah, filename, name ani hash migration souboru. Git soubor nalezený v jiném checkoutu proto není automaticky důkazem obsahu, který byl aplikován do live DB.

## 5. Tabulka reconciliation

### 5.1 Přesná Git hashová shoda s aktuální branchí

V následujících osmi případech má versionovaný soubor v checkoutu lead-call-order stejný SHA-256 jako lokální soubor na aktuální branchi:

| Remote version / Git filename | Lokální soubor na e544 | SHA-256 shodného obsahu | Výsledek |
| --- | --- | --- | --- |
| 20260810071052 / 20260810071052_20260809_0001_workspaces_and_memberships.sql | 20260809_0001_workspaces_and_memberships.sql | 648D21B1C05592EA3CC53112B67667682BE44B1CBA8922B863D7104138E77AE0 | přesná Git shoda |
| 20260810071112 / 20260810071112_20260809_0002_workspace_scope_business_data.sql | 20260809_0002_workspace_scope_business_data.sql | 4E4E7434CCB4EDA034E1155869BE531D9AC0407C5F2BCF523AF5A34E3DDEA1EF | přesná Git shoda |
| 20260810071115 / 20260810071115_20260810_0003_workspace_aware_rls.sql | 20260810_0003_workspace_aware_rls.sql | 4ABF5397BBDE272296A3E8DF0E39316019D049D11EDA95E738493E93611F9E94 | přesná Git shoda |
| 20260810071138 / 20260810071138_20260810_0004_harden_function_privileges.sql | 20260810_0004_harden_function_privileges.sql | 6519562B2D8945230E903E996561F86AD41426CF81E16FFBFBEB3F64B684A478 | přesná Git shoda |
| 20260810071243 / 20260810071243_20260810_0005_harden_legacy_policies.sql | 20260810_0005_harden_legacy_policies.sql | 91AB1F4D649A0F60B807397E90A4C24311F71E9B2F8C87CB663BB0B849B78F51 | přesná Git shoda |
| 20260810071327 / 20260810071327_20260810_0006_isolate_authorization_helpers.sql | 20260810_0006_isolate_authorization_helpers.sql | 6C2573AF49A0DFDD450D6347116BD93EA830CEDBFE3D4BE5F706417953DDE7B5 | přesná Git shoda |
| 20260810104508 / 20260810104508_20260810_0008_grant_authenticated_table_access.sql | 20260810_0008_grant_authenticated_table_access.sql | BB177BD93E8C25E22F409477F9A71799EF637CC13F7737843DF39F310F291E31 | přesná Git shoda |
| 20260818162302 / 20260818162302_20260810_0009_seed_builtin_deals_schema.sql | 20260810_0009_seed_builtin_deals_schema.sql | 6D1FB28D3E58A56BD505D5F03FC6633F07E36DA3F0C68F7E4B5AEFC0B117025C | přesná Git shoda |

To prokazuje přesný obsah mezi konkrétním Git checkoutem a aktuálními lokálními soubory. Neprokazuje to samo o sobě, že stejný SQL obsah je v live DB.

### 5.2 Pravděpodobná Git provenance, ale ne přesná obsahová ekvivalence

| Version / filename | Nalezeno | Porovnání | Výsledek |
| --- | --- | --- | --- |
| 20260810071346 / 20260810071346_20260810_0007_harden_workspace_contract.sql | c8e0 a lead-call-order | c8e0 a lead mají shodný hash 90FAFF54C1CA951E3AC914C7C77AC9813602B32B3E2CC7822D930795A98DE886; aktuální lokální soubor má 949C212ED74097304C46378E290283137D499DC7F630F4766E20F173EDF20AEB | stejná lineage a filename mapping jsou pravděpodobné; obsah aktuálního souboru se liší jedním SQL řádkem, takže ekvivalence není přesná |
| 20260822134103 / push_reminder_notifications.sql | c8e0, lead-call-order, archivní tag | hash c8e0 583CB2B03B67CF4BFC35E5059BD1FCA8027265C0ABA60F59104A0CD587B44C4D; lead 13FB9B17F34E87E416FD3A7DD75A18D9429B7EC768AF7D59EEE474777C002E73 | zdroj a název jsou dohledané, obsah se mezi checkouty liší |
| 20260822134130 / push_subscription_user_index.sql | c8e0, lead-call-order, archivní tag | hash c8e0 4BF9CC6C1E1FE037D4949CF1DE461315E87523FC30983CCBCC858E5F424E3308; lead 3F3B807ADEF4BBD4753BC51A02F16A8102A04CF557A0184333C098A8404D25DD | zdroj a název jsou dohledané, obsah se mezi checkouty liší |
| 20260823010004 / operator_presence_heartbeat.sql | c8e0, lead-call-order, archivní snapshot | hash c8e0 437EE93831E7D50BB446398A5515BF6509CDE07341D7FB1B08BD6215388758A2; lead 81AADDF37D228451B2F6E0E4B04E4DFE65B81128EBAE23F92657AF7F265A4200 | zdroj a název jsou dohledané, obsah se mezi checkouty liší |
| 20260823041802 / profile_backfill_and_auth_trigger.sql | c8e0, lead-call-order, archivní snapshot | hash c8e0 755C42216BF823E02946215F814D9F145A5226580E0CAFCC2778CC841C07B62C; lead F05FFED8A9E901D2D659F65F41141930A6BBC1B9A82DD7FEFCC8DCA4D7C744BB | zdroj a název jsou dohledané, obsah se mezi checkouty liší |

Tyto řádky jsou pravděpodobné Git provenance, ne prokázaná live nebo obsahová ekvivalence.

### 5.3 Dohledaný zdroj, ale ekvivalence zůstává neprokázaná

| Remote version / filename | Git evidence | SHA-256 | Stav |
| --- | --- | --- | --- |
| 20260810071051 / 20260810071051_countdown_crm_base_schema.sql | c8e0 a lead-call-order; v e23e80 a 171ee81 | c8e0 CAC9294186FAEADF40928EF18C7EF0187FB468ED8C06327614B6904A27D17B17; lead 3DABC7AF19FA1430C261233F635F17BFA0C876BE85C2E325375502F95766AC0D | dva různé obsahy, žádný bezpečný lokální protějšek |
| 20260824100836 / atomic_call_order_items.sql | lead-call-order, commit 5b4e2c8; tree 171ee813 | 54F415286E9F866B5907C71CC9F33462D88533BD47740ACEE55BBB09C60C6E9D; Git blob 0d60e3cf488470fbb16039932c92699024b96eb9 | source je dohledaný ve dvou Git commitech; v ověřeném f5391ca/e23e80c tree chybí, live ekvivalence není prokázaná |
| 20260824104323 / fix_atomic_call_order_items_product_row.sql | lead-call-order, commit 1c79c89 | 4C51E273A4AE16ABB4C29BED8B152C298A8EF4A7C13D3A1858FDD65240947F56 | pouze jeden dohledaný source variant |
| 20260824104408 / fix_atomic_call_order_items_product_alias.sql | lead-call-order, commit 1c79c89 | 9F3E0B13ED6C5D2E834B902D1F59F98842EFA4E7C0378F266D063CFFEA30C8F1 | pouze jeden dohledaný source variant |
| 20260824104450 / fix_atomic_call_order_items_workspace_alias.sql | lead-call-order, commit 1c79c89 | 96E55B7064FB858C22F1638CA16A7CFDF167EBE19358943545515430149AFBCD | pouze jeden dohledaný source variant |
| 20260824104747 / fix_atomic_call_order_items_workspace_column.sql | lead-call-order, commit 1c79c89 | C8BFD081133AD6FCD15A644353BDD6A50A3357961C61168EC1C129E1DB1FB61E | pouze jeden dohledaný source variant |
| 20260824112120 / fix_atomic_call_order_items_product_row_mapping.sql | lead-call-order, commit 7dfbb94 | 40BD44624DFCD08AE52D1769BC218FEF5EC912C60C2576991F6079E5AEA72307 | pouze jeden dohledaný source variant |

U těchto položek je známý Git soubor a commit, ale není druhá nezávislá varianta ani live SQL obsah, proti kterému by šla potvrdit ekvivalence.

### 5.4 Local-only a nová migrace

Aktuální branch má devět lokálních baseline souborů s verzemi 20260809/20260810:

- 20260809_0001_workspaces_and_memberships.sql
- 20260809_0002_workspace_scope_business_data.sql
- 20260810_0003_workspace_aware_rls.sql
- 20260810_0004_harden_function_privileges.sql
- 20260810_0005_harden_legacy_policies.sql
- 20260810_0006_isolate_authorization_helpers.sql
- 20260810_0007_harden_workspace_contract.sql
- 20260810_0008_grant_authenticated_table_access.sql
- 20260810_0009_seed_builtin_deals_schema.sql

Migration list je proti live normalizuje jako 2 řádky 20260809 a 7 řádků 20260810. Jejich versioned protějšky byly nalezeny v checkoutu lead-call-order, ale u 0007 je obsah odlišný; u ostatních osmi výše je přesná Git hashová shoda.

Nová lokální migrace je:

- 20260824210525_persist_call_outcome_recovery.sql;
- version 20260824210525;
- název persist_call_outcome_recovery;
- bez remote counterpart v migration list.

## 6. Co se podařilo a co ne

### Prokázáno

- Všechny dostupné remote-only version IDs lze dohledat alespoň v jednom reachable Git checkoutu, ref nebo archivním source; 14 v c8e0 a 20 v lead-call-order.
- Osm versionovaných souborů má v lead-call-order přesný SHA-256 match s lokálními baseline soubory aktuální branch.
- U dalších remote-only souborů jsou dohledané názvy, commits a source checkouty.
- Git provenance je rozvětvená: e23e80 a 171ee81 obsahují různé hash varianty části migration chain.
- Live Supabase poskytuje pouze version IDs/local-remote status, nikoli SQL obsah nebo hash.

### Neprokázáno

- Která konkrétní hash varianta odpovídá skutečnému SQL obsahu v live DB.
- Že 41 shodných version IDs znamená shodu SQL obsahu.
- Bezpečná ekvivalence base schema a šesti call-order migrací s jiným checkoutem.
- Jednotná kanonická migration provenance, ze které by šlo bezpečně odvodit aplikaci nové migrace.
- Že by aktuální live schema odpovídalo některé z nalezených Git variant.

## 7. Rozhodnutí o sandbox strategii

Tato fáze významně zúžila hledání zdrojů, ale provenance zůstává neprokázaná. Není bezpečné připravit konkrétní aplikační strategii pro sandbox, protože:

1. live poskytuje jen version IDs bez SQL obsahu;
2. dostupné recovery checkouty mají u části stejných version IDs rozdílné hash varianty;
3. některé remote-only soubory mají pouze jediný dohledaný source;
4. není schválený kanonický zdroj, který by určoval, co přesně je historická live chain a co lze aplikovat dál.

Lze bezpečně připravit pouze neprováděcí rozhodovací podklad. Nelze schválit repair, db pull, běžný db push ani ruční nebo blind apply. PR #9 zůstává draft.

## 8. Jediný další krok

Jediný další krok je získat a schválit kanonickou provenance pro divergentní version IDs v izolovaném scratch prostoru, včetně rozhodnutí, která hash varianta reprezentuje live historii a jak bude doložena její úplnost. Tento checkpoint nesmí měnit migration history ani databázi. Dokud není schválený kanonický zdroj a samostatná aplikační strategie, live DB zůstává beze změny a sandbox se nesmí aplikovat.
