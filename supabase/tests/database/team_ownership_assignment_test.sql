begin;

select plan(23);

insert into auth.users (id, email, aud, role, raw_user_meta_data)
values
  ('8a111111-1111-4111-8111-111111111111', 'ownership-admin@example.test', 'authenticated', 'authenticated', '{"full_name":"Ownership Admin"}'::jsonb),
  ('8b111111-1111-4111-8111-111111111111', 'ownership-tl-a@example.test', 'authenticated', 'authenticated', '{"full_name":"Ownership TL A"}'::jsonb),
  ('8c111111-1111-4111-8111-111111111111', 'ownership-tl-b@example.test', 'authenticated', 'authenticated', '{"full_name":"Ownership TL B"}'::jsonb),
  ('8d111111-1111-4111-8111-111111111111', 'ownership-operator-a@example.test', 'authenticated', 'authenticated', '{"full_name":"Ownership Operator A"}'::jsonb),
  ('8e111111-1111-4111-8111-111111111111', 'ownership-operator-b@example.test', 'authenticated', 'authenticated', '{"full_name":"Ownership Operator B"}'::jsonb);

insert into public.organizations (id, name, slug)
values ('8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Ownership Organization', 'ownership-org');

insert into public.workspaces (id, organization_id, name, slug)
values
  ('8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Ownership Workspace', 'ownership-workspace'),
  ('8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Ownership Other Workspace', 'ownership-workspace-other');

insert into public.workspace_members (workspace_id, user_id, role)
values
  ('8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '8a111111-1111-4111-8111-111111111111', 'administrator'),
  ('8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '8b111111-1111-4111-8111-111111111111', 'team_leader'),
  ('8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '8c111111-1111-4111-8111-111111111111', 'team_leader'),
  ('8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '8d111111-1111-4111-8111-111111111111', 'operator'),
  ('8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '8e111111-1111-4111-8111-111111111111', 'operator');

insert into public.teams (id, workspace_id, name, slug, status)
values
  ('8fee1111-1111-4111-8111-111111111111', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'Ownership Team A', 'ownership-team-a', 'active'),
  ('8fee2222-2222-4222-8222-222222222222', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'Ownership Team B', 'ownership-team-b', 'active'),
  ('8fee3333-3333-4333-8333-333333333333', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'Ownership Team Archived', 'ownership-team-archived', 'archived'),
  ('8fee4444-4444-4444-8444-444444444444', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02', 'Ownership Team Other Workspace', 'ownership-team-other', 'active');

insert into public.team_memberships (team_id, workspace_id, user_id, membership_role, active_from)
values
  ('8fee1111-1111-4111-8111-111111111111', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '8b111111-1111-4111-8111-111111111111', 'leader', now() - interval '2 days'),
  ('8fee2222-2222-4222-8222-222222222222', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '8c111111-1111-4111-8111-111111111111', 'leader', now() - interval '2 days'),
  ('8fee1111-1111-4111-8111-111111111111', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '8d111111-1111-4111-8111-111111111111', 'member', now() - interval '2 days'),
  ('8fee2222-2222-4222-8222-222222222222', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '8e111111-1111-4111-8111-111111111111', 'member', now() - interval '2 days');

insert into public.leads (id, workspace_id, team_id, full_name, phone)
values
  ('8c000000-0000-4000-8000-000000000001', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', null, 'Ownership Lead One', '+420700000081'),
  ('8c000000-0000-4000-8000-000000000002', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '8fee2222-2222-4222-8222-222222222222', 'Ownership Lead Two', '+420700000082'),
  ('8c000000-0000-4000-8000-000000000003', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', null, 'Ownership Lead Three', '+420700000083'),
  ('8c000000-0000-4000-8000-000000000004', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', null, 'Ownership Lead Four', '+420700000084'),
  ('8c000000-0000-4000-8000-000000000005', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', null, 'Ownership Lead Five', '+420700000085');

insert into public.lead_queue_items (id, workspace_id, lead_id, team_id, assigned_operator_id, state)
values
  ('8d000000-0000-4000-8000-000000000001', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '8c000000-0000-4000-8000-000000000001', null, null, 'available'),
  ('8d000000-0000-4000-8000-000000000002', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '8c000000-0000-4000-8000-000000000002', '8fee2222-2222-4222-8222-222222222222', null, 'available'),
  ('8d000000-0000-4000-8000-000000000003', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '8c000000-0000-4000-8000-000000000003', null, '8e111111-1111-4111-8111-111111111111', 'assigned'),
  ('8d000000-0000-4000-8000-000000000004', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '8c000000-0000-4000-8000-000000000004', null, null, 'available'),
  ('8d000000-0000-4000-8000-000000000005', '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '8c000000-0000-4000-8000-000000000005', null, '8d111111-1111-4111-8111-111111111111', 'assigned');

insert into public.calls (id, workspace_id, lead_id, agent_id, duration_seconds, outcome, transcript)
values (
  '8e000000-0000-4000-8000-000000000001',
  '8aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
  '8c000000-0000-4000-8000-000000000002',
  '8e111111-1111-4111-8111-111111111111',
  60,
  'completed',
  'Operátor: Dobrý den'
);

select ok(
  to_regprocedure('public.assign_team_ownership(text, uuid, uuid)') is not null,
  'ownership assignment entry point exists'
);

select ok(
  (select prosecdef from pg_proc where oid = 'private.assign_team_ownership_impl(text, uuid, uuid)'::regprocedure),
  'ownership assignment runs as the defining role'
);

select ok(
  not has_function_privilege('anon', 'public.assign_team_ownership(text, uuid, uuid)', 'execute'),
  'anonymous requests cannot confirm ownership'
);

select ok(
  has_function_privilege('authenticated', 'public.assign_team_ownership(text, uuid, uuid)', 'execute'),
  'authenticated requests may reach the administrator-guarded entry point'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"8a111111-1111-4111-8111-111111111111"}', true);

select is(
  (select count(*)::integer from public.leads where id = '8c000000-0000-4000-8000-000000000001'),
  1,
  'administrator sees a lead whose ownership is not confirmed yet'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"8b111111-1111-4111-8111-111111111111"}', true);

select is(
  (select count(*)::integer from public.leads where id = '8c000000-0000-4000-8000-000000000001'),
  0,
  'team leader does not see a lead whose ownership is not confirmed yet'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"8d111111-1111-4111-8111-111111111111"}', true);

select is(
  (select count(*)::integer from public.lead_queue_items where id = '8d000000-0000-4000-8000-000000000005'),
  0,
  'operator does not see an assigned queue item that has no team'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"8a111111-1111-4111-8111-111111111111"}', true);

-- 1. Confirming a lead routes the lead's own queue item.
select set_config(
  'crm.ownership_result',
  public.assign_team_ownership(
    'lead',
    '8c000000-0000-4000-8000-000000000001',
    '8fee1111-1111-4111-8111-111111111111'
  )::text,
  true
);

select is(
  (select team_id from public.lead_queue_items where id = '8d000000-0000-4000-8000-000000000001'),
  '8fee1111-1111-4111-8111-111111111111'::uuid,
  'confirming a lead also routes the lead queue item'
);

select is(
  current_setting('crm.ownership_result')::jsonb ->> 'queue_items_updated',
  '1',
  'the cascade reports the routed queue item'
);

select is(
  current_setting('crm.ownership_result')::jsonb ->> 'queue_items_remaining',
  '0',
  'no queue item of the lead stays unconfirmed'
);

select is(
  (
    select count(*)::integer
    from public.lead_queue_events
    where queue_item_id = '8d000000-0000-4000-8000-000000000001'
      and event_type = 'team_assigned'
  ),
  1,
  'the cascade is recorded in the queue history'
);

-- 2. Ownership that is already confirmed is never overwritten.
select set_config(
  'crm.ownership_result',
  public.assign_team_ownership(
    'lead',
    '8c000000-0000-4000-8000-000000000002',
    '8fee1111-1111-4111-8111-111111111111'
  )::text,
  true
);

select is(
  (select team_id from public.lead_queue_items where id = '8d000000-0000-4000-8000-000000000002'),
  '8fee2222-2222-4222-8222-222222222222'::uuid,
  'a queue item with its own team keeps that team'
);

select is(
  current_setting('crm.ownership_result')::jsonb ->> 'queue_items_updated',
  '0',
  'the cascade reports no overwritten queue item'
);

-- 3. A queue item held by an operator outside the target team is left alone
--    and reported back, because moving it would break operator assignment.
select set_config(
  'crm.ownership_result',
  public.assign_team_ownership(
    'lead',
    '8c000000-0000-4000-8000-000000000003',
    '8fee1111-1111-4111-8111-111111111111'
  )::text,
  true
);

select is(
  (select team_id from public.lead_queue_items where id = '8d000000-0000-4000-8000-000000000003'),
  null::uuid,
  'a queue item held by an operator of another team stays unconfirmed'
);

select is(
  current_setting('crm.ownership_result')::jsonb ->> 'queue_items_remaining',
  '1',
  'the cascade reports the queue item left for the administrator'
);

select is(
  (select team_id from public.leads where id = '8c000000-0000-4000-8000-000000000003'),
  '8fee1111-1111-4111-8111-111111111111'::uuid,
  'the lead itself is confirmed even when its queue item cannot be routed'
);

-- 4. Confirming a queue item routes its own lead as well.
select set_config(
  'crm.ownership_result',
  public.assign_team_ownership(
    'queue_item',
    '8d000000-0000-4000-8000-000000000004',
    '8fee2222-2222-4222-8222-222222222222'
  )::text,
  true
);

select is(
  (select team_id from public.leads where id = '8c000000-0000-4000-8000-000000000004'),
  '8fee2222-2222-4222-8222-222222222222'::uuid,
  'confirming a queue item also routes its lead'
);

select is(
  current_setting('crm.ownership_result')::jsonb ->> 'leads_updated',
  '1',
  'the reverse cascade reports the routed lead'
);

-- 5. The end-to-end effect: unrouted work becomes visible to the team.
select set_config(
  'crm.ownership_result',
  public.assign_team_ownership(
    'lead',
    '8c000000-0000-4000-8000-000000000005',
    '8fee1111-1111-4111-8111-111111111111'
  )::text,
  true
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"8d111111-1111-4111-8111-111111111111"}', true);

select is(
  (select count(*)::integer from public.lead_queue_items where id = '8d000000-0000-4000-8000-000000000005'),
  1,
  'the assigned operator sees the queue item once its team is confirmed'
);

-- 6. Guard rails stay in place.
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"8b111111-1111-4111-8111-111111111111"}', true);

select throws_ok(
  $$select public.assign_team_ownership(
    'lead',
    '8c000000-0000-4000-8000-000000000003',
    '8fee1111-1111-4111-8111-111111111111'
  )$$,
  'P0001',
  'Only workspace administrators can assign team ownership',
  'team leader cannot confirm ownership'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"8a111111-1111-4111-8111-111111111111"}', true);

select throws_ok(
  $$select public.assign_team_ownership(
    'lead',
    '8c000000-0000-4000-8000-000000000003',
    '8fee3333-3333-4333-8333-333333333333'
  )$$,
  'P0001',
  'Only active teams can receive ownership',
  'archived team cannot receive ownership'
);

select throws_ok(
  $$select public.assign_team_ownership(
    'lead',
    '8c000000-0000-4000-8000-000000000003',
    '8fee4444-4444-4444-8444-444444444444'
  )$$,
  'P0001',
  'Team must belong to the same workspace',
  'team from another workspace cannot receive ownership'
);

select throws_ok(
  $$update public.calls
    set team_id = '8fee1111-1111-4111-8111-111111111111'
    where id = '8e000000-0000-4000-8000-000000000001'$$,
  'P0001',
  'Historical team snapshot cannot be changed',
  'the historical call snapshot cannot be rewritten afterwards'
);

select * from finish();

rollback;
