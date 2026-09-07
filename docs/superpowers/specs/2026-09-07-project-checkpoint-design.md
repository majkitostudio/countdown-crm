# Celoprojektový checkpoint — návrh

## Cíl

Po uzavření Team Leader Review provést jednorázovou kontrolu celého Countdown CRM proti aktuálnímu kódu, databázi a ověřenému runtime. Výsledkem bude pravdivý checkpoint report a jediný prioritní backlog, podle kterého vzniknou další samostatné implementační plány.

## Hranice

Checkpoint neimplementuje nové funkce a nemění databázové schéma. Kontroluje produktové workflow, role a oprávnění, workspace a budoucí team scope, databázovou bezpečnost, runtime odolnost, pravdivost UI, kvalitu testů, externí integrace a dokumentaci.

Aktuální dokončený plán zůstává historickým důkazem. Nová roadmapa nesmí zpětně měnit jeho scope ani vydávat lokální, simulované nebo externě blokované chování za produkčně ověřené.

## Kontrolní vrstvy

1. Produkt a role: operátor, Team Leader a administrátor musí mít jasnou denní práci a jednu hlavní další akci.
2. Data a bezpečnost: workspace, role, RLS, grants, privileged funkce, audit a migrace musí odpovídat skutečnému modelu.
3. Runtime: dílčí selhání, persistence, reload, concurrency a externí závislosti musí mít pravdivé stavy.
4. Kvalita: testy, lint, typecheck, build, velikost kritických souborů, duplicity a závislosti.
5. Dokumentace: stavové údaje, počty, hotové body, blockery a priority se porovnají s kódem a důkazy.

## Prioritní model

- P0: bezpečnostní nebo datový problém a blocker interního pilotu.
- P1: stabilita hlavní pracovní smyčky a dokončení ověřitelného provozu.
- P2: týmový základ (`teams`, členství, Team Leader scope, správa a RLS), na kterém závisejí Results, týmové statistiky a část plánování směn.
- P3: role-aware pracovní den, presence, směny, navigace a pravdivý monitoring.
- P4: rozšíření kvality obsluhy, skriptů, uložených pohledů a dalších podpůrných workflow.
- Externě blokované: Telnyx a další kroky závislé na poskytovateli nebo účtu.
- Zmrazené do po-pilota: široké moduly, které nepomáhají uzavřít denní smyčku.

## Týmová struktura

Týmy již nejsou odložený doplněk. Checkpoint je zařadí jako produktový a bezpečnostní základ. Samostatný návrh po checkpointu musí rozhodnout kardinalitu členství, vazbu Team Leadera, správu týmů, migraci workspace-level čtení a RLS hranice. Operátorské Results nesmí vzniknout před touto hranicí.

## Výstupy

- `docs/superpowers/reports/2026-09-07-project-checkpoint.md` s důkazy, nálezy a riziky;
- přepracovaný `docs/AKTUALNI_STAV_A_DESATERO.md` jako jediný detailní backlog;
- synchronizovaný stručný přehled v `PROJECT.md`;
- aktualizovaný index v `docs/README.md`.

## Akceptační kritéria

- každá priorita má důvod, závislosti a ověřitelnou podmínku dokončení;
- hotové, neověřené, blokované a zmrazené položky jsou oddělené;
- týmová struktura je explicitní P2 základ;
- report uvádí i negativní nálezy a nejasnosti;
- dokumentace neobsahuje dvě konkurenční roadmapy;
- po úpravách projdou repo kontroly a `git diff --check`.
