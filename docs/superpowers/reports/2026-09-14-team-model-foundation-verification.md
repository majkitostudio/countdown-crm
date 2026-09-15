# P2 Team Model Foundation — ověření

**Datum:** 14. 9. 2026
**Prostředí:** Supabase Sandbox `countdown-crm-sandbox-20260824`
**Migration:** `20260914003332_team_model_foundation`
**Scope:** databázový základ týmů a administrátorská serverová/UI vrstva

## Co bylo implementováno

- `public.teams` s workspace vazbou, unikátním slugem a stavem `active | archived`,
- `public.team_memberships` s historickým intervalem členství,
- omezení jednoho aktivního týmového členství pro operátora,
- Team Leader členství pro více týmů,
- ochrana proti členství uživatele z jiného workspace,
- ochrana proti nekompatibilní změně workspace role,
- serverové helpery pro Team Member / Team Leader scope,
- RLS pro čtení povolených týmů a administrátorské zápisy,
- auditní záznamy změn týmů a členství,
- serverová DAL v `src/lib/dal/teams.ts`,
- administrátorská stránka `/settings/users`,
- lokální kontraktní testy migrace a normalizace team slugů.

## Sandbox read-back

Migration history obsahuje:

```text
20260914003332 team_model_foundation
```

Databázový read-back potvrdil:

| Kontrola | Výsledek |
|---|---:|
| `public.teams` | existuje, 0 řádků |
| `public.team_memberships` | existuje, 0 řádků |
| policies na `teams` | 4 |
| policies na `team_memberships` | 4 |

V okamžiku bezprostředně po migraci byly tabulky prázdné. Migrace záměrně
nepřiřazuje žádné skutečné uživatele ani leady automaticky. Následné ruční
Sandbox nastavení týmů je doložené samostatně v
`2026-09-14-team-sandbox-setup.md`.

Security Advisor po migraci nehlásí problém s novými tabulkami. Zůstávají pouze
již známé nálezy:

- leaked-password protection je vědomě vypnutá pro současný interní provoz,
- starší `call_completion_requests` a `telephony_credentials` mají RLS bez policy
  podle existujícího projektu a nejsou součástí této týmové migrace.

## Repo ověření

- `npm test`: 126 test files / 576 tests passed,
- `npm run lint`: pass,
- `npm run typecheck`: pass,
- `npm run build`: pass,
- `git diff --check`: pass.

## Důležité hranice

- Production projekt `countdown-crm` nebyl změněn.
- Současná workspace-wide fronta zůstává beze změny.
- Team Leader scope se ještě nezúžil na tým.
- Nebyla vytvořena žádná testovací data ani členství.
- Před další migrací je nutné rozhodnout a provést bezpečné přiřazení skutečných
  workspace členů a provozních dat.
