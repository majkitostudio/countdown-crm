# Task 2 report — migration history comparison and safe reconciliation

Observed on 2026-09-04 in the isolated `codex/p1-runtime-stability` worktree.
This task stayed within the database/migration boundary and did not implement
Calendar or Wallet application code.

## Scope and starting state

- Worktree: `C:/Users/mikes/.projects/countdown-crm/.worktrees/codex-p1-runtime`
- Branch: `codex/p1-runtime-stability`
- Starting HEAD for Task 2: `c7917e0a3a39df59434bcbc0e3fe920587935390`
- Task 1 evidence report reviewed:
  `docs/superpowers/reports/2026-09-04-p1-runtime-stability-verification.md`
- Preserved user-owned files:
  - untracked `Review.md`
  - untracked `docs/superpowers/plans/2026-09-04-p1-runtime-stability-and-migration-history.md`
- `supabase/schema.sql` was not modified and was not treated as migration
  source-of-truth.

## Supabase CLI and target availability

### Command evidence

1. `supabase --version`
   - Exit code: `1`
   - Result: PowerShell reported `supabase` is not recognized as a cmdlet,
     function, script file, or executable program.

2. `Get-Content -Raw 'supabase/config.toml'`
   - Exit code: `1`
   - Result: path not found at
     `C:\Users\mikes\.projects\countdown-crm\.worktrees\codex-p1-runtime\supabase\config.toml`

### Classification

- Supabase CLI: `blocked`
- Local Supabase project configuration: `blocked`
- Linked Supabase target availability: `blocked`

Because the CLI is unavailable and no local Supabase project configuration is
present in this worktree, the linked history and schema comparison commands
required by the brief could not be executed safely. No remote mutation was
attempted.

## Local migration inventory

### Command evidence

1. `Get-ChildItem 'supabase/migrations' -File | Sort-Object Name | Select-Object -ExpandProperty Name`
   - Exit code: `0`
   - Result: `74` local migration files listed

2. `(Get-ChildItem 'supabase/migrations' -File | Measure-Object).Count`
   - Exit code: `0`
   - Result: `74`

### Observed local versions

```text
20260810071051_countdown_crm_base_schema.sql
20260810071052_20260809_0001_workspaces_and_memberships.sql
20260810071112_20260809_0002_workspace_scope_business_data.sql
20260810071115_20260810_0003_workspace_aware_rls.sql
20260810071138_20260810_0004_harden_function_privileges.sql
20260810071243_20260810_0005_harden_legacy_policies.sql
20260810071327_20260810_0006_isolate_authorization_helpers.sql
20260810071346_20260810_0007_harden_workspace_contract.sql
20260810104508_20260810_0008_grant_authenticated_table_access.sql
20260811235808_atomic_call_completion.sql
202608150001_training_sessions.sql
202608150002_training_session_owner_cleanup.sql
20260816180916_leads_company_field.sql
202608170001_order_source_metadata.sql
20260817200938_lead_notes.sql
20260817201609_lead_notes_fk_indexes.sql
20260817201812_lead_notes_rls_initplan.sql
20260817235507_profile_and_lead_notes_policy_hardening.sql
202608180001_training_review_rls_hardening.sql
20260818162302_20260810_0009_seed_builtin_deals_schema.sql
20260818183147_schema_policy_hardening.sql
20260818195000_role_and_lead_permissions.sql
20260818195500_workspace_members_policy_hardening.sql
20260818210000_role_policy_names.sql
20260818210500_remaining_role_policy_names.sql
20260819003504_operator_reminders.sql
20260819005242_operator_calendar_fk_indexes.sql
20260819090000_lead_queue_assignment.sql
20260819090500_lead_queue_policy_hardening.sql
20260819100000_lead_queue_recovery_hardening.sql
20260819103000_lead_queue_call_start_recovery.sql
20260819110000_operator_calendar_policy_hardening.sql
20260819143532_callback_priority_routing.sql
20260819144339_callback_affinity_capacity.sql
20260820190153_operator_order_pipeline_statuses.sql
20260821102718_allow_operator_orders_for_current_lead.sql
20260821104557_order_items_and_atomic_create.sql
20260821151606_order_item_minimum_pricing.sql
20260821204210_order_status_history_and_updates.sql
20260821225730_product_scripts.sql
20260821230217_order_detail_edit_permissions_and_history.sql
20260821230307_order_detail_edit_invoker_hardening.sql
20260821230326_order_change_history_policy_tuning.sql
20260821230550_order_detail_edit_rpc_alias_fix.sql
20260821230618_order_detail_edit_rpc_total_alias_fix.sql
20260821230811_order_detail_edit_rpc_role_alias_fix.sql
20260821230905_order_item_cascade_delete_guard_fix.sql
20260822023213_product_scripts_updated_by_index.sql
20260822114853_product_script_versions_and_publish.sql
20260822115016_product_script_versions_sanitization_fix.sql
20260822120928_product_script_versions_archive_previous.sql
20260822134103_push_reminder_notifications.sql
20260822134130_push_subscription_user_index.sql
20260823010004_operator_presence_heartbeat.sql
20260823041802_profile_backfill_and_auth_trigger.sql
20260824100836_atomic_call_order_items.sql
20260824104323_fix_atomic_call_order_items_product_row.sql
20260824104408_fix_atomic_call_order_items_product_alias.sql
20260824104450_fix_atomic_call_order_items_workspace_alias.sql
20260824104747_fix_atomic_call_order_items_workspace_column.sql
20260824112120_fix_atomic_call_order_items_product_row_mapping.sql
20260824210525_persist_call_outcome_recovery.sql
20260827005441_server_authoritative_blueprint_apply.sql
20260827012414_workflow_execution_event_id.sql
20260830072304_atomic_business_mutations_audit_current_main.sql
20260830100000_blueprint_leads_object_prerequisite.sql
20260830205207_rls_policy_performance_hardening.sql
20260831060401_grant_user_gamification_authenticated.sql
20260831072645_user_wallet_mvp.sql
20260902090000_completion_audit_and_currency_contract.sql
20260902150000_harden_order_currency_updates.sql
20260902160000_wallet_settings_manager_rls.sql
20260903090000_telnyx_telephony_foundation.sql
20260904104023_post_call_fail_details.sql
```

## Local versus remote classification

### Required linked-history command

- `supabase migration list --linked`
  - Status: not run
  - Reason: blocked by unavailable Supabase CLI

### Per-version classification

Every observed local migration version is classified as `blocked` for
local-versus-remote reconciliation because no linked-history output was
available. No version was inferred to be applied from filename presence alone.

| Version source | Classification | Evidence |
| --- | --- | --- |
| Local migration files | `blocked` | Local filenames only; no linked history available |
| Remote migration history | `blocked` | `supabase migration list --linked` could not run |
| History-only mismatch detection | `blocked` | No linked history table evidence |
| Remote-only version detection | `blocked` | No linked history table evidence |

## Schema drift checks

### Required dry-run commands

1. `supabase db push --linked --dry-run`
   - Status: not run
   - Reason: blocked by unavailable Supabase CLI

2. `supabase db diff --linked --schema public`
   - Status: not run
   - Reason: blocked by unavailable Supabase CLI

### Classification

- Target schema comparison: `blocked`
- Calendar-related object verification: `blocked`
- Wallet-related object verification: `blocked`
- Constraint verification: `blocked`
- Grant verification: `blocked`
- RLS verification: `blocked`

Without linked dry-run or diff evidence, this task cannot truthfully classify
any issue as table, column, RPC, grant, or RLS drift.

## Repair and migration actions

### `supabase migration repair`

- Status: not run
- Reason: the brief requires target-schema and history evidence before any
  repair. That evidence is unavailable because the CLI and linked target are
  blocked.

### Forward migration creation

- Status: not performed
- Reason: no proven schema drift was available to justify a new forward
  migration.

### Local replay commands

1. `supabase db reset`
   - Status: not run
   - Reason: blocked by unavailable Supabase CLI

2. `supabase test db`
   - Status: not run
   - Reason: blocked by unavailable Supabase CLI

## Repository status and scope control

### Command evidence

1. `git status --short --branch`
   - Exit code: `0`
   - Result before Task 2 changes:
     - branch `codex/p1-runtime-stability`
     - untracked `Review.md`
     - untracked `docs/superpowers/plans/2026-09-04-p1-runtime-stability-and-migration-history.md`

2. `git rev-parse HEAD`
   - Exit code: `0`
   - Result:
     `c7917e0a3a39df59434bcbc0e3fe920587935390`

3. `git log --oneline -5`
   - Exit code: `0`
   - Result included:
     - `c7917e0 docs: capture p1 runtime baseline`
     - `3fa1718 chore: ignore local worktrees`
     - `2745277 docs: defer telnyx pilot further`

No application code, migration SQL, or unrelated user files were changed as
part of this task.

## Conclusion

- Task 2 status: `blocked`
- Migration history reconciliation: `blocked`
- Schema drift classification: `blocked`
- Remote mutation safety: preserved; no remote mutation attempted
- Deliverable produced: evidence-only report

## Remaining blocked work

The following steps remain blocked until the current worktree has a usable
Supabase CLI and a verifiable linked target:

1. Run `supabase migration list --linked` and classify local/remote versions as
   `same`, `local-only`, `remote-only`, or `schema-drift`.
2. Run `supabase db push --linked --dry-run` and `supabase db diff --linked --schema public`
   to inspect target schema drift.
3. Only if history-only mismatch is proven and target schema already matches,
   run `supabase migration repair <exact-version> --status applied --linked`.
4. Only if concrete schema drift is proven, create one reviewed forward
   migration in `supabase/migrations/`.
5. If local Supabase becomes available, run `supabase db reset` and
   `supabase test db` before any linked push.
