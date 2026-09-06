begin;

select plan(13);

select ok(
  to_regclass('public.team_leader_exception_actions') is not null,
  'exception action table exists'
);

select ok(
  coalesce((
    select relrowsecurity
    from pg_class
    where oid = to_regclass('public.team_leader_exception_actions')
  ), false),
  'exception action table has RLS enabled'
);

select ok(
  case
    when to_regclass('public.team_leader_exception_actions') is null then false
    else not has_table_privilege('anon', to_regclass('public.team_leader_exception_actions'), 'select,insert,update,delete')
  end,
  'anonymous requests have no exception action access'
);

select ok(
  case
    when to_regclass('public.team_leader_exception_actions') is null then false
    else has_table_privilege('authenticated', to_regclass('public.team_leader_exception_actions'), 'select,insert,update')
  end,
  'authenticated managers have the grants needed by RLS'
);

select ok(
  case
    when to_regclass('public.team_leader_exception_actions') is null then false
    else not has_table_privilege('authenticated', to_regclass('public.team_leader_exception_actions'), 'delete')
  end,
  'exception action history cannot be deleted through the Data API'
);

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public'
     and tablename = 'team_leader_exception_actions'
     and cmd = 'SELECT'
     and roles = array['authenticated']::name[]),
  1,
  'one authenticated manager SELECT policy exists'
);

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public'
     and tablename = 'team_leader_exception_actions'
     and cmd = 'INSERT'
     and roles = array['authenticated']::name[]
     and with_check::text like '%is_workspace_manager_or_admin%'
     and with_check::text like '%auth.uid%'),
  1,
  'INSERT policy checks workspace manager role and actor identity'
);

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public'
     and tablename = 'team_leader_exception_actions'
     and cmd = 'UPDATE'
     and roles = array['authenticated']::name[]
     and qual is not null
     and with_check is not null),
  1,
  'UPDATE policy has both USING and WITH CHECK'
);

select ok(
  to_regprocedure('public.resolve_team_leader_exception(uuid,text,text)') is not null,
  'atomic resolve function exists'
);

select ok(
  to_regprocedure('public.snooze_team_leader_exception(uuid,text,timestamp with time zone,text)') is not null,
  'atomic snooze function exists'
);

select ok(
  to_regclass('public.team_leader_exception_actions') is not null
  and exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'team_leader_exception_actions'
      and indexname = 'team_leader_exception_actions_actor_id_idx'
  ),
  'actor foreign key has a supporting index'
);

select ok(
  has_function_privilege('authenticated', 'public.resolve_team_leader_exception(uuid,text,text)', 'execute')
  and has_function_privilege('authenticated', 'public.snooze_team_leader_exception(uuid,text,timestamp with time zone,text)', 'execute')
  and not has_function_privilege('anon', 'public.resolve_team_leader_exception(uuid,text,text)', 'execute')
  and not has_function_privilege('anon', 'public.snooze_team_leader_exception(uuid,text,timestamp with time zone,text)', 'execute'),
  'only authenticated requests can execute the public exception functions'
);

select ok(
  has_function_privilege('authenticated', 'private.assert_team_leader_exception_active(uuid,text)', 'execute')
  and not has_function_privilege('anon', 'private.assert_team_leader_exception_active(uuid,text)', 'execute'),
  'active-source guard is unavailable to anonymous requests'
);

select * from finish();

rollback;
