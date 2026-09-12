begin;

select plan(17);

select ok(
  to_regclass('public.workspace_user_preferences') is not null,
  'workspace user preferences table exists'
);

select ok(
  coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.workspace_user_preferences')), false),
  'workspace user preferences has RLS enabled'
);

select ok(
  case
    when to_regclass('public.workspace_user_preferences') is null then false
    else not has_table_privilege('anon', to_regclass('public.workspace_user_preferences'), 'select,insert,update,delete')
  end,
  'anonymous requests have no preference table privileges'
);

select ok(
  case
    when to_regclass('public.workspace_user_preferences') is null then false
    else has_table_privilege('authenticated', to_regclass('public.workspace_user_preferences'), 'select,insert,update')
      and not has_table_privilege('authenticated', to_regclass('public.workspace_user_preferences'), 'delete')
  end,
  'authenticated users can manage but not delete their preference row'
);

select ok(
  case
    when to_regclass('public.workspace_user_preferences') is null then false
    else has_table_privilege('service_role', to_regclass('public.workspace_user_preferences'), 'select,insert,update,delete')
  end,
  'service role can maintain preference rows'
);

insert into auth.users (id, email, aud, role, raw_user_meta_data)
values
  ('61111111-1111-4111-8111-111111111111', 'preferences-user-a@example.test', 'authenticated', 'authenticated', '{"full_name":"Preferences User A"}'::jsonb),
  ('62222222-2222-4222-8222-222222222222', 'preferences-user-b@example.test', 'authenticated', 'authenticated', '{"full_name":"Preferences User B"}'::jsonb);

insert into public.organizations (id, name, slug)
values
  ('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Preferences Organization A', 'preferences-org-a'),
  ('6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Preferences Organization B', 'preferences-org-b');

insert into public.workspaces (id, organization_id, name, slug)
values
  ('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Preferences Workspace A', 'preferences-workspace-a'),
  ('6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01', '6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Preferences Workspace B', 'preferences-workspace-b');

insert into public.workspace_members (workspace_id, user_id, role)
values
  ('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '61111111-1111-4111-8111-111111111111', 'operator'),
  ('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '62222222-2222-4222-8222-222222222222', 'team_leader'),
  ('6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01', '61111111-1111-4111-8111-111111111111', 'operator');

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"61111111-1111-4111-8111-111111111111"}', true);

select lives_ok(
  $$insert into public.workspace_user_preferences (
      workspace_id, user_id, ringtone_volume
    ) values (
      '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
      '61111111-1111-4111-8111-111111111111',
      25
    )$$,
  'user inserts own preferences in a workspace membership'
);

select is(
  (select ringtone_volume::integer from public.workspace_user_preferences
   where workspace_id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'),
  25,
  'user reads own workspace preferences'
);

select lives_ok(
  $$update public.workspace_user_preferences
    set ringtone_volume = 40
    where workspace_id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'$$,
  'user updates own workspace preferences'
);

select is(
  (select ringtone_volume::integer from public.workspace_user_preferences
   where workspace_id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'),
  40,
  'own preference update persisted'
);

select throws_ok(
  $$insert into public.workspace_user_preferences (
      workspace_id, user_id, ringtone_volume
    ) values (
      '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
      '62222222-2222-4222-8222-222222222222',
      50
    )$$,
  '42501',
  'new row violates row-level security policy for table "workspace_user_preferences"',
  'user cannot write another member preferences'
);

select lives_ok(
  $$insert into public.workspace_user_preferences (
      workspace_id, user_id, ringtone_volume
    ) values (
      '6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01',
      '61111111-1111-4111-8111-111111111111',
      60
    )$$,
  'same user can keep separate preferences in another own workspace'
);

select is(
  (select count(*)::integer from public.workspace_user_preferences),
  2,
  'preferences are isolated by the workspace and user composite identity'
);

select throws_ok(
  $$update public.workspace_user_preferences
    set user_id = '62222222-2222-4222-8222-222222222222'
    where workspace_id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'$$,
  'P0001',
  'Preference identity cannot be changed',
  'user cannot rewrite an existing preference identity'
);

select throws_ok(
  $$update public.workspace_user_preferences
    set ringtone_volume = 101
    where workspace_id = '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'$$,
  '23514',
  null,
  'database rejects volume outside zero to one hundred'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"62222222-2222-4222-8222-222222222222"}', true);

select is(
  (select count(*)::integer from public.workspace_user_preferences),
  0,
  'another workspace member cannot read user A preferences'
);

select is_empty(
  $$update public.workspace_user_preferences
    set ringtone_volume = 70
    returning 1$$,
  'another workspace member cannot update user A preferences'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$select * from public.workspace_user_preferences$$,
  '42501',
  'permission denied for table workspace_user_preferences',
  'anonymous request cannot read preferences'
);

select * from finish();

rollback;
