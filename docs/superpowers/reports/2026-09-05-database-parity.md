# Task 1 — database parity evidence

Date: 2026-09-05 (Europe/Prague)

Overall classification: `schema-drift`. Migration history is fully aligned (`78/78`), but the successful linked schema diff returned non-empty SQL changes.

## Repository / local evidence

| Evidence | Actual result |
|---|---|
| Branch / commit | `main` / `f2cc866f1bd3e4b6875bdec537a83344e0e044d5` |
| Supabase CLI | `2.116.0`, exit `0` |
| Config project id | `countdown-crm` |
| Local migration count | `78` files from `Get-ChildItem supabase/migrations -File` |

Authoritative local IDs, in filesystem order:

```text
20260810071051, 20260810071052, 20260810071112, 20260810071115, 20260810071138, 20260810071243, 20260810071327, 20260810071346, 20260810104508, 20260811235808, 202608150001, 202608150002, 20260816180916, 202608170001, 20260817200938, 20260817201609, 20260817201812, 20260817235507, 202608180001, 20260818162302, 20260818183147, 20260818195000, 20260818195500, 20260818210000, 20260818210500, 20260819003504, 20260819005242, 20260819090000, 20260819090500, 20260819100000, 20260819103000, 20260819110000, 20260819143532, 20260819144339, 20260820190153, 20260821102718, 20260821104557, 20260821151606, 20260821204210, 20260821225730, 20260821230217, 20260821230307, 20260821230326, 20260821230550, 20260821230618, 20260821230811, 20260821230905, 20260822023213, 20260822114853, 20260822115016, 20260822120928, 20260822134103, 20260822134130, 20260823010004, 20260823041802, 20260824100836, 20260824104323, 20260824104408, 20260824104450, 20260824104747, 20260824112120, 20260824210525, 20260827005441, 20260827012414, 20260830072304, 20260830100000, 20260830205207, 20260831060401, 20260831072645, 20260902090000, 20260902150000, 20260902160000, 20260903090000, 20260904104023, 20260904120000, 20260905052514, 20260905090000, 20260905150000
```

## Linked sandbox evidence

The linked target was treated as sandbox for this task. Redacted identity: project ref `lpv…zqo`, URL host `lpvypihpxhyjljikfzqo.supabase.co`. Secrets were not printed.

| Check | Actual result | Exit |
|---|---|---:|
| `npx supabase migration list --linked --output-format json` | `count=78`, `matched_count=78`, `mismatch_count=0` | 0 |
| `npx supabase db push --linked --dry-run` | `upToDate=true`; no migrations, seeds, or roles pending | 0 |
| `npx supabase db diff --linked --schema public` retry | Docker succeeded; pg-delta returned non-empty `CREATE OR REPLACE FUNCTION` diff in `public`; `schemas=[public]`, `dropStatements=[]` | 0 |
| Read-only SQL | PostgreSQL `17.6`; all 13 critical tables exist; RLS enabled; policies, grants, indexes and constraints returned | 0 |
| `npx supabase db advisors --linked` | 5 WARN findings returned | 0 |

The critical read-only check covered `workspace_telephony_settings`, `operator_presence`, queue tables, wallet tables, script tables, `audit_logs`, and telephony tables. `telephony_credentials` was RLS-enabled with no policy and no `authenticated` grant; it was not changed. No forward apply, reset, repair, destructive SQL, or production operation occurred.

## Production evidence

Production was not selected, connected to, or mutated. No separate production ref was supplied or selected; no production migration list, dry-run, schema diff, advisors check, or read-only SQL was run. Repository inspection found only `.env.local` and `.env.example`; values were not printed. Production status is `blocked/not selected` and requires independent read-only validation plus explicit approval before any push.

## Rollout decision

Do not roll out. Migration history is aligned and the sandbox has no pending migrations, but the successful non-empty schema diff is evidence of schema drift requiring a separate investigation.

## Consistency and repository evidence

The migration rerun produced:

```text
Get-ChildItem supabase/migrations -File | Sort-Object Name
count=78
npx supabase migration list --linked --output-format json
command_exit=0
count=78
matched_count=78
mismatch_count=0
```

The previously omitted `20260824104450_fix_atomic_call_order_items_workspace_alias.sql` is included above. The internal SDD report remains local at `.superpowers/sdd/2026-09-05-p1-p5-settings-shifts-roadmap/task-1-report.md` and is protected by the tracked root `.gitignore` rule `/.superpowers/`; it is not tracked.

Final verification after the new documentation-only commit:

```text
git status --short
<empty>
git diff --check
exit 0
git diff --stat
<empty>
git check-ignore -v .superpowers/sdd/2026-09-05-p1-p5-settings-shifts-roadmap/task-1-report.md
.gitignore:52:/.superpowers    .superpowers/sdd/2026-09-05-p1-p5-settings-shifts-roadmap/task-1-report.md
```
