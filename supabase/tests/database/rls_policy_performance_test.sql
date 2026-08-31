begin;

set local search_path = public, extensions;

select plan(12);

select ok(
  to_regprocedure('private.is_workspace_member(uuid)') is not null,
  'workspace member helper exists in the private schema'
);
select ok(
  to_regprocedure('private.is_workspace_manager_or_admin(uuid)') is not null,
  'workspace manager helper exists in the private schema'
);

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public'
     and tablename in ('products', 'objections', 'record_entities', 'record_values', 'workflows', 'user_gamification')
     and cmd = 'ALL'),
  0,
  'affected tables have no broad ALL policies'
);

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public'
     and tablename in ('products', 'objections', 'record_entities', 'record_values', 'workflows', 'user_gamification')
     and roles <> array['authenticated']::name[]),
  0,
  'affected mutation policies target authenticated users only'
);

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public'
     and tablename in ('products', 'objections', 'record_entities', 'record_values', 'workflows', 'user_gamification')
     and cmd in ('INSERT', 'UPDATE', 'DELETE')),
  18,
  'affected tables expose exactly one policy per mutation'
);

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public'
     and tablename in ('products', 'objections', 'record_entities', 'record_values', 'workflows', 'user_gamification')
     and cmd = 'UPDATE'
     and (qual is null or with_check is null)),
  0,
  'every UPDATE policy has both USING and WITH CHECK'
);

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public'
     and tablename in ('products', 'workflows')
     and (qual::text like '%is_workspace_manager_or_admin%' or with_check::text like '%is_workspace_manager_or_admin%')),
  6,
  'manager policies use the workspace manager helper'
);

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public'
     and tablename in ('record_entities', 'record_values')
     and cmd in ('INSERT', 'UPDATE', 'DELETE')
     and (qual::text like '%is_workspace_member%' or with_check::text like '%is_workspace_member%')),
  6,
  'record policies use the workspace member helper'
);

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public'
     and tablename = 'objections'
     and cmd in ('INSERT', 'UPDATE', 'DELETE')
     and (qual::text like '%products%workspace_id%' or with_check::text like '%products%workspace_id%')),
  3,
  'objection policies retain product workspace matching'
);

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public'
     and tablename = 'record_entities'
     and cmd in ('INSERT', 'UPDATE', 'DELETE')
     and (qual::text like '%custom_objects%workspace_id%' or with_check::text like '%custom_objects%workspace_id%')),
  3,
  'record entity policies retain custom object workspace matching'
);

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public'
     and tablename = 'record_values'
     and cmd in ('INSERT', 'UPDATE', 'DELETE')
     and (qual::text like '%record_entities%workspace_id%' or with_check::text like '%record_entities%workspace_id%')),
  3,
  'record value policies retain parent entity workspace matching'
);

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public'
     and tablename = 'user_gamification'
     and cmd in ('INSERT', 'UPDATE', 'DELETE')
     and (qual::text like '%auth.uid%' or with_check::text like '%auth.uid%')),
  3,
  'gamification policies remain user-owned'
);

select * from finish();

rollback;
