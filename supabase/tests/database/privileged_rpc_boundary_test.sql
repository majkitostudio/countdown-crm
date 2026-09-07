begin;

set local search_path = extensions, public, private, auth, pg_catalog;

select plan(23);

select is(
  (
    select count(*)::integer
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'add_wallet_bonus_rule',
        'add_wallet_manual_adjustment',
        'complete_call_with_order_items_idempotent',
        'complete_lead_call_with_order_items_idempotent',
        'update_wallet_settings'
      )
      and not procedure.prosecdef
  ),
  5,
  'all five public RPC boundaries execute as invokers'
);

select is(
  (
    with expected_contract (
      function_name, identity_types, input_names, default_count, result_type
    ) as (
      values
        (
          'add_wallet_bonus_rule',
          'uuid, text, numeric, numeric, date',
          array['p_workspace_id', 'p_currency', 'p_minimum_order_amount', 'p_bonus_amount', 'p_effective_from']::text[],
          1,
          'wallet_bonus_rules'
        ),
        (
          'add_wallet_manual_adjustment',
          'uuid, uuid, numeric, text',
          array['p_workspace_id', 'p_user_id', 'p_amount', 'p_reason']::text[],
          0,
          'wallet_transactions'
        ),
        (
          'complete_call_with_order_items_idempotent',
          'uuid, uuid, uuid, integer, text, text, text, jsonb, timestamp with time zone, text, text',
          array['completion_key', 'call_session_id', 'lead_id', 'duration_seconds', 'outcome', 'transcript', 'ai_sentiment', 'order_items', 'callback_scheduled_at', 'call_note', 'call_fail_reason']::text[],
          4,
          'TABLE(call_id uuid, order_id uuid, lead_status text)'
        ),
        (
          'complete_lead_call_with_order_items_idempotent',
          'uuid, uuid, uuid, integer, text, text, text, jsonb, timestamp with time zone, text, text',
          array['completion_key', 'target_queue_item_id', 'call_session_id', 'call_duration_seconds', 'call_outcome', 'call_transcript', 'call_ai_sentiment', 'order_items', 'callback_scheduled_at', 'call_note', 'call_fail_reason']::text[],
          4,
          'jsonb'
        ),
        (
          'update_wallet_settings',
          'uuid, text, numeric',
          array['p_workspace_id', 'p_currency', 'p_monthly_commission_rate']::text[],
          0,
          'wallet_settings'
        )
    )
    select count(*)::integer
    from expected_contract as expected
    join pg_proc as procedure
      on procedure.proname = expected.function_name
     and oidvectortypes(procedure.proargtypes) = expected.identity_types
     and procedure.proargnames[1:procedure.pronargs] = expected.input_names
     and procedure.pronargdefaults = expected.default_count
     and pg_get_function_result(procedure.oid) = expected.result_type
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
  ),
  5,
  'all five public RPCs preserve exact input names, types, defaults and return shapes'
);

select is(
  (
    select count(*)::integer
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname in (
        'add_wallet_bonus_rule',
        'add_wallet_manual_adjustment',
        'complete_call_with_order_items_idempotent',
        'complete_lead_call_with_order_items_idempotent',
        'update_wallet_settings'
      )
      and procedure.prosecdef
  ),
  5,
  'the five privileged implementations live in private as definers'
);

select is(
  (
    select count(*)::integer
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname in (
        'add_wallet_bonus_rule',
        'add_wallet_manual_adjustment',
        'complete_call_with_order_items_idempotent',
        'complete_lead_call_with_order_items_idempotent',
        'update_wallet_settings'
      )
      and procedure.proconfig @> array['search_path=""']::text[]
  ),
  5,
  'all five private privileged implementations use an empty search path'
);

select ok(
  not exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'add_wallet_bonus_rule',
        'add_wallet_manual_adjustment',
        'complete_call_with_order_items_idempotent',
        'complete_lead_call_with_order_items_idempotent',
        'update_wallet_settings'
      )
      and procedure.proacl is not null
      and exists (
        select 1
        from aclexplode(procedure.proacl) as privilege
        where privilege.grantee = 0
          and privilege.privilege_type = 'EXECUTE'
      )
  ),
  'PUBLIC cannot execute a public RPC boundary'
);

select ok(
  not exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'add_wallet_bonus_rule',
        'add_wallet_manual_adjustment',
        'complete_call_with_order_items_idempotent',
        'complete_lead_call_with_order_items_idempotent',
        'update_wallet_settings'
      )
      and has_function_privilege('anon', procedure.oid, 'EXECUTE')
  ),
  'anon cannot execute a public RPC boundary'
);

select is(
  (
    select count(*)::integer
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'add_wallet_bonus_rule',
        'add_wallet_manual_adjustment',
        'complete_call_with_order_items_idempotent',
        'complete_lead_call_with_order_items_idempotent',
        'update_wallet_settings'
      )
      and has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
  ),
  5,
  'authenticated can execute all five public RPC boundaries'
);

select ok(
  not exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname in (
        'add_wallet_bonus_rule',
        'add_wallet_manual_adjustment',
        'complete_call_with_order_items_idempotent',
        'complete_lead_call_with_order_items_idempotent',
        'update_wallet_settings'
      )
      and procedure.proacl is not null
      and exists (
        select 1
        from aclexplode(procedure.proacl) as privilege
        where privilege.grantee = 0
          and privilege.privilege_type = 'EXECUTE'
      )
  ),
  'PUBLIC cannot execute a private privileged implementation'
);

select ok(
  not exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname in (
        'add_wallet_bonus_rule',
        'add_wallet_manual_adjustment',
        'complete_call_with_order_items_idempotent',
        'complete_lead_call_with_order_items_idempotent',
        'update_wallet_settings'
      )
      and has_function_privilege('anon', procedure.oid, 'EXECUTE')
  ),
  'anon cannot execute a private privileged implementation'
);

select is(
  (
    select count(*)::integer
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname in (
        'add_wallet_bonus_rule',
        'add_wallet_manual_adjustment',
        'complete_call_with_order_items_idempotent',
        'complete_lead_call_with_order_items_idempotent',
        'update_wallet_settings'
      )
      and has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
  ),
  5,
  'authenticated reaches each private implementation only through an explicit grant'
);

select is(
  (
    select count(*)::integer
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'add_wallet_bonus_rule',
        'add_wallet_manual_adjustment',
        'complete_call_with_order_items_idempotent',
        'complete_lead_call_with_order_items_idempotent',
        'update_wallet_settings'
      )
      and procedure.proconfig @> array['search_path=""']::text[]
  ),
  5,
  'public invoker wrappers use an empty search path'
);

insert into auth.users (id, email, aud, role, raw_user_meta_data)
values
  ('70111111-1111-4111-8111-111111111111', 'rpc-admin-a@example.test', 'authenticated', 'authenticated', '{"full_name":"RPC Admin A"}'::jsonb),
  ('70222222-2222-4222-8222-222222222222', 'rpc-leader-a@example.test', 'authenticated', 'authenticated', '{"full_name":"RPC Leader A"}'::jsonb),
  ('70333333-3333-4333-8333-333333333333', 'rpc-operator-a@example.test', 'authenticated', 'authenticated', '{"full_name":"RPC Operator A"}'::jsonb),
  ('70444444-4444-4444-8444-444444444444', 'rpc-admin-b@example.test', 'authenticated', 'authenticated', '{"full_name":"RPC Admin B"}'::jsonb);

insert into public.organizations (id, name, slug)
values
  ('70aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'RPC Organization A', 'rpc-org-a'),
  ('70bbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'RPC Organization B', 'rpc-org-b');

insert into public.workspaces (id, organization_id, name, slug)
values
  ('70aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '70aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'RPC Workspace A', 'rpc-workspace-a'),
  ('70bbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01', '70bbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'RPC Workspace B', 'rpc-workspace-b');

insert into public.workspace_members (workspace_id, user_id, role)
values
  ('70aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '70111111-1111-4111-8111-111111111111', 'administrator'),
  ('70aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '70222222-2222-4222-8222-222222222222', 'team_leader'),
  ('70aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '70333333-3333-4333-8333-333333333333', 'operator'),
  ('70bbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01', '70444444-4444-4444-8444-444444444444', 'administrator');

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"70111111-1111-4111-8111-111111111111"}', true);

select lives_ok(
  $$select public.update_wallet_settings('70aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'CZK', 2.5)$$,
  'administrator updates wallet settings in the own workspace through the invoker wrapper'
);

select is(
  (select monthly_commission_rate from public.wallet_settings where workspace_id = '70aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'),
  2.5000::numeric,
  'wallet settings mutation persists the requested rate'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"70222222-2222-4222-8222-222222222222"}', true);

select lives_ok(
  $$select public.add_wallet_bonus_rule('70aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'CZK', 1000, 100, date '2026-09-07')$$,
  'Team Leader adds a wallet bonus rule in the own workspace through the invoker wrapper'
);

select is(
  (
    select count(*)::integer
    from public.wallet_bonus_rules
    where workspace_id = '70aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
      and minimum_order_amount = 1000
      and bonus_amount = 100
      and effective_from = date '2026-09-07'
  ),
  1,
  'wallet bonus rule is stored in the requested workspace'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"70111111-1111-4111-8111-111111111111"}', true);

select lives_ok(
  $$select public.add_wallet_manual_adjustment('70aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '70333333-3333-4333-8333-333333333333', 250, 'Verified local adjustment')$$,
  'administrator records a manual adjustment for an own-workspace member through the invoker wrapper'
);

select is(
  (select count(*)::integer from public.wallet_transactions where workspace_id = '70aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01' and transaction_type = 'manual_adjustment'),
  1,
  'manual wallet adjustment creates one transaction'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"70333333-3333-4333-8333-333333333333"}', true);

select throws_ok(
  $$select public.update_wallet_settings('70aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'EUR', 3)$$,
  'P0001',
  'Insufficient workspace permissions',
  'operator cannot update wallet settings'
);

select throws_ok(
  $$select public.add_wallet_bonus_rule('70aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'CZK', 2000, 200, date '2026-09-08')$$,
  'P0001',
  'Insufficient workspace permissions',
  'operator cannot add a wallet bonus rule'
);

select throws_ok(
  $$select public.add_wallet_manual_adjustment('70aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '70333333-3333-4333-8333-333333333333', 100, 'Operator must not adjust')$$,
  'P0001',
  'Insufficient workspace permissions',
  'operator cannot add a manual wallet adjustment'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"70444444-4444-4444-8444-444444444444"}', true);

select throws_ok(
  $$select public.update_wallet_settings('70aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'EUR', 3)$$,
  'P0001',
  'Insufficient workspace permissions',
  'administrator cannot update wallet settings in another workspace'
);

select throws_ok(
  $$select public.add_wallet_bonus_rule('70aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'CZK', 3000, 300, date '2026-09-09')$$,
  'P0001',
  'Insufficient workspace permissions',
  'administrator cannot add a wallet bonus rule in another workspace'
);

select throws_ok(
  $$select public.add_wallet_manual_adjustment('70aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '70333333-3333-4333-8333-333333333333', 100, 'Cross workspace must fail')$$,
  'P0001',
  'Insufficient workspace permissions',
  'administrator cannot adjust a wallet in another workspace'
);

select * from finish();

rollback;
