begin;

set local search_path = extensions, public, private, auth, pg_catalog;

select plan(18);

insert into auth.users (id, email, aud, role, raw_user_meta_data)
values
  ('91a11111-1111-4111-8111-111111111111', 'hardening-admin@example.test', 'authenticated', 'authenticated', '{"full_name":"Hardening Admin"}'::jsonb),
  ('91b11111-1111-4111-8111-111111111111', 'hardening-tl-a@example.test', 'authenticated', 'authenticated', '{"full_name":"Hardening TL A"}'::jsonb),
  ('91c11111-1111-4111-8111-111111111111', 'hardening-tl-b@example.test', 'authenticated', 'authenticated', '{"full_name":"Hardening TL B"}'::jsonb),
  ('91d11111-1111-4111-8111-111111111111', 'hardening-op-a@example.test', 'authenticated', 'authenticated', '{"full_name":"Hardening Operator A"}'::jsonb),
  ('91e11111-1111-4111-8111-111111111111', 'hardening-op-b@example.test', 'authenticated', 'authenticated', '{"full_name":"Hardening Operator B"}'::jsonb),
  ('91f11111-1111-4111-8111-111111111111', 'hardening-op-c@example.test', 'authenticated', 'authenticated', '{"full_name":"Hardening Operator C"}'::jsonb);

insert into public.organizations (id, name, slug)
values ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Hardening Organization', 'hardening-authorization-org');

insert into public.workspaces (id, organization_id, name, slug)
values ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Hardening Workspace', 'hardening-authorization-workspace');

insert into public.workspace_members (workspace_id, user_id, role)
values
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91a11111-1111-4111-8111-111111111111', 'administrator'),
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91b11111-1111-4111-8111-111111111111', 'team_leader'),
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91c11111-1111-4111-8111-111111111111', 'team_leader'),
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91d11111-1111-4111-8111-111111111111', 'operator'),
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91e11111-1111-4111-8111-111111111111', 'operator'),
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91f11111-1111-4111-8111-111111111111', 'operator');

insert into public.teams (id, workspace_id, name, slug, status)
values
  ('91eeeeee-1111-4111-8111-111111111111', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'Hardening Team A', 'hardening-team-a', 'active'),
  ('91eeeeee-2222-4222-8222-222222222222', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'Hardening Team B', 'hardening-team-b', 'active'),
  ('91eeeeee-3333-4333-8333-333333333333', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'Hardening Archived Team', 'hardening-team-archived', 'archived');

insert into public.team_memberships (team_id, workspace_id, user_id, membership_role, active_from)
values
  ('91eeeeee-1111-4111-8111-111111111111', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91b11111-1111-4111-8111-111111111111', 'leader', now() - interval '1 day'),
  ('91eeeeee-2222-4222-8222-222222222222', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91c11111-1111-4111-8111-111111111111', 'leader', now() - interval '1 day'),
  ('91eeeeee-1111-4111-8111-111111111111', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91d11111-1111-4111-8111-111111111111', 'member', now() - interval '1 day'),
  ('91eeeeee-2222-4222-8222-222222222222', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91e11111-1111-4111-8111-111111111111', 'member', now() - interval '1 day');

update public.wallet_settings
set currency = 'CZK', monthly_commission_rate = 8
where workspace_id = '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01';

insert into public.leads (id, workspace_id, team_id, full_name, phone)
values
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91eeeeee-1111-4111-8111-111111111111', 'Hardening Lead A', '+420700000021'),
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa22', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91eeeeee-2222-4222-8222-222222222222', 'Hardening Lead B', '+420700000022'),
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa23', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', null, 'Hardening Lead C', '+420700000023');

insert into public.orders (
  id, lead_id, workspace_id, team_id, agent_id, total_amount, currency, status, delivered_at, returned_at, tracking_number
)
values
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91eeeeee-1111-4111-8111-111111111111', '91d11111-1111-4111-8111-111111111111', 1000, 'CZK', 'delivered', '2026-09-10T12:00:00Z', null, 'HARDENING-A'),
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa22', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91eeeeee-2222-4222-8222-222222222222', '91e11111-1111-4111-8111-111111111111', 1000, 'CZK', 'delivered', '2026-09-10T12:00:00Z', null, 'HARDENING-B'),
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa13', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa23', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91eeeeee-3333-4333-8333-333333333333', '91f11111-1111-4111-8111-111111111111', 1000, 'CZK', 'delivered', '2026-09-10T12:00:00Z', null, 'HARDENING-C'),
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa14', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91eeeeee-1111-4111-8111-111111111111', '91d11111-1111-4111-8111-111111111111', 1000, 'CZK', 'returned', '2026-09-24T10:00:00Z', '2026-10-03T11:00:00Z', 'HARDENING-RETURNED'),
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa15', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91eeeeee-1111-4111-8111-111111111111', '91d11111-1111-4111-8111-111111111111', 2000, 'CZK', 'delivered', '2026-10-12T10:00:00Z', null, 'HARDENING-OCTOBER');

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"91b11111-1111-4111-8111-111111111111"}', true);

select ok(
  private.can_manage_team_resource('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91eeeeee-1111-4111-8111-111111111111'),
  'Team Leader permission helper recognizes their active team'
);

select is(
  (select team_id from public.orders where id = '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11'),
  '91eeeeee-1111-4111-8111-111111111111'::uuid,
  'The tracking fixture order belongs to the Team Leader active team'
);

select ok(
  private.can_manage_team_resource(
    '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    (select team_id from public.orders where id = '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11')
  ),
  'Team Leader permission helper authorizes the tracking fixture order'
);

select throws_ok(
  $$select public.record_order_tracking_event('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12', null, 'out of team')$$,
  '42501',
  'Insufficient order permissions',
  'Team Leader cannot change tracking for an order outside their active teams'
);

select lives_ok(
  $$select public.record_order_tracking_event('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11', null, 'team A update')$$,
  'Team Leader can change tracking for an order in their active team'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"91d11111-1111-4111-8111-111111111111"}', true);

select throws_ok(
  $$select public.record_order_tracking_event('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11', null, 'operator update')$$,
  '42501',
  'Insufficient order permissions',
  'ordinary authenticated operator cannot change tracking without can_manage_team_resource permission'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"91b11111-1111-4111-8111-111111111111"}', true);

select throws_ok(
  $$select public.finalize_wallet_monthly_commission('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91e11111-1111-4111-8111-111111111111', date '2026-09-01')$$,
  '42501',
  'The operator is outside your active teams',
  'Team Leader cannot finalize an operator from another active team'
);

select lives_ok(
  $$select public.finalize_wallet_monthly_commission('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91d11111-1111-4111-8111-111111111111', date '2026-09-01')$$,
  'Team Leader can finalize an operator in their active team'
);

select is(
  (select amount from public.wallet_transactions where source_event_id = 'monthly-commission:91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01:91d11111-1111-4111-8111-111111111111:2026-09-01'::text),
  160::numeric,
  'A later return does not retroactively reduce the delivery month commission'
);

select lives_ok(
  $$select public.finalize_wallet_monthly_commission('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91d11111-1111-4111-8111-111111111111', date '2026-10-01')$$,
  'Team Leader can finalize the return month commission'
);

select is(
  (select amount from public.wallet_transactions where source_event_id = 'monthly-commission:91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01:91d11111-1111-4111-8111-111111111111:2026-10-01'::text),
  80::numeric,
  'The return reduces the return month commission'
);

select is(
  jsonb_array_length(public.finalize_workspace_monthly_settlement('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', date '2026-09-01')->'settlements'),
  1,
  'Team Leader batch settlement contains only operators from their active teams'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"91a11111-1111-4111-8111-111111111111"}', true);

select lives_ok(
  $$select public.record_order_tracking_event('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa13', null, 'administrator update')$$,
  'Administrator can change tracking throughout the workspace'
);

select lives_ok(
  $$select public.finalize_wallet_monthly_commission('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91f11111-1111-4111-8111-111111111111', date '2026-09-01')$$,
  'Administrator can finalize an operator from an archived team'
);

select is(
  jsonb_array_length(public.finalize_workspace_monthly_settlement('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', date '2026-09-01')->'settlements'),
  3,
  'Administrator batch settlement includes every workspace operator'
);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

select lives_ok(
  $$select public.record_order_tracking_event('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12', null, 'service role update')$$,
  'service_role can continue recording carrier tracking events'
);

select lives_ok(
  $$select public.finalize_wallet_monthly_commission('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91e11111-1111-4111-8111-111111111111', date '2026-09-01')$$,
  'service_role can finalize an operator outside a Team Leader scope'
);

select is(
  jsonb_array_length(public.finalize_workspace_monthly_settlement('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', date '2026-09-01')->'settlements'),
  3,
  'service_role batch settlement includes every workspace operator'
);

select * from finish();

rollback;
