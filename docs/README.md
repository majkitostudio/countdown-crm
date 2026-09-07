# Dokumentace projektu

Tato složka obsahuje pouze aktuální dokumentaci, která pomáhá Countdown CRM vyvíjet, ověřovat a bezpečně provozovat. Není to instrukční soubor pro Codex ani archiv každého historického auditu.

## Aktivní dokumenty

| Dokument | Účel |
|---|---|
| [AKTUALNI_STAV_A_DESATERO.md](AKTUALNI_STAV_A_DESATERO.md) | Aktuální produktový stav, To-Do a podmínky interního pilotu. |
| [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) | Krátký týmový checklist pro návrh, implementaci a ověření změn. |
| [TELEPHONY_TELNYX_SETUP.md](TELEPHONY_TELNYX_SETUP.md) | Stav Telnyx vrstvy a dočasná validační cesta přes Docker SIP laboratoř. Neobsahuje tajné klíče. |
| [superpowers/reports/2026-09-07-project-checkpoint.md](superpowers/reports/2026-09-07-project-checkpoint.md) | Celoprojektový checkpoint, důkazy, rizika a důvody priorit P0–P4. |
| [superpowers/reports/2026-09-07-linked-function-drift.md](superpowers/reports/2026-09-07-linked-function-drift.md) | Root-cause důkaz, že raw function drift je CRLF/LF false positive, a nový sémantický verifier. |
| [superpowers/reports/2026-09-07-p0-2-privileged-rpc-pgtap.md](superpowers/reports/2026-09-07-p0-2-privileged-rpc-pgtap.md) | Návrh a lokální důkazy izolace pěti privilegovaných RPC a přesunu `pgtap` mimo `public`. |
| [P0_3_REMOTE_DB_RUNNER.md](P0_3_REMOTE_DB_RUNNER.md) | Bezpečný read-only runner pro skutečný linked databázový důkaz. |
| [superpowers/specs/2026-09-07-project-checkpoint-design.md](superpowers/specs/2026-09-07-project-checkpoint-design.md) | Schválená hranice a prioritní model checkpointu. |
| [superpowers/plans/2026-09-07-project-checkpoint.md](superpowers/plans/2026-09-07-project-checkpoint.md) | Provedený plán checkpointu a jeho ověřovací kroky. |
| [superpowers/specs/2026-09-05-local-telephony-settings-design.md](superpowers/specs/2026-09-05-local-telephony-settings-design.md) | Schválená specifikace workspace adapteru, admin-only `/telephony` a lokální Asterisk laboratoře. |
| [superpowers/reports/2026-09-05-local-telephony-verification.md](superpowers/reports/2026-09-05-local-telephony-verification.md) | Důkazní report lokálního Docker/Asterisk stavu, automatických kontrol a otevřených browser blockerů. |
| [superpowers/plans/2026-09-05-local-telephony-settings-and-console.md](superpowers/plans/2026-09-05-local-telephony-settings-and-console.md) | Implementační plán a stav jednotlivých kroků lokální telefonní laboratoře. |
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
