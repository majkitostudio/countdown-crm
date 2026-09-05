# Task 1 — database parity evidence

Date: 2026-09-05 (Europe/Prague)

Overall classification: `schema-drift`.

Migration history is fully aligned (`78/78`), but the authoritative linked schema diff completed successfully and returned non-empty SQL changes. Therefore this evidence does not support a claim of full schema parity or a production rollout.

## Repository / local evidence

| Evidence | Actual result |
|---|---|
| Branch / commit | `main` / `f2cc866f1bd3e4b6875bdec537a83344e0e044d5` |
| Supabase CLI | `2.116.0`, `npx supabase --version` exit `0` |
| Config project id | `countdown-crm` |
| Local migration source | `supabase/migrations/` |
| Local migration count | `78` files, counted from `Get-ChildItem supabase/migrations -File` |
| Local migration IDs | `20260810071051`, `20260810071052`, `20260810071112`, `20260810071115`, `20260810071138`, `20260810071243`, `20260810071327`, `20260810071346`, `20260810104508`, `20260811235808`, `202608150001`, `202608150002`, `20260816180916`, `202608170001`, `20260817200938`, `20260817201609`, `20260817201812`, `20260817235507`, `202608180001`, `20260818162302`, `20260818183147`, `20260818195000`, `20260818195500`, `20260818210000`, `20260818210500`, `20260819003504`, `20260819005242`, `20260819090000`, `20260819090500`, `20260819100000`, `20260819103000`, `20260819110000`, `20260819143532`, `20260819144339`, `20260820190153`, `20260821102718`, `20260821104557`, `20260821151606`, `20260821204210`, `20260821225730`, `20260821230217`, `20260821230307`, `20260821230326`, `20260821230550`, `20260821230618`, `20260821230811`, `20260821230905`, `20260822023213`, `20260822114853`, `20260822115016`, `20260822120928`, `20260822134103`, `20260822134130`, `20260823010004`, `20260823041802`, `20260824100836`, `20260824104323`, `20260824104408`, `20260824104747`, `20260824112120`, `20260824210525`, `20260827005441`, `20260827012414`, `20260830072304`, `20260830100000`, `20260830205207`, `20260831060401`, `20260831072645`, `20260902090000`, `20260902150000`, `20260902160000`, `20260903090000`, `20260904104023`, `20260904120000`, `20260905052514`, `20260905090000`, `20260905150000`.

## Linked sandbox evidence

The linked target was treated as the sandbox target for this task. Identity is redacted: project ref `lpv…zqo`, URL host `lpvypihpxhyjljikfzqo.supabase.co`. No secrets or key values were read into the report.

| Command / check | Actual result | Exit |
|---|---|---:|
| `npx supabase migration list --linked --output-format json` | `linked_count=78`, `matched_count=78`, `mismatch_count=0` | 0 |
| `npx supabase db push --linked --dry-run` | Remote reported `upToDate=true`; migrations, seeds and roles were empty | 0 |
| `npx supabase db diff --linked --schema public` (retry with Docker available) | Completed with pg-delta; `schemas=[public]`, `dropStatements=[]`, but returned non-empty SQL diff containing `CREATE OR REPLACE FUNCTION` statements, including wallet, blueprint, call, script, fulfillment and operator-presence functions | 0 |
| Read-only linked SQL: database/version | PostgreSQL `17.6`; query succeeded | 0 |
| Read-only linked SQL: critical tables/RLS/policies/grants/indexes/constraints | All 13 critical tables exist; RLS is enabled on all; policy, grant, index and constraint metadata was returned | 0 |
| `npx supabase db advisors --linked` | Completed with 5 WARN findings: pgtap in `public`, 3 authenticated SECURITY DEFINER functions, leaked-password protection disabled | 0 |

Critical-table read-back covered `workspace_telephony_settings`, `operator_presence`, `lead_queue_items`, `lead_queue_events`, `wallet_settings`, `wallet_bonus_rules`, `wallet_transactions`, `product_scripts`, `product_script_versions`, `audit_logs`, `telephony_credentials`, `telephony_call_sessions`, and `telephony_call_events`. `telephony_credentials` was RLS-enabled with no policy and no `authenticated` grant; this was recorded as the observed state, not changed.

The migration list is aligned, but the successful non-empty schema diff is evidence of schema drift. No forward apply was performed because the dry-run had no pending migration and the diff requires investigation before any rollout.

## Production evidence

Production was not selected, connected to, or mutated in this task.

- No separate production project ref was supplied or selected.
- Repository inspection found only `.env.local` and `.env.example`; values were not printed. The linked `.env.local` target was used only as the redacted linked sandbox identity above.
- No production migration list, production dry-run, production schema diff, production advisors check, or production read-only SQL was run.
- No production push, migration repair, reset, destructive SQL, merge, or push was performed.

Production status: `blocked/not selected`. A separately identified production project needs an independent read-only migration list, dry-run, schema diff, and explicit approval before any production push.

## Rollout decision

Do not roll out. The linked sandbox has matching migration history and no pending migration, but the successful schema diff reports drift. Investigate and reconcile the function-definition drift in a separate approved task; this Task 1 does not authorize a repair or production change.

## Final repository verification

After removing the internal report from the Git index and staging only this public report, the final post-commit verification was:

```text
git status --short
<empty>

git diff --check
exit 0

git diff --stat
<empty>
```

The internal SDD report remains available locally at `.superpowers/sdd/2026-09-05-p1-p5-settings-shifts-roadmap/task-1-report.md` but is ignored and is not tracked in the repository.
