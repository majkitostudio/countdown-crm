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

- Přihlášený browser smoke pro všechny dotčené role a workspace.
- Negativní cross-workspace a unauthorized-role testy v live prostředí.
- Persistence po reloadu/logoutu a idempotence v reálném prostředí.
- Bezpečné nasazení migrací do live databáze.

## Migration provenance blocker

Read-only `supabase db push --dry-run --linked` se stále zastaví na 21 remote-only verzích. Tento rozdíl se nesmí řešit `migration repair`, přepsáním historie, slepým `db pull` do checkoutu ani hromadným `--include-all` bez schválené mapy původu.

## Doporučený další krok

Nechat doběhnout kontroly PR #28, připravit explicitní mapu 21 remote-only verzí na jejich lokální ekvivalenty a teprve potom provést samostatný, kontrolovaný deployment migration slice. Pilotní gate zůstává otevřený, dokud nebude doložena live persistence, autorizace a provenance migrací.

## Bezpečnostní hranice

V tomto checkpointu nebyla změněna live databáze, migration history, role, membership ani produktová data. Scratch prostředí bylo po ověření vypnuto.
