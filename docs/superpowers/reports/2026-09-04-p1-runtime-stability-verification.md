# P1 runtime stability verification — Task 1 baseline

Observed on 2026-09-04 in the isolated `codex/p1-runtime-stability` worktree.
This report captures repository evidence and separates it from target-runtime
proof. No application feature, migration source, or remote environment was
modified.

## Repository

- Branch: `codex/p1-runtime-stability`
- Baseline commit: `3fa1718afc0108fe160de1ea65ebfe9084bce0a2`
- `git status --short` exit code: `0`
- Existing user changes preserved: untracked `Review.md`; untracked
  `docs/superpowers/plans/2026-09-04-p1-runtime-stability-and-migration-history.md`.
  Neither file was staged or modified.
- `git log -8 --oneline` exit code: `0`; observed newest entries:

  ```text
  3fa1718 chore: ignore local worktrees
  2745277 docs: defer telnyx pilot further
  436aebb fix: harden and expose fail details
  fe313e4 feat: capture fail details in post-call outcomes
  6c97efd docs: defer telnyx pilot until number verification
  83e4362 fix: close telnyx sessions on setup failure
  f7931b0 docs: record telnyx outbound pilot verification
  4675b37 fix: make telnyx failures explicit
  ```

- Read-only repository context reviewed: `PROJECT.md`,
  `docs/AKTUALNI_STAV_A_DESATERO.md`, `docs/DEVELOPMENT_WORKFLOW.md`, and
  `.env.example`.
- `.env.local`: absent in this worktree. The read attempt returned exit code `1`
  with a PowerShell path-not-found error. No environment value or credential
  was recorded.
- Repository baseline result: the repository checks below are green. This is
  not proof of runtime persistence, RLS, concurrency, migration parity, or a
  live external provider.

### Repository verification commands

Each command was run separately from the worktree root.

#### `npm test`

- Exit code: `0`
- Actual result: `45` test files passed; `170` tests passed; `0` failed.
- Vitest: `v4.1.11`; duration reported: `4.57s`.

#### `npm run lint`

- Exit code: `0`
- Actual result: ESLint completed without reported errors or warnings.

#### `npm run typecheck`

- Exit code: `0`
- Actual result: `tsc --noEmit` completed without reported diagnostics.

#### `npm run build`

- Exit code: `0`
- Actual result: Next.js `16.3.2` production build compiled successfully,
  TypeScript completed, and `28/28` static pages were generated.

## Supabase target

- CLI available: no. `supabase --version` returned exit code `1`; PowerShell
  reported that `supabase` was not recognized.
- Local Supabase project available: not verifiable because the CLI is
  unavailable. `supabase status` returned exit code `1` with the same
  not-recognized error.
- Linked project available: not verifiable because the CLI is unavailable.
  No linked-target command or remote mutation was attempted.
- Auth mode used for evidence: blocked; no authenticated target workspace was
  exercised.
- Demo auth used for evidence: no.
- `NEXT_PUBLIC_ALLOW_DEMO_AUTH=true` remains a local-development-only escape
  hatch and was not used as a substitute for real Auth.
- Target-runtime conclusion: blocked. The repository baseline does not prove
  the state of any local or linked Supabase database.

## Migration history

- Repository migration directory: `supabase/migrations`
- Current local migration-file count: `74`
- Inventory command: `Get-ChildItem supabase\\migrations -File | Sort-Object Name |
  Select-Object -ExpandProperty Name`
- Inventory command exit code: `0`
- Count command exit code: `0`
- The repository migration inventory is evidence of files present in this
  checkout only. It is not evidence that the same migrations are applied to a
  local or linked target.
- `supabase/schema.sql` was not modified and is not treated as a migration
  source.

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

## Runtime smoke

- `/calendar` and `/wallet` appear in the successful Next.js build route output
  as dynamic routes (`ƒ /calendar` and `ƒ /wallet`). This is repository/build
  evidence only.
- No authenticated browser or server runtime smoke was executed against a
  Supabase target because the CLI and target availability were blocked.
- No claim is made that `/calendar` or `/wallet` is available in a target
  workspace.

## Persistence

- Authenticated call → outcome/order → reload → SQL read-back: blocked.
- SQL read-back, RLS enforcement, role boundaries, workspace isolation, and
  migration-history parity: blocked because no local or linked target was
  available through the Supabase CLI.
- UI, build, and unit-test results above are not persistence proof.

## Negative matrix

The required target checks were not run; each is blocked by unavailable CLI and
unverified target access.

| Scenario | Expected boundary | Evidence status |
| --- | --- | --- |
| Authenticated permitted user in target workspace | Allowed server operation and persisted result | Blocked |
| Unauthenticated request | Rejected by Auth/server boundary | Blocked |
| Authenticated user with insufficient role | Rejected by server/role boundary | Blocked |
| Authenticated user from another workspace | Rejected by workspace boundary/RLS | Blocked |
| Reload after mutation | Persisted state remains available | Blocked |
| SQL read-back | Stored row and authoritative state can be verified | Blocked |

## Blockers

- Supabase CLI is not installed or not on PATH in this worktree environment;
  both required CLI commands exited `1`.
- Local Supabase availability, linked project identity, migration history
  parity, authenticated workspace access, persistence, and negative role/
  workspace scenarios therefore remain unverified.
- No remote mutation was attempted. Demo auth was not used as a substitute for
  real Auth, and no credentials, passwords, private keys, or full personal
  phone numbers are included in this report.
