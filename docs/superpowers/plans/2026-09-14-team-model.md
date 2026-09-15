# P2 Team Model — implementační plán

**Specifikace:** `docs/superpowers/specs/2026-09-14-team-model-design.md`
**Stav:** foundation vlna implementovaná; databázové ověření a team scope zůstávají otevřené

## Cíl

Zavést skutečné týmy bez toho, aby se ztratil nebo nechtěně rozšířil přístup ke
stávajícím workspace datům. Implementace bude po menších vlnách a každá vlna
bude mít vlastní testy a důkaz.

## Fáze 0 — příprava a datový audit

- [ ] ověřit aktuální schéma `workspace_members`, `profiles`, `leads`, `lead_queue_items`, `calls`, `orders`,
- [ ] potvrdit, které tabulky už mají `workspace_id` a které potřebují týmový snapshot,
- [ ] sepsat seznam současných členů, leadů a queue položek bez automatického přiřazení,
- [ ] připravit rozhodnutí pro data bez týmu,
- [ ] přidat testovací kontrakty ještě před migrací.

## Fáze 1 — databázový základ týmů

- [x] vytvořit `teams`,
- [x] vytvořit `team_memberships`,
- [x] přidat constrainty pro workspace, role, aktivní členství a stav týmu,
- [x] přidat indexy pro workspace, team a user lookups,
- [x] přidat auditní události pro create/update/archive/membership changes,
- [x] přidat RLS pro Administratora a bezpečné čtení povolených týmů,
- [ ] ověřit cross-workspace denial v databázi cílového prostředí,
- [x] aktualizovat databázové typy.

## Fáze 2 — Team DAL a Users & Permissions

- [x] vytvořit serverovou datovou vrstvu pro seznam, detail a správu týmů,
- [x] vytvořit serverovou datovou vrstvu pro team memberships,
- [x] zachovat `workspace_members.role` jako hlavní workspace roli,
- [x] přidat pravidla pro uživatele bez týmu,
- [x] vytvořit administrátorskou stránku `Users & Permissions`,
- [x] vytvořit administrátorský týmový setup/readiness panel,
- [x] nepřidávat klientský filtr jako bezpečnostní hranici.

## Fáze 3 — týmové vlastnictví leadů a queue

- [x] přidat tým k lead ownership modelu,
- [x] přidat tým k `lead_queue_items`,
- [x] upravit claim, routing, reassign, recovery a callback pravidla,
- [x] ověřit, že operátor může dostat pouze lead svého týmu,
- [x] oddělit data bez týmu jako administrátorský problém,
- [x] připravit bezpečný cutover Team Leader scope v Sandboxu.

Důkaz poslední vlny je v `docs/superpowers/reports/2026-09-14-team-scope-enforcement.md`.
Production zatím záměrně nemá tuto migraci.

## Fáze 4 — historické snapshoty

- [x] uložit `team_id` při vzniku hovoru,
- [x] uložit `team_id` při ruční i post-call objednávce,
- [x] zachovat tým po pozdějším přesunu leadu nebo operátora,
- [x] aktualizovat atomické post-call RPC; queue event si zachovává týmový snapshot,
- [ ] dokončit samostatný linked důkaz idempotence a concurrency.

Důkaz: `docs/superpowers/reports/2026-09-14-team-historical-snapshots.md`.
Production zatím záměrně nemá tuto migraci.

## Fáze 5 — Team Leader pracovní plocha

- [x] omezit databázově hovory, objednávky, historii objednávek, review a navázané telephony sessions podle týmu,
- [x] seznam operátorů Team Leadera ignoruje archivované týmy,
- [ ] změnit `/team` z workspace-wide pohledu na team scope,
- [ ] Team Leader uvidí jen vlastní týmy,
- [ ] Administrator uvidí všechny týmy s výběrem konkrétního týmu,
- [ ] queue, presence, exceptions, callbacks a brief budou týmově omezené,
- [ ] odstranit nebo pravdivě označit workspace agregace, které nejsou týmové,
- [ ] přidat prázdné, nedostupné a bez-týmové stavy.

Důkaz aktuální scope vlny: `docs/superpowers/reports/2026-09-14-team-leader-historical-scope.md`.

## Fáze 6 — ověření

- [ ] `npm test`,
- [x] `npm run lint`,
- [x] `npm run typecheck`,
- [ ] `npm run build`,
- [ ] lokální databázové testy,
- [ ] linked read-only databázový důkaz,
- [ ] autentizovaný browser smoke pro Administratora,
- [ ] autentizovaný browser smoke pro Team Leadera týmu A,
- [ ] autentizovaný browser smoke pro Team Leadera týmu B,
- [ ] autentizovaný browser smoke pro Operátora,
- [x] cross-team denial v Sandbox SQL transakční zkoušce,
- [ ] cross-workspace denial pro novou team scope v cílovém důkazu,
- [x] reload/read-back a cleanup transakční zkoušky,
- [x] aktualizace `PROJECT.md` a aktuálního backlogu.

## Podmínky dokončení P2

P2 není hotové, dokud:

1. Administrator spravuje týmy a členství.
2. Operátor patří do definovaného týmu nebo je jasně označen jako bez týmu.
3. Team Leader vidí pouze svůj povolený scope.
4. Queue routing a reassign respektují tým.
5. Historické hovory a objednávky mají stabilní týmový snapshot.
6. Cross-team a cross-workspace pokusy selžou na serveru i v databázi.
7. Týmové výsledky nerozmělní nebo nepřisoudí data bez známého týmu.
8. Existuje autentizovaný browser a SQL důkaz včetně cleanupu.
