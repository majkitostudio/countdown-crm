# Checkpoint — Sandbox Operator browser evidence, 1. 9. 2026

## Rozsah

Tento checkpoint zachycuje headed Playwright smoke proti lokálnímu runtime
napojenému na schválený Supabase Sandbox `lpvypihpxhyjljikfzqo`. Nemění
aplikační kód, migrace, produkční databázi ani deployment.

Test proběhl v autentizované relaci existujícího uživatele s rolí `operator`.
Nepoužil demo auth, nevytvořil účet ani nemutoval data.

## Pozitivní Operator browser evidence

- `/workspace` zobrazil `mikestudio — Operator`, Operator Console, aktuální
  přiřazený lead, Product Script a supporting customer context.
- Po `goto` na `/workspace` a následném reloadu relace zůstala přihlášená;
  aktuální lead, timeline (`17`) a notes (`2`) se znovu načetly.
- Operator sidebar obsahoval povolené plochy jako Operator Console, Orders,
  Wallet, Calendar, Training, Call Logs a Settings.
- Síťové requesty na Sandbox Auth/User/Profile a lokální `/workspace` vrátily
  `200`; konzole po ustálení stránky měla 0 errorů.

Toto dokládá chování konkrétní authenticated Operator relace a reload.
Nejde samo o sobě o SQL persistence nebo obecný RLS důkaz; ten je veden v
samostatném cross-workspace checkpointu.

## Negativní Operator authorization evidence

- Přímá navigace na `/leads` zobrazila `Lead management unavailable` s textem,
  že operátoři nemají lead directory ani manuální create/edit přístup.
- Přímá navigace na `/team` zobrazila `Team operations unavailable` s textem,
  že queue operations jsou dostupné jen Team Leaderům a Administratorům.
- Oba negativní scénáře skončily bez console errorů. Sidebar současně tyto
  manager/admin plochy pro Operátora neobsahoval.

## Hranice a ověření

Nebyl spuštěn `Call Client`, `Create Order` ani jiná mutace; audio/provider
efekt a nová persistence proto nejsou součástí tohoto checkpointu. Produkční
ref `qlzrsookyobtvyekhrqi` nebyl použit.

- Playwright snapshot po autentizaci, po navigacích a po reloadu;
- Playwright console error a síťové statusy;
- explicitní Git diff, `git diff --check` a kontrola relativních Markdown
  odkazů;
- aplikační `npm` gate je N/A, protože commit mění pouze dokumentaci.
