# Audit checkpoint — 27. 8. 2026

## Stručný stav

Nejdůležitější aplikační opravy z posledního auditu jsou připravené v draft PR #17, #21, #23 a #28. Statické kontroly a Vercel preview jsou zelené. Žádná z těchto změn zatím nebyla aplikována do live databáze.

## Nově ověřené skutečnosti

- Docker Desktop a Docker engine jsou funkční.
- Read-only export live schématu `public,private` proběhl bez zápisu do projektu.
- Live databáze obsahuje authorization helpery v `private` namespace; `public.create_order_with_items` a `public.update_order_with_items` jsou `SECURITY INVOKER`.
- Live databáze má aktivní RLS na 30 veřejných tabulkách a 75 veřejných politikách.
- Live schéma zatím neobsahuje objekty z nových PR: `workspace_blueprint_state`, `atomic_business_mutations_audit` ani `workflow_executions.event_id`.
- V disposable scratch databázi se migrace z PR #17, #21 a #23 aplikovaly na exportu live schématu.
- Migrace PR #28 původně odkazovala na `public.is_workspace_manager_or_admin` a `public.is_workspace_member`, které v live schématu neexistují. Oprava na `private.*` je v commitnutém a pushnutém commitu `7ad71b4`; následné scratch ověření proběhlo.

## Co stále není potvrzené

- Negativní cross-workspace a unauthorized-role testy v live prostředí.
- Persistence po reloadu/logoutu a idempotence v reálném prostředí.
- Bezpečné nasazení migrací do live databáze.

## Browser smoke — 27. 8. 2026

Read-only smoke proběhl s reálnou přihlášenou relací Administrátora i Operatora.
Na obou rolích byly opakovaně načteny `/workspace`, `/leads`, `/orders`,
`/settings` a `/team`. Stránky se po načtení ustálily bez nekonečného spinneru.

- Administrátor viděl očekávaný širší workspace kontext.
- Operator viděl Operator Console; `/leads` a `/team` zobrazily pravdivý
  unavailable stav a `/settings` zůstalo pouze pro čtení.
- `/orders` zobrazilo prázdný stav bez záznamů; nebyl proveden žádný zápis.
- Po opakovaném načtení zůstaly role i stavy stejné.
- Konzole prohlížeče neobsahovala chyby ani varování.

Tento výsledek potvrzuje pouze UI chování přihlášených rolí. Nepotvrzuje RLS,
cross-workspace izolaci ani live persistence.

## Migration provenance blocker

Ve starém checkoutu se read-only `supabase db push --dry-run --linked` stále
zastaví na 21 remote-only verzích. Na reconcile větvi
`chore/reconcile-migration-provenance-20260827` už stejný dry-run vrací
`Remote database is up to date`; disposable reset zároveň aplikoval všech 62
migrací od nuly. Tento rozdíl se nesmí řešit `migration repair`, přepsáním
historie, slepým `db pull` do checkoutu ani hromadným `--include-all` bez
schválené mapy původu.

### Předběžná mapa remote-only verzí

| Remote verze | Předběžné zařazení |
| --- | --- |
| `20260810071051` | chybějící historický základ `countdown_crm_base_schema` |
| `20260810071052`, `20260810071112`, `20260810071115`, `20260810071138`, `20260810071243`, `20260810071327`, `20260818162302` | lokální ekvivalent existuje; obsah byl porovnán jako shodný nebo logicky odpovídající |
| `20260810071346`, `20260810104508` | lokální ekvivalent existuje, ale remote obsahuje dodatečné změny; vyžaduje ruční rozhodnutí |
| `20260822134103`, `20260822134130`, `20260823010004`, `20260823041802` | skutečně chybějící pozdější push/presence/profile migrace |
| `20260824100836`, `20260824104323`, `20260824104408`, `20260824104450`, `20260824104747`, `20260824112120` | skutečně chybějící atomic call/order opravy |
| `20260824210525` | skutečně chybějící call-outcome recovery migrace |

Tato mapa je pracovní evidence, nikoli povolení k opravě historie. Před deploymentem je nutné dohledat přesný obsah každé historické verze a rozhodnout, zda bude zachována jako kompatibilní baseline, přenesena do nové migrace, nebo ponechána jako explicitně zdokumentovaný historický artefakt.

## Doporučený další krok

Reconcile větev `chore/reconcile-migration-provenance-20260827` je připravená v draft PR #40. Její linked dry-run vrací `Remote database is up to date` a disposable reset aplikoval všech 62 migrací od nuly. Po review této větve lze řešit další deploymentní kroky; pilotní gate zůstává otevřený, dokud nebude doložena live persistence a autentizované autorizace.

## Bezpečnostní hranice

V tomto checkpointu nebyla změněna live databáze, migration history, role, membership ani produktová data. Scratch prostředí bylo po ověření vypnuto.
