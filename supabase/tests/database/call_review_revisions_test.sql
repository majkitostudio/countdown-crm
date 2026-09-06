begin;

select plan(15);

select ok(
  to_regclass('public.call_review_revisions') is not null,
  'call review revision table exists'
);

select ok(
  coalesce((
    select relrowsecurity
    from pg_class
    where oid = to_regclass('public.call_review_revisions')
  ), false),
  'call review revisions have RLS enabled'
);

select ok(
  case
    when to_regclass('public.call_review_revisions') is null then false
    else has_table_privilege('authenticated', to_regclass('public.call_review_revisions'), 'select,insert')
  end,
  'authenticated managers have the grants required by RLS'
);

select ok(
  case
    when to_regclass('public.call_review_revisions') is null then false
    else not has_table_privilege('authenticated', to_regclass('public.call_review_revisions'), 'update,delete')
  end,
  'authenticated users cannot update or delete review history'
);

select ok(
  case
    when to_regclass('public.call_review_revisions') is null then false
    else not has_table_privilege('anon', to_regclass('public.call_review_revisions'), 'select,insert,update,delete')
  end,
  'anonymous users have no review access'
);

select is(
  (select count(*)::integer
   from pg_policies
   where schemaname = 'public'
     and tablename = 'call_review_revisions'
     and cmd = 'SELECT'
     and roles = array['authenticated']::name[]),
  1,
  'one manager SELECT policy exists'
);

select is(
  (select count(*)::integer
   from pg_policies
   where schemaname = 'public'
     and tablename = 'call_review_revisions'
     and cmd = 'INSERT'
     and roles = array['authenticated']::name[]
     and with_check::text like '%is_workspace_manager_or_admin%'),
  1,
  'one manager INSERT policy checks workspace role'
);

select is(
  (select count(*)::integer
   from pg_policies
   where schemaname = 'public'
     and tablename = 'call_review_revisions'
     and cmd in ('UPDATE', 'DELETE')),
  0,
  'no UPDATE or DELETE policy exists'
);

select ok(
  to_regprocedure('public.record_call_review_revision(uuid,integer,text,text,text)') is not null,
  'atomic review function exists'
);

select ok(
  case
    when to_regprocedure('public.record_call_review_revision(uuid,integer,text,text,text)') is null then false
    else has_function_privilege(
      'authenticated',
      to_regprocedure('public.record_call_review_revision(uuid,integer,text,text,text)'),
      'execute'
    )
  end,
  'authenticated users can reach the RLS-protected review function'
);

select ok(
  case
    when to_regprocedure('public.record_call_review_revision(uuid,integer,text,text,text)') is null then false
    else not has_function_privilege(
      'anon',
      to_regprocedure('public.record_call_review_revision(uuid,integer,text,text,text)'),
      'execute'
    )
  end,
  'anonymous users cannot execute the review function'
);

select is(
  (select prosecdef
   from pg_proc
   where oid = to_regprocedure('public.record_call_review_revision(uuid,integer,text,text,text)')),
  false,
  'review function uses caller permissions instead of bypassing RLS'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = to_regclass('public.call_review_revisions')
      and contype = 'u'
      and pg_get_constraintdef(oid) like '%call_id, revision_number%'
  ),
  'one revision number is unique per call'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = to_regclass('public.call_review_revisions')
      and not tgisinternal
      and tgname = 'call_review_revisions_prepare'
  ),
  'review preparation trigger exists'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = to_regclass('public.call_review_revisions')
      and not tgisinternal
      and tgname = 'call_review_revisions_audit'
  ),
  'review audit trigger exists'
);

select * from finish();

rollback;
