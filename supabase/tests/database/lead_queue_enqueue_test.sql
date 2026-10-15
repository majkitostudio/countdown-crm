begin;

-- A lead has to reach the queue automatically, whichever path creates it. This
-- test covers the trigger from 20261015091000_lead_queue_enqueue_on_insert.sql:
-- the queue item is born with the lead, it inherits the lead's team, an already
-- closed lead is queued as closed, and the Administrator still confirms the
-- responsible team afterwards through the 20261015090000 ownership cascade.

select plan(20);

insert into auth.users (id, email, aud, role, raw_user_meta_data)
values
  ('9a111111-1111-4111-8111-111111111111', 'enqueue-admin@example.test', 'authenticated', 'authenticated', '{"full_name":"Enqueue Admin"}'::jsonb),
  ('9b111111-1111-4111-8111-111111111111', 'enqueue-tl@example.test', 'authenticated', 'authenticated', '{"full_name":"Enqueue TL"}'::jsonb),
  ('9d111111-1111-4111-8111-111111111111', 'enqueue-operator@example.test', 'authenticated', 'authenticated', '{"full_name":"Enqueue Operator"}'::jsonb);

insert into public.organizations (id, name, slug)
values ('9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Enqueue Organization', 'enqueue-org');

insert into public.workspaces (id, organization_id, name, slug)
values ('9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Enqueue Workspace', 'enqueue-workspace');

insert into public.workspace_members (workspace_id, user_id, role)
values
  ('9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '9a111111-1111-4111-8111-111111111111', 'administrator'),
  ('9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '9b111111-1111-4111-8111-111111111111', 'team_leader'),
  ('9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '9d111111-1111-4111-8111-111111111111', 'operator');

insert into public.teams (id, workspace_id, name, slug, status)
values ('9fee1111-1111-4111-8111-111111111111', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'Enqueue Team A', 'enqueue-team-a', 'active');

insert into public.team_memberships (team_id, workspace_id, user_id, membership_role, active_from)
values
  ('9fee1111-1111-4111-8111-111111111111', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '9b111111-1111-4111-8111-111111111111', 'leader', now() - interval '1 day'),
  ('9fee1111-1111-4111-8111-111111111111', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '9d111111-1111-4111-8111-111111111111', 'member', now() - interval '1 day');

-- Two leads are queued normally (one with a team, one without). Two more arrive
-- already closed, because a customer or an unresponsive lead cannot be worked.
insert into public.leads (id, workspace_id, team_id, full_name, phone, status)
values
  ('9c000000-0000-4000-8000-000000000001', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', null, 'Enqueue Lead Teamless', '+420700000091', 'new'),
  ('9c000000-0000-4000-8000-000000000002', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '9fee1111-1111-4111-8111-111111111111', 'Enqueue Lead Team', '+420700000092', 'new'),
  ('9c000000-0000-4000-8000-000000000003', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', null, 'Enqueue Lead Customer', '+420700000093', 'customer'),
  ('9c000000-0000-4000-8000-000000000004', '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', null, 'Enqueue Lead Unresponsive', '+420700000094', 'unresponsive');

-- 1-2. The queue entry point is a trigger on leads, not the caller's duty.
select ok(
  exists (select 1 from pg_trigger where tgname = 'leads_enqueue_queue_item' and not tgisinternal),
  'a trigger queues every new lead'
);

select ok(
  (select pg_get_triggerdef(oid) from pg_trigger where tgname = 'leads_enqueue_queue_item')
    like 'CREATE TRIGGER %AFTER INSERT ON public.leads%',
  'the queue item is created after the lead is stored'
);

-- 3-4. Clients cannot write the queue by hand through this trigger function.
select ok(
  (select prosecdef from pg_proc where oid = 'private.enqueue_lead_queue_item()'::regprocedure),
  'the queue trigger runs as the defining role'
);

select ok(
  not has_function_privilege('anon', 'private.enqueue_lead_queue_item()', 'execute'),
  'anonymous requests cannot queue leads directly'
);

-- 5-14. What the trigger wrote.
select is(
  (select count(*)::integer from public.lead_queue_items where lead_id = '9c000000-0000-4000-8000-000000000001'),
  1,
  'a teamless lead still gets a queue item'
);

select is(
  (select state from public.lead_queue_items where lead_id = '9c000000-0000-4000-8000-000000000001'),
  'available',
  'a fresh lead waits as available'
);

select is(
  (select team_id from public.lead_queue_items where lead_id = '9c000000-0000-4000-8000-000000000001'),
  null::uuid,
  'a teamless lead stays unconfirmed in the queue'
);

select is(
  (select completed_at from public.lead_queue_items where lead_id = '9c000000-0000-4000-8000-000000000001'),
  null::timestamptz,
  'an open queue item is not completed'
);

select is(
  (select team_id from public.lead_queue_items where lead_id = '9c000000-0000-4000-8000-000000000002'),
  '9fee1111-1111-4111-8111-111111111111'::uuid,
  'the queue item inherits the lead team'
);

select is(
  (select assigned_operator_id from public.lead_queue_items where lead_id = '9c000000-0000-4000-8000-000000000002'),
  null::uuid,
  'an automatic queue item is not pre-assigned to an operator'
);

select is(
  (select state from public.lead_queue_items where lead_id = '9c000000-0000-4000-8000-000000000003'),
  'closed',
  'a customer lead is queued as closed'
);

select is(
  (select state from public.lead_queue_items where lead_id = '9c000000-0000-4000-8000-000000000004'),
  'closed',
  'an unresponsive lead is queued as closed'
);

select ok(
  (select completed_at from public.lead_queue_items where lead_id = '9c000000-0000-4000-8000-000000000003') is not null,
  'a closed queue item carries its completion time'
);

select is(
  (select count(*)::integer from public.lead_queue_items where workspace_id = '9aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'),
  4,
  'the trigger creates exactly one queue item per lead'
);

-- 15-20. Visibility and the ownership hand-off.
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"9a111111-1111-4111-8111-111111111111"}', true);

select is(
  (select count(*)::integer from public.lead_queue_items where lead_id = '9c000000-0000-4000-8000-000000000001'),
  1,
  'an administrator sees the queue work that still waits for ownership'
);

select set_config(
  'crm.enqueue_result',
  public.assign_team_ownership(
    'lead',
    '9c000000-0000-4000-8000-000000000001',
    '9fee1111-1111-4111-8111-111111111111'
  )::text,
  true
);

select is(
  current_setting('crm.enqueue_result')::jsonb ->> 'queue_items_updated',
  '1',
  'confirming the team reaches the automatically created queue item'
);

select is(
  (select team_id from public.lead_queue_items where lead_id = '9c000000-0000-4000-8000-000000000001'),
  '9fee1111-1111-4111-8111-111111111111'::uuid,
  'the automatically created queue item follows the confirmed team'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"9b111111-1111-4111-8111-111111111111"}', true);

select is(
  (select count(*)::integer from public.lead_queue_items where lead_id = '9c000000-0000-4000-8000-000000000002'),
  1,
  'the team leader sees the queue work of their team'
);

select is(
  (select count(*)::integer from public.lead_queue_items where lead_id = '9c000000-0000-4000-8000-000000000003'),
  0,
  'the team leader does not see queue work without a confirmed team'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"9d111111-1111-4111-8111-111111111111"}', true);

select is(
  (select count(*)::integer from public.lead_queue_items where lead_id = '9c000000-0000-4000-8000-000000000002'),
  0,
  'an operator does not see queue work that is not assigned to them'
);

select * from finish();

rollback;
