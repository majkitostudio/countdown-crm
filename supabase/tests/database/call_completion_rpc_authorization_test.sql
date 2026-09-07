begin;

set local search_path = extensions, public, private, auth, pg_catalog;

select plan(6);

insert into auth.users (id, email, aud, role, raw_user_meta_data)
values
  ('71111111-1111-4111-8111-111111111111', 'completion-owner@example.test', 'authenticated', 'authenticated', '{"full_name":"Completion Owner"}'::jsonb),
  ('71222222-2222-4222-8222-222222222222', 'completion-other@example.test', 'authenticated', 'authenticated', '{"full_name":"Completion Other"}'::jsonb);

insert into public.organizations (id, name, slug)
values ('71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Completion Organization', 'completion-org');

insert into public.workspaces (id, organization_id, name, slug)
values ('71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Completion Workspace', 'completion-workspace');

insert into public.workspace_members (workspace_id, user_id, role)
values
  ('71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '71111111-1111-4111-8111-111111111111', 'operator'),
  ('71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '71222222-2222-4222-8222-222222222222', 'operator');

insert into public.operator_presence (workspace_id, operator_id, state, last_heartbeat_at)
values (
  '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
  '71111111-1111-4111-8111-111111111111',
  'in_call',
  now()
);

insert into public.leads (id, workspace_id, full_name, phone)
values
  ('71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11', '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'Queued Completion Lead', '+420700000071'),
  ('71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12', '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'Direct Completion Lead', '+420700000072');

insert into public.lead_queue_items (
  id, workspace_id, lead_id, assigned_operator_id, state, claimed_at
)
values (
  '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21',
  '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
  '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11',
  '71111111-1111-4111-8111-111111111111',
  'awaiting_outcome',
  now()
);

insert into public.telephony_call_sessions (
  id, workspace_id, queue_item_id, lead_id, operator_id, provider,
  direction, status, started_at, answered_at
)
values
  (
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31',
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21',
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11',
    '71111111-1111-4111-8111-111111111111',
    'simulation',
    'outbound',
    'connected',
    now(),
    now()
  ),
  (
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa32',
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    null,
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12',
    '71111111-1111-4111-8111-111111111111',
    'simulation',
    'outbound',
    'connected',
    now(),
    now()
  );

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"71222222-2222-4222-8222-222222222222"}', true);

select throws_ok(
  $$select public.complete_lead_call_with_order_items_idempotent(
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31',
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21',
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31',
    0,
    'no_answer',
    null,
    'Neutral',
    null,
    null,
    null,
    null
  )$$,
  'P0001',
  'Call session is not available to the authenticated operator',
  'operator cannot complete another operator queue call session'
);

select throws_ok(
  $$select * from public.complete_call_with_order_items_idempotent(
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa32',
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa32',
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12',
    0,
    'no_answer',
    null,
    'Neutral',
    null,
    null,
    null,
    null
  )$$,
  'P0001',
  'Call session is not available to the authenticated operator',
  'operator cannot complete another operator direct call session'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"71111111-1111-4111-8111-111111111111"}', true);

select lives_ok(
  $$select public.complete_lead_call_with_order_items_idempotent(
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31',
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21',
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31',
    0,
    'no_answer',
    null,
    'Neutral',
    null,
    null,
    null,
    null
  )$$,
  'assigned operator completes the own queue call through the invoker wrapper'
);

select is(
  (
    select count(*)::integer
    from public.calls
    where lead_id = '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11'
      and agent_id = '71111111-1111-4111-8111-111111111111'
  ),
  1,
  'queue completion persists one call for the authenticated operator'
);

select lives_ok(
  $$select * from public.complete_call_with_order_items_idempotent(
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa32',
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa32',
    '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12',
    0,
    'no_answer',
    null,
    'Neutral',
    null,
    null,
    null,
    null
  )$$,
  'authenticated operator completes the own direct call through the invoker wrapper'
);

select is(
  (
    select count(*)::integer
    from public.calls
    where lead_id = '71aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12'
      and agent_id = '71111111-1111-4111-8111-111111111111'
  ),
  1,
  'direct completion persists one call for the authenticated operator'
);

select * from finish();

rollback;
