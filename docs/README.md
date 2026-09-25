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
| [superpowers/specs/2026-09-11-operator-workspace-client-profile-design.md](superpowers/specs/2026-09-11-operator-workspace-client-profile-design.md) | Schválený P1 návrh Klientského profilu, focus režimu skriptu a ověřené doručovací adresy. |
| [superpowers/plans/2026-09-11-operator-client-profile-and-verified-address.md](superpowers/plans/2026-09-11-operator-client-profile-and-verified-address.md) | Aktuální implementační plán schváleného P1 kroku pro Operator Console. |
| [superpowers/reports/2026-09-12-operator-client-profile-verification.md](superpowers/reports/2026-09-12-operator-client-profile-verification.md) | Automatické a databázové ověření P1.6; původní browser průchod byl blokovaný datovou dostupností, navazující P1.7 už doložil část aktivního assignmentu. |
| [superpowers/reports/2026-09-14-p1-7-full-shift-smoke.md](superpowers/reports/2026-09-14-p1-7-full-shift-smoke.md) | Autentizovaný P1.7 browser smoke pro Administrator, Team Leader a Operator včetně reloadu, SQL read-backu, cleanupu a opravy RLS poznámek operátora. |
| [superpowers/reports/2026-09-14-p1-8-runtime-dependency-audit.md](superpowers/reports/2026-09-14-p1-8-runtime-dependency-audit.md) | P1.8 audit runtime závislostí telefonie, bezpečné patch aktualizace a důkaz hranice telefonního adaptéru; živý provider zůstává externě blokovaný. |
| [superpowers/specs/2026-09-14-team-model-design.md](superpowers/specs/2026-09-14-team-model-design.md) | Schválený návrh skutečných týmů, členství, Team Leader scope a bezpečného přechodu ze současného workspace modelu. |
| [superpowers/plans/2026-09-14-team-model.md](superpowers/plans/2026-09-14-team-model.md) | Implementační plán P2 Team Model po jednotlivých bezpečných vlnách. |
| [superpowers/specs/2026-09-16-team-workspace-and-ai-quality-design.md](superpowers/specs/2026-09-16-team-workspace-and-ai-quality-design.md) | Schválená specifikace Team Workspace, Daily Checkpoint, týmových výsledků a AI kontroly poznámek reálných hovorů. |
| [superpowers/plans/2026-09-16-team-workspace-and-ai-quality.md](superpowers/plans/2026-09-16-team-workspace-and-ai-quality.md) | Návrh implementačních vln Team Workspace a AI kontroly kvality v Sandboxu. Production zůstává beze změny. |
| [superpowers/reports/2026-09-14-team-model-foundation-verification.md](superpowers/reports/2026-09-14-team-model-foundation-verification.md) | Ověření první týmové foundation vlny v Supabase Sandboxu a lokálního repo gate. |
| [superpowers/reports/2026-09-14-team-sandbox-setup.md](superpowers/reports/2026-09-14-team-sandbox-setup.md) | Read-back skutečného nastavení týmů P1/P2/P3 a prvních členství v Sandboxu. |
| [superpowers/reports/2026-09-14-team-historical-snapshots.md](superpowers/reports/2026-09-14-team-historical-snapshots.md) | Ověření historického týmu u nových hovorů a objednávek v Sandboxu. |
| [superpowers/reports/2026-09-14-team-leader-historical-scope.md](superpowers/reports/2026-09-14-team-leader-historical-scope.md) | Ověření týmového omezení hovorů, objednávek, review, navázaných relací a Exception Queue pro Team Leadera. |
| [superpowers/specs/2026-09-11-unified-operator-console-design-system.md](superpowers/specs/2026-09-11-unified-operator-console-design-system.md) | Schválený systém sjednocení všech CRM ploch podle Operator Console. |
| [superpowers/plans/2026-09-11-unified-operator-console-design-system.md](superpowers/plans/2026-09-11-unified-operator-console-design-system.md) | Provedený plán sjednocení shellu, denních i administračních cest. |
| [superpowers/reports/2026-09-12-unified-operator-console-design-system-verification.md](superpowers/reports/2026-09-12-unified-operator-console-design-system-verification.md) | Aktuální automatizovaný a admin browser důkaz sjednoceného vzhledu. |
| [superpowers/specs/2026-09-12-entry-workspace-state-completeness-design.md](superpowers/specs/2026-09-12-entry-workspace-state-completeness-design.md) | Schválený návrh jednotných Login, Dashboard, Workspace a systémových stavů. |
| [superpowers/plans/2026-09-12-entry-workspace-state-completeness.md](superpowers/plans/2026-09-12-entry-workspace-state-completeness.md) | Implementační plán vstupní a stavové vlny. |
| [superpowers/reports/2026-09-12-entry-workspace-state-completeness-verification.md](superpowers/reports/2026-09-12-entry-workspace-state-completeness-verification.md) | Automatické a autentizované admin browser ověření vstupní a Workspace vlny. |
| [superpowers/specs/2026-09-05-local-telephony-settings-design.md](superpowers/specs/2026-09-05-local-telephony-settings-design.md) | Schválená specifikace workspace adapteru, admin-only `/telephony` a lokální Asterisk laboratoře. |
| [superpowers/reports/2026-09-05-local-telephony-verification.md](superpowers/reports/2026-09-05-local-telephony-verification.md) | Důkazní report lokálního Docker/Asterisk stavu, automatických kontrol a otevřených browser blockerů. |
| [superpowers/plans/2026-09-05-local-telephony-settings-and-console.md](superpowers/plans/2026-09-05-local-telephony-settings-and-console.md) | Implementační plán a stav jednotlivých kroků lokální telefonní laboratoře. |
| [superpowers/specs/2026-09-04-telnyx-outbound-pilot-design.md](superpowers/specs/2026-09-04-telnyx-outbound-pilot-design.md) | Schválený návrh pro dokončení outbound telefonie. |
| [superpowers/plans/2026-09-19-p1-5-onboarding-trainer.md](superpowers/plans/2026-09-19-p1-5-onboarding-trainer.md) | Implementační plán onboarding trenéru P1.5. |
| [superpowers/specs/2026-09-19-p1-5-onboarding-trainer-design.md](superpowers/specs/2026-09-19-p1-5-onboarding-trainer-design.md) | Schválená specifikace onboarding trenéru P1.5. |
| [superpowers/reports/2026-09-15-p1-7-order-evidence.md](superpowers/reports/2026-09-15-p1-7-order-evidence.md) | Důkaz ruční i post-call objednávky včetně adresního snapshotu a read-backu. |
| [superpowers/reports/2026-09-16-gemini-call-quality-verification.md](superpowers/reports/2026-09-16-gemini-call-quality-verification.md) | Ověření serverové Gemini kontroly poznámek (`pending` → `ok`, atomický claim). |
| [superpowers/reports/2026-09-16-team-assistance-browser-verification.md](superpowers/reports/2026-09-16-team-assistance-browser-verification.md) | Browser ověření žádostí o asistenci a jejich převzetí/uzavření. |
| [superpowers/reports/2026-09-17-speech-to-text-browser-smoke.md](superpowers/reports/2026-09-17-speech-to-text-browser-smoke.md) | Částečný smoke browserového přepisu v trenažéru, vady a odložené rozhodnutí. |
| [superpowers/reports/2026-09-18-team-workspace-verification.md](superpowers/reports/2026-09-18-team-workspace-verification.md) | Ověřovací průchod `/team` v Sandboxu (role, cross-team, reload, prázdné stavy). |
| [superpowers/reports/2026-09-19-team-checkpoint-verification.md](superpowers/reports/2026-09-19-team-checkpoint-verification.md) | Plný průchod novinek Team Checkpointu (overdue odznak, detail, claim → resolve, tři role). |
| [superpowers/reports/2026-09-20-team-checkpoint-layout-verification.md](superpowers/reports/2026-09-20-team-checkpoint-layout-verification.md) | Ověření Macaly layoutu checkpointu (sekce Callbacky/Kvalita, detail, 12/12 smoke). |

## Sdílená AI paměť

| Dokument | Účel |
|---|---|
| [ai/README.md](ai/README.md) | Návod pro AI agenty, jak sdílenou paměť číst a udržovat. |
| [ai/CURRENT_STATE.md](ai/CURRENT_STATE.md) | Stručný ověřený stav produktu, architektury, obrazovek a validace. |
| [ai/AI_WORKLOG.md](ai/AI_WORKLOG.md) | Stručný chronologický audit významné práce AI agentů. |
| [ai/DECISIONS.md](ai/DECISIONS.md) | Aktivní a historická rozhodnutí s dopadem na další práci. |
| [ai/OPEN_QUESTIONS.md](ai/OPEN_QUESTIONS.md) | Nevyřešené otázky, rozpory a informace čekající na ověření. |
| [ai/PRODUCT_DIRECTION.md](ai/PRODUCT_DIRECTION.md) | Produktová identita, pracovní smyčka a směr odvozený ze zdrojů projektu. |

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
