# Checkpoint — konsolidace dokumentace, 1. 9. 2026

## Rozsah

Tento checkpoint zachycuje dokumentační slice, který sjednotil dnešní status,
pracovní proces, architektonické hranice a budoucí roadmapu. Nemění aplikační
kód, databázi, migrace, UI ani live prostředí.

## Nové autority

- [`../PROJECT_STATUS.md`](../PROJECT_STATUS.md) — jediný aktuální status.
- [`../WORKFLOW.md`](../WORKFLOW.md) — branch, worktree, commit, checkpoint a gate.
- [`../architecture.md`](../architecture.md) — současný serverový a datový kontrakt.
- [`../roadmap.md`](../roadmap.md) — pouze budoucí práce.
- [`README.md`](../../README.md) — rozcestník dokumentace.

## Zachovaná historie

Staré statusy, vize, commitové katalogy a auditní reporty zůstaly v repozitáři.
Jsou označené jako historické nebo evidence-only a jejich staré počty,
baseline a claims se nemají používat jako dnešní stav.

## Akceptace

- Aktuální status rozlišuje kód, repo gate, browser, persistence,
  authorization/RLS a otevřené priority.
- Wallet, Next Best Action, Team Leader Daily Brief a Customer 360 jsou
  uvedené jako implementované slices s přiznanou chybějící live evidence.
- Workflow výslovně rozlišuje `success`, `failure`, `simulation`,
  `unavailable` a `forbidden`.
- README vede na aktuální autority a nepopisuje live Copilot, telephony nebo
  externí messaging jako hotové runtime funkce.

## Ověření

Dokumentační slice byl zkontrolován přes explicitní diff, odkazy a
`git diff --check`. Repo baseline před docs změnou prošel `npm test` (29
test souborů / 121 testů) a `npm run check`; tyto kontroly se nemají číst jako
nový důkaz browser persistence, authorization nebo RLS.
