# Task 1 — database parity evidence

Date: 2026-09-05 (Europe/Prague)
Classification: `same` for migration history and linked dry-run; `blocked` for full schema-diff parity because the local Docker daemon was unavailable.

## Scope and safety

- This report covers only Task 1. No application code was changed.
- The linked target was treated as the sandbox target for this task. No production project was pushed, repaired, reset, or otherwise mutated.
- No secrets, keys, tokens, connection strings, or raw `.env.local` values are included here.
- No demo-auth substitute was used. Read-only SQL was executed through `supabase db query --linked`.

## Baseline evidence

- Branch: `main`
- Commit: `f2cc866f1bd3e4b6875bdec537a83344e0e044d5`
- Local migrations: 61
- Supabase CLI: `2.116.0` (`npx supabase --version`, exit `0`)
- Config project id: `countdown-crm`
- Linked project identity: ref `lpv…zqo`; URL host `lpvypihpxhyjljikfzqo.supabase.co` (redacted identity only)
- Environment separation: only `.env.local` and `.env.example` exist in the repository. The linked identity was used as sandbox evidence per task scope; no separate production identity was selected or modified.

## Local migration list

`20260810071051`, `20260810071052`, `20260810071112`, `20260810071115`, `20260810071138`, `20260810071243`, `20260810071327`, `20260810071346`, `20260810104508`, `20260811235808`, `202608150001`, `202608150002`, `20260816180916`, `202608170001`, `20260817200938`, `20260817201609`, `20260817201812`, `20260817235507`, `202608180001`, `20260818162302`, `20260818183147`, `20260818195000`, `20260818195500`, `20260818210000`, `20260818210500`, `20260819003504`, `20260819005242`, `20260819090000`, `20260819090500`, `20260819100000`, `20260819103000`, `20260819110000`, `20260819143532`, `20260819144339`, `20260820190153`, `20260821102718`, `20260821104557`, `20260821151606`, `20260821204210`, `20260821225730`, `20260821230217`, `20260821230307`, `20260821230326`, `20260821230550`, `20260821230618`, `20260821230811`, `20260821230905`, `20260822023213`, `20260822114853`, `20260822115016`, `20260822120928`, `20260822134103`, `20260822134130`, `20260823010004`, `20260823041802`, `20260824100836`, `20260824104323`, `20260824104408`, `20260824104450`, `20260824104747`, `20260824112120`, `20260824210525`, `20260827005441`, `20260827012414`, `20260830072304`, `20260830100000`, `20260830205207`, `20260831060401`, `20260831072645`, `20260902090000`, `20260902150000`, `20260902160000`, `20260903090000`, `20260904104023`, `20260904120000`, `20260905052514`, `20260905090000`, `20260905150000`.

## Linked history and diff checks

| Check | Result | Exit |
|---|---|---:|
| `npx supabase migration list --linked` | All 61 local migration ids matched remote ids; no local-only or remote-only entries | 0 |
| `npx supabase db push --linked --dry-run` | `upToDate=true`; migrations/seeds/roles empty; no migration would be pushed | 0 |
| `npx supabase db diff --linked --schema public` | Could not create shadow database: Docker API unavailable at `dockerDesktopLinuxEngine` | 1 |
| `npx supabase db advisors --linked` | Completed; 5 WARN findings returned (pgtap in public, 3 authenticated SECURITY DEFINER functions, leaked-password protection disabled) | 0 |

The failed diff is an infrastructure limitation, not evidence of schema drift. It prevents claiming complete schema parity from `db diff` alone.

## Read-only schema, RLS, constraints, indexes and grants

The linked read-only query returned `EXIT=0` for all 13 critical tables. Every table existed, every table had RLS enabled, and every table had at least one policy except `telephony_credentials`, which is intentionally RLS-enabled with no policy and no `authenticated` table grant. Index and constraint counts were read back as follows:

| Table | Constraints | Indexes | Policies | RLS | Notable grants |
|---|---:|---:|---:|---|---|
| `workspace_telephony_settings` | 4 | 1 | 3 | on | authenticated CRUD subset; service_role SIU |
| `operator_presence` | 4 | 2 | 1 | on | authenticated SELECT |
| `lead_queue_items` | 9 | 8 | 1 | on | authenticated SELECT |
| `lead_queue_events` | 8 | 7 | 1 | on | authenticated SELECT |
| `wallet_settings` | 5 | 1 | 1 | on | authenticated SELECT |
| `wallet_bonus_rules` | 7 | 3 | 1 | on | authenticated SELECT |
| `wallet_transactions` | 13 | 4 | 1 | on | authenticated SELECT |
| `product_scripts` | 6 | 5 | 3 | on | authenticated SIU |
| `product_script_versions` | 9 | 4 | 3 | on | authenticated SIU |
| `audit_logs` | 2 | 2 | 2 | on | authenticated CRUD subset |
| `telephony_credentials` | 5 | 2 | 0 | on | postgres only |
| `telephony_call_sessions` | 9 | 5 | 1 | on | authenticated SELECT; service_role SIU |
| `telephony_call_events` | 5 | 4 | 1 | on | authenticated SELECT; service_role SIU |

Constraint types and policy names were also read back; no read-only query error occurred. The linked database reported PostgreSQL `17.6`.

## Forward rollout decision

- No forward apply was performed: the linked sandbox dry-run reported no pending migrations.
- `migration repair` was not used because migration history already matched.
- Production rollout is an open blocker for this task: no separate production target was selected or validated, and the brief forbids a production push without a separate dry-run and explicit confirmation. The next production step must be a separately identified, read-only migration list/dry-run/schema check followed by explicit approval.
- Safe decision: sandbox migration history is `same`; do not claim full schema parity until `db diff --linked --schema public` can run with Docker available. Do not roll out production from this evidence alone.

## Verification notes

Before and after the report change, `git status --short`, `git diff --check`, and `git diff --stat` were run. Final values are recorded in the task response and must be clean except for this evidence report before commit.
