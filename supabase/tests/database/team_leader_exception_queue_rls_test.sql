begin;

select plan(21);

insert into auth.users (id, email, aud, role, raw_user_meta_data)
values
  ('41111111-1111-4111-8111-111111111111', 'exception-tl-a@example.test', 'authenticated', 'authenticated', '{"full_name":"Exception TL A"}'::jsonb),
  ('42222222-2222-4222-8222-222222222222', 'exception-operator-a@example.test', 'authenticated', 'authenticated', '{"full_name":"Exception Operator A"}'::jsonb),
  ('49999999-9999-4999-8999-999999999999', 'exception-operator-b@example.test', 'authenticated', 'authenticated', '{"full_name":"Exception Operator B"}'::jsonb),
  ('43333333-3333-4333-8333-333333333333', 'exception-admin-b@example.test', 'authenticated', 'authenticated', '{"full_name":"Exception Admin B"}'::jsonb);

insert into public.organizations (id, name, slug)
values
  ('4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Exception Organization A', 'exception-org-a'),
  ('4bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Exception Organization B', 'exception-org-b');

insert into public.workspaces (id, organization_id, name, slug)
values
  ('4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Exception Workspace A', 'exception-workspace-a'),
  ('4bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01', '4bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Exception Workspace B', 'exception-workspace-b');

insert into public.workspace_members (workspace_id, user_id, role)
values
  ('4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '41111111-1111-4111-8111-111111111111', 'team_leader'),
  ('4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '42222222-2222-4222-8222-222222222222', 'operator'),
  ('4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '49999999-9999-4999-8999-999999999999', 'operator'),
  ('4bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01', '43333333-3333-4333-8333-333333333333', 'administrator');

insert into public.leads (id, workspace_id, full_name, phone)
values
  (
    '47777777-7777-4777-8777-777777777777',
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    'Exception Queue Lead',
    '+420700000001'
  ),
  (
    '48888888-8888-4888-8888-888888888888',
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    'Recurring Exception Lead',
    '+420700000002'
  );

insert into public.lead_queue_items (
  id,
  workspace_id,
  lead_id,
  assigned_operator_id,
  state,
  lease_expires_at
)
values
  (
    '44444444-4444-4444-8444-444444444444',
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    '48888888-8888-4888-8888-888888888888',
    '42222222-2222-4222-8222-222222222222',
    'assigned',
    now() - interval '1 hour'
  ),
  (
    '45555555-5555-4555-8555-555555555555',
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    '47777777-7777-4777-8777-777777777777',
    '49999999-9999-4999-8999-999999999999',
    'awaiting_outcome',
    null
  );

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"41111111-1111-4111-8111-111111111111"}', true);

select lives_ok(
  $$select * from public.resolve_team_leader_exception(
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    'queue:expired_lease:44444444-4444-4444-8444-444444444444',
    'Assignment checked and released.'
  )$$,
  'Team Leader resolves an own-workspace exception'
);

select is(
  (select count(*)::integer from public.team_leader_exception_actions),
  1,
  'Team Leader reads the persisted own-workspace decision'
);

select is(
  (select previous_state ->> 'status' from public.team_leader_exception_actions limit 1),
  null,
  'first decision records no fabricated previous status'
);

select is(
  (select count(*)::integer from public.audit_logs where action = 'EXCEPTION_RESOLVED'),
  1,
  'resolve creates one audit entry'
);

select lives_ok(
  $$select * from public.resolve_team_leader_exception(
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    'queue:expired_lease:44444444-4444-4444-8444-444444444444',
    'Assignment checked and released.'
  )$$,
  'repeating the same resolve is accepted'
);

select is(
  (select count(*)::integer from public.audit_logs where action = 'EXCEPTION_RESOLVED'),
  1,
  'repeating the same resolve does not duplicate the audit entry'
);

select throws_ok(
  $$update public.team_leader_exception_actions
    set exception_key = 'queue:outcome_recovery:45555555-5555-4555-8555-555555555555'
    where exception_key = 'queue:expired_lease:44444444-4444-4444-8444-444444444444'$$,
  'P0001',
  'Exception action identity cannot be changed',
  'manager cannot rewrite the identity of an existing decision'
);

select lives_ok(
  $$select * from public.resolve_team_leader_exception(
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    'queue:outcome_recovery:45555555-5555-4555-8555-555555555555',
    'Recovery occurrence handled.'
  )$$,
  'Team Leader resolves the first occurrence of a recovery problem'
);

reset role;
update public.lead_queue_items
set updated_at = (
  select updated_at + interval '1 second'
  from public.team_leader_exception_actions
  where exception_key = 'queue:outcome_recovery:45555555-5555-4555-8555-555555555555'
)
where id = '45555555-5555-4555-8555-555555555555';
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"41111111-1111-4111-8111-111111111111"}', true);

select lives_ok(
  $$select * from public.resolve_team_leader_exception(
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    'queue:outcome_recovery:45555555-5555-4555-8555-555555555555',
    'Recovery occurrence handled.'
  )$$,
  'the same decision can handle a genuinely newer occurrence'
);

select is(
  (select count(*)::integer from public.audit_logs
   where action = 'EXCEPTION_RESOLVED'
     and target_resource = 'queue:outcome_recovery:45555555-5555-4555-8555-555555555555'),
  2,
  'the newer occurrence creates a separate audit event'
);

select throws_ok(
  $$select * from public.resolve_team_leader_exception(
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    'queue:expired_lease:45555555-5555-4555-8555-555555555555',
    'This source does not exist.'
  )$$,
  'P0001',
  'Exception is no longer active',
  'manager cannot manufacture an exception action without a real active source'
);

select throws_ok(
  $$insert into public.team_leader_exception_actions (
    workspace_id, exception_key, status, resolution, actor_id
  ) values (
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    'queue:expired_lease:46666666-6666-4666-8666-666666666666',
    'resolved',
    'This direct source does not exist.',
    '41111111-1111-4111-8111-111111111111'
  )$$,
  'P0001',
  'Exception is no longer active',
  'manager cannot bypass source validation with a direct insert'
);

select lives_ok(
  $$select * from public.snooze_team_leader_exception(
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    'queue:expired_lease:44444444-4444-4444-8444-444444444444',
    now() + interval '1 hour',
    'Operator will review this after the current call.'
  )$$,
  'Team Leader snoozes a real own-workspace exception'
);

select is(
  (select status from public.team_leader_exception_actions
   where exception_key = 'queue:expired_lease:44444444-4444-4444-8444-444444444444'),
  'snoozed',
  'snooze persists the new manager decision'
);

select is(
  (select previous_state ->> 'status' from public.team_leader_exception_actions
   where exception_key = 'queue:expired_lease:44444444-4444-4444-8444-444444444444'),
  'resolved',
  'snooze retains the previous manager decision for audit context'
);

select is(
  (select count(*)::integer from public.audit_logs where action = 'EXCEPTION_SNOOZED'),
  1,
  'snooze creates one audit entry'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"42222222-2222-4222-8222-222222222222"}', true);

select is(
  (select count(*)::integer from public.team_leader_exception_actions),
  0,
  'operator cannot read the Team Leader Exception Queue decisions'
);

select throws_ok(
  $$select * from public.resolve_team_leader_exception(
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    'queue:expired_lease:45555555-5555-4555-8555-555555555555',
    'Operator must not resolve this.'
  )$$,
  'P0001',
  'Team Leader or Administrator access is required',
  'operator cannot call the resolve function'
);

select throws_ok(
  $$insert into public.team_leader_exception_actions (
    workspace_id, exception_key, status, resolution, actor_id
  ) values (
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    'queue:expired_lease:46666666-6666-4666-8666-666666666666',
    'resolved',
    'Operator direct write denied.',
    '42222222-2222-4222-8222-222222222222'
  )$$,
  'P0001',
  'Team Leader or Administrator access is required',
  'operator cannot bypass the function with a direct insert'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"43333333-3333-4333-8333-333333333333"}', true);

select is(
  (select count(*)::integer from public.team_leader_exception_actions),
  0,
  'administrator in another workspace cannot read workspace A decisions'
);

select throws_ok(
  $$select * from public.snooze_team_leader_exception(
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    'queue:expired_lease:44444444-4444-4444-8444-444444444444',
    now() + interval '1 hour',
    'Cross-workspace snooze denied.'
  )$$,
  'P0001',
  'Team Leader or Administrator access is required',
  'administrator cannot mutate another workspace decision'
);

select * from finish();

rollback;
