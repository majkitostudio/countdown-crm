# AI Worklog

> Stručný chronologický audit významné práce AI agentů. Nejde o přepis konverzací.

## Initial Documentation Setup

### Date

2026-09-25

### Agent

Codex

### Task

Zavést sdílenou AI memory layer pro Countdown CRM bez změny aplikace, databázového schématu, konfigurace nebo business logiky.

### Findings

- Countdown CRM je workspace-scoped CRM pro výkonnostní call centra a tele-sales s Operator Console jako hlavní pracovní plochou.
- Aktuální zdroje pravdy jsou především kód/migrace/ověření, `PROJECT.md`, aktuální stavový dokument a specializované dokumenty v `docs/`.
- Projekt je ve stabilizaci před interním pilotem.
- Živá Telnyx telefonie je externě blokovaná; trénink a AI quality check mají omezený, explicitně dokumentovaný rozsah.
- Starší `docs/PROJECT_STATUS.md` a novější stavové snapshoty se liší v některých číslech, zejména v počtu testů.

### Changes

- Vytvořeny `docs/ai/README.md`, `CURRENT_STATE.md`, `AI_WORKLOG.md`, `DECISIONS.md`, `OPEN_QUESTIONS.md` a `PRODUCT_DIRECTION.md`.
- `docs/README.md` doplněn o index sdílené AI paměti.
- Aplikační kód, databázové migrace, konfigurace a existující necommitované změny mimo `docs/ai/` nebyly měněny.

### Validation

- Provedena read-only inventura repozitáře, rout, konfigurace, dokumentace, migrací, testů a poslední Git historie.
- Dokumenty budou validovány kontrolou existence, klasifikace tvrzení, odkazů na zdroje a interní konzistence.
- Plná aplikační testovací sada nebyla spuštěna, protože jde o docs-only změnu a zadání požaduje testy spouštět pouze pokud jsou nutné pro ověření faktického stavu.

### Decisions

- **DECISION** — Sdílená AI paměť bude mít malou pevnou strukturu šesti tematických dokumentů plus README.
- **DECISION** — Konfliktní nebo neověřené informace se zachovají jako `UNKNOWN`, nebudou nahrazeny odhadem.

### Open Questions

- Který test-count snapshot je autoritativní pro aktuální pracovní strom, pokud se má přesný počet znovu uvádět?
- Kdy bude k dispozici správné Telnyx číslo a ověřený live outbound průchod?

### Status

Dokumentační memory layer vytvořena, strukturálně ověřena, otestována v aktuálním pracovním stromu a integrována na `main` v commitu `97ff31a`.
