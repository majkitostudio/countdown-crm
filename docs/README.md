# Dokumentace projektu

Tato složka obsahuje pouze aktuální dokumentaci, která pomáhá Countdown CRM vyvíjet, ověřovat a bezpečně provozovat. Není to instrukční soubor pro Codex ani archiv každého historického auditu.

## Aktivní dokumenty

| Dokument | Účel |
|---|---|
| [AKTUALNI_STAV_A_DESATERO.md](AKTUALNI_STAV_A_DESATERO.md) | Aktuální produktový stav, To-Do a podmínky interního pilotu. |
| [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) | Krátký týmový checklist pro návrh, implementaci a ověření změn. |
| [TELEPHONY_TELNYX_SETUP.md](TELEPHONY_TELNYX_SETUP.md) | Stav a konfigurace Telnyx vrstvy. Neobsahuje tajné klíče. |
| [superpowers/specs/2026-09-04-telnyx-outbound-pilot-design.md](superpowers/specs/2026-09-04-telnyx-outbound-pilot-design.md) | Schválený návrh pro dokončení outbound telefonie. |
| [superpowers/plans/2026-09-04-telnyx-outbound-pilot.md](superpowers/plans/2026-09-04-telnyx-outbound-pilot.md) | Implementační plán pro Telnyx outbound pilot. |

## Pořadí zdrojů pravdy

1. aktuální kód, migrace a skutečné ověření cílového prostředí,
2. `PROJECT.md`,
3. aktuální stavový dokument a Telnyx setup,
4. starší materiály, pokud jsou záměrně přidány jako historický důkaz.

Pokud dokument odporuje kódu nebo ověřenému prostředí, dokument je zastaralý a musí se opravit. Starý text se nemá používat jako skrytý pracovní příkaz.

## Co sem nepatří

- povinné workflow specifické pro Codex nebo jiný nástroj,
- neaktuální roadmapy vydávané za backlog,
- commitové katalogy,
- jednorázové auditní výpisy bez aktuálního účelu,
- tajné klíče, tokeny, hesla nebo osobní údaje.
