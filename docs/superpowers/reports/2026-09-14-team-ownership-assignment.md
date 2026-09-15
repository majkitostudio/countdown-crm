# Team ownership assignment — Sandbox

Datum: 2026-09-14

## Co bylo přidáno

Sandbox nyní obsahuje bezpečný administrátorský krok pro označení odpovědného týmu u:

- zákazníků (`leads`),
- položek pracovní fronty (`lead_queue_items`).

Administrátor může vybrat aktivní tým P1/P2/P3 nebo vrátit záznam do stavu „Bez přiřazení“.

## Bezpečnost a chování

- změnu může provést pouze Administrator daného workspace,
- tým musí patřit do stejného workspace,
- archivovaný tým nelze použít pro nové přiřazení,
- stav fronty se při změně nemění,
- přidělený operátor se při změně nemění,
- změna položky fronty se zapisuje do `lead_queue_events` jako `team_assigned`,
- každá změna se zapisuje také do `audit_logs`,
- historické záznamy hovorů a objednávek se touto změnou nemění.

## Aktuální data

V Sandboxu bylo schválené testovací přiřazení dokončeno:

- 5 testovacích zákazníků je přiřazeno k P1,
- všech 5 jejich položek fronty je přiřazeno k P1,
- 3 starší zákazníci zůstali bez týmu, protože jejich obchodní zařazení není potvrzené,
- `Playwright Test Lead` byl jako kontrolní testovací záznam uzavřen a odebrán z aktivní práce,
- žádný skutečný operátor ani stav historického hovoru nebo objednávky se tím nezměnil.

Současná data jsou převážně kontrolní testovací záznamy (`P1.6`, `P1.7`, `Playwright`). Ostré týmové filtrování fronty se proto stále nezapíná, dokud nebude připravené personální obsazení P2 a P3.

## Migrace

- `20260914004710_team_ownership_assignment`
- `20260914005014_team_ownership_fk_indexes`

Produkce nebyla změněna.
