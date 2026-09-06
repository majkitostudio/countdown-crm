begin;

select plan(6);

insert into auth.users (id, email, aud, role, raw_user_meta_data)
values (
  '61111111-1111-4111-8111-111111111111',
  'snapshot-operator@example.test',
  'authenticated',
  'authenticated',
  '{"full_name":"Snapshot Operator"}'::jsonb
);

insert into public.organizations (id, name, slug)
values ('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Snapshot Organization', 'snapshot-org');

insert into public.workspaces (id, organization_id, name, slug)
values (
  '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
  '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Snapshot Workspace',
  'snapshot-workspace'
);

insert into public.workspace_members (workspace_id, user_id, role)
values (
  '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
  '61111111-1111-4111-8111-111111111111',
  'operator'
);

insert into public.leads (id, workspace_id, full_name, phone)
values (
  '67777777-7777-4777-8777-777777777777',
  '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
  'Snapshot Lead',
  '+420700000021'
);

insert into public.calls (id, workspace_id, lead_id, agent_id, duration_seconds, outcome)
values
  (
    '6c111111-1111-4111-8111-111111111111',
    '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    '67777777-7777-4777-8777-777777777777',
    '61111111-1111-4111-8111-111111111111',
    75,
    'completed'
  ),
  (
    '6c222222-2222-4222-8222-222222222222',
    '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    '67777777-7777-4777-8777-777777777777',
    '61111111-1111-4111-8111-111111111111',
    80,
    'completed'
  );

select lives_ok(
  $$insert into public.telephony_call_sessions (
    id, workspace_id, lead_id, operator_id, provider, direction, to_number, status
  ) values (
    '69999999-9999-4999-8999-999999999998',
    '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    '67777777-7777-4777-8777-777777777777',
    '61111111-1111-4111-8111-111111111111',
    'simulation', 'outbound', '+420700000021', 'ended'
  )$$,
  'legacy sessions remain valid with no fabricated script evidence'
);

insert into public.telephony_call_sessions (
  id,
  workspace_id,
  lead_id,
  operator_id,
  provider,
  direction,
  to_number,
  status,
  script_source,
  script_captured_at
)
values (
  '69999999-9999-4999-8999-999999999999',
  '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
  '67777777-7777-4777-8777-777777777777',
  '61111111-1111-4111-8111-111111111111',
  'simulation',
  'outbound',
  '+420700000021',
  'ended',
  'unavailable',
  now()
);

select is(
  (select script_source from public.telephony_call_sessions where id = '69999999-9999-4999-8999-999999999999'),
  'unavailable',
  'captured unavailable state is stored explicitly'
);

insert into public.call_completion_requests (
  workspace_id,
  completion_key,
  actor_id,
  request_fingerprint
)
values (
  '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
  '69999999-9999-4999-8999-999999999999',
  '61111111-1111-4111-8111-111111111111',
  'snapshot-test'
);

update public.call_completion_requests
set call_id = '6c111111-1111-4111-8111-111111111111'
where workspace_id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
  and completion_key = '69999999-9999-4999-8999-999999999999';

select is(
  (select completed_call_id from public.telephony_call_sessions where id = '69999999-9999-4999-8999-999999999999'),
  '6c111111-1111-4111-8111-111111111111'::uuid,
  'completion ledger links the exact call to the exact session'
);

select throws_ok(
  $$update public.telephony_call_sessions
    set script_snapshot_html = '<p>Rewritten</p>'
    where id = '69999999-9999-4999-8999-999999999999'$$,
  'P0001',
  'Captured call script evidence cannot be changed',
  'captured script evidence cannot be rewritten'
);

select throws_ok(
  $$update public.telephony_call_sessions
    set completed_call_id = '6c222222-2222-4222-8222-222222222222'
    where id = '69999999-9999-4999-8999-999999999999'$$,
  'P0001',
  'Completed call link cannot be changed',
  'completed call link cannot be replaced'
);

select is(
  (select count(*)::integer
   from public.telephony_call_sessions
   where id = '69999999-9999-4999-8999-999999999999'
     and script_source = 'unavailable'
     and script_snapshot_html is null
     and completed_call_id = '6c111111-1111-4111-8111-111111111111'),
  1,
  'failed rewrite attempts leave original evidence intact'
);

select * from finish();

rollback;
