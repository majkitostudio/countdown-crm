begin;

select plan(16);

insert into auth.users (id, email, aud, role, raw_user_meta_data)
values
  ('ad100000-0000-4000-8000-000000000001', 'provision-existing@example.test', 'authenticated', 'authenticated', '{"full_name":"Original"}'),
  ('ad100000-0000-4000-8000-000000000002', 'provision-missing@example.test', 'authenticated', 'authenticated', '{"full_name":"Missing"}');

-- Simulate an older account without a profile. The other account retains the
-- profile created by the real auth.users trigger.
delete from public.profiles where id = 'ad100000-0000-4000-8000-000000000002';

insert into public.organizations (id, name, slug)
values ('ad200000-0000-4000-8000-000000000001', 'Provision Test', 'provision-grants-test');
insert into public.workspaces (id, organization_id, name, slug)
values ('ad300000-0000-4000-8000-000000000001', 'ad200000-0000-4000-8000-000000000001', 'Provision Test', 'provision-grants-test');
insert into public.teams (id, workspace_id, name, slug, status)
values ('ad400000-0000-4000-8000-000000000001', 'ad300000-0000-4000-8000-000000000001', 'Provision Test', 'provision-grants-test', 'active');

select ok(not has_table_privilege('anon', 'public.profiles', 'INSERT'), 'anonymous role has no profile insert grant');
select ok(not has_table_privilege('anon', 'public.team_memberships', 'INSERT'), 'anonymous role has no team membership insert grant');
select ok(not has_table_privilege('service_role', 'public.profiles', 'UPDATE'), 'service role is not granted profile update');
select ok(not has_table_privilege('service_role', 'public.team_memberships', 'UPDATE'), 'service role is not granted team membership update');
select ok(not has_table_privilege('service_role', 'public.team_memberships', 'DELETE'), 'service role is not granted team membership delete');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

select is((select id from public.teams where id = 'ad400000-0000-4000-8000-000000000001' and workspace_id = 'ad300000-0000-4000-8000-000000000001'),
  'ad400000-0000-4000-8000-000000000001'::uuid, 'service role can validate the selected team');
select lives_ok($sql$
  insert into public.profiles (id, email, full_name, role, status, updated_at)
  values ('ad100000-0000-4000-8000-000000000001', 'changed@example.test', 'Changed', 'operator', 'ready', now())
  on conflict (id) do nothing
$sql$, 'existing profile can be ignored on conflict');
select is((select full_name from public.profiles where id = 'ad100000-0000-4000-8000-000000000001'), 'Original', 'existing profile is unchanged');
select lives_ok($sql$
  insert into public.profiles (id, email, full_name, role, status, updated_at)
  values ('ad100000-0000-4000-8000-000000000002', 'provision-missing@example.test', 'Created', 'operator', 'ready', now())
  on conflict (id) do nothing
$sql$, 'missing profile can be inserted');
select lives_ok($sql$
  insert into public.workspace_members (workspace_id, user_id, role)
  values ('ad300000-0000-4000-8000-000000000001', 'ad100000-0000-4000-8000-000000000002', 'operator')
$sql$, 'service role can insert workspace membership');
select lives_ok($sql$
  insert into public.team_memberships (workspace_id, team_id, user_id, membership_role, active_from)
  values ('ad300000-0000-4000-8000-000000000001', 'ad400000-0000-4000-8000-000000000001', 'ad100000-0000-4000-8000-000000000002', 'member', now())
$sql$, 'service role can insert team membership including its validation and audit triggers');
select is((select role from public.workspace_members where workspace_id = 'ad300000-0000-4000-8000-000000000001' and user_id = 'ad100000-0000-4000-8000-000000000002'),
  'operator', 'service role can read the resulting workspace membership');
select is((select full_name from public.profiles where id = 'ad100000-0000-4000-8000-000000000002'), 'Created', 'service role can read the resulting profile');
select throws_ok($sql$
  insert into public.team_memberships (workspace_id, team_id, user_id, membership_role, active_from)
  values ('ad300000-0000-4000-8000-000000000001', 'ad400000-0000-4000-8000-000000000001', 'ad100000-0000-4000-8000-000000000001', 'member', now())
$sql$, 'P0001', 'Team membership requires a member of the same workspace', 'team validation still rejects a user outside the workspace');

set local role anon;
select throws_ok($sql$
  insert into public.profiles (id, email, full_name, role)
  values ('ad100000-0000-4000-8000-000000000001', 'denied@example.test', 'Denied', 'operator')
$sql$, '42501', null, 'anonymous role cannot insert a profile');

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"ad100000-0000-4000-8000-000000000001"}', true);
select throws_ok($sql$
  insert into public.workspace_members (workspace_id, user_id, role)
  values ('ad300000-0000-4000-8000-000000000001', 'ad100000-0000-4000-8000-000000000001', 'administrator')
$sql$, '42501', null, 'authenticated outsider cannot add themselves to the workspace');

reset role;
select * from finish();
rollback;
