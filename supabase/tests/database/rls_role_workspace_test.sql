begin;

-- Runtime RLS proof for the policies introduced by
-- 20260830205207_rls_policy_performance_hardening.sql.
--
-- The identities and rows below are local, transactional fixtures. This file
-- must not be used to claim that the linked sandbox has the migration applied
-- or that a live cross-workspace scenario was exercised.

select plan(46);

insert into auth.users (id, email, aud, role, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'rls-admin-a@example.test', 'authenticated', 'authenticated', '{"full_name":"RLS Admin A"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'rls-operator-a@example.test', 'authenticated', 'authenticated', '{"full_name":"RLS Operator A"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'rls-admin-b@example.test', 'authenticated', 'authenticated', '{"full_name":"RLS Admin B"}'::jsonb);

insert into public.organizations (id, name, slug)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'RLS Organization A', 'rls-org-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'RLS Organization B', 'rls-org-b');

insert into public.workspaces (id, organization_id, name, slug)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'RLS Workspace A', 'rls-workspace-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'RLS Workspace B', 'rls-workspace-b');

insert into public.workspace_members (workspace_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', '11111111-1111-1111-1111-111111111111', 'administrator'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', '22222222-2222-2222-2222-222222222222', 'operator'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', '33333333-3333-3333-3333-333333333333', 'administrator');

insert into public.products (id, workspace_id, title, category, price)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'RLS Product A', 'test', 10),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb11', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'RLS Product B', 'test', 20);

insert into public.objections (id, workspace_id, product_id, objection_title, rebuttal_args)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa12', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11', 'RLS objection A', array['RLS rebuttal']);

insert into public.custom_objects (workspace_id, slug, singular_name, plural_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'rls-deals-a', 'RLS Deal A', 'RLS Deals A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'rls-deals-b', 'RLS Deal B', 'RLS Deals B');

insert into public.record_entities (id, workspace_id, object_slug)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa21', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'rls-deals-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb21', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'rls-deals-b');

insert into public.record_values (id, workspace_id, record_id, attribute_slug, value_json)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa22', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa21', 'stage', '"initial"'::jsonb),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb22', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb21', 'stage', '"initial"'::jsonb);

insert into public.workflows (id, workspace_id, name, trigger_event)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa31', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'RLS Workflow A', 'rls.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb31', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'RLS Workflow B', 'rls.test');

insert into public.user_gamification (user_id, level, xp)
values
  ('11111111-1111-1111-1111-111111111111', 1, 0),
  ('22222222-2222-2222-2222-222222222222', 1, 0),
  ('33333333-3333-3333-3333-333333333333', 1, 0);

select ok(
  not exists (
    select 1
    from unnest(array[
      'products', 'objections', 'record_entities', 'record_values',
      'workflows', 'user_gamification'
    ]) as target(table_name)
    where has_table_privilege('anon', format('public.%s', target.table_name), 'select,insert,update,delete')
  ),
  'anon has no table grant for the PR #61 policy set'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"11111111-1111-1111-1111-111111111111"}', true);

select is(
  (select count(*)::integer from public.products where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11'),
  1,
  'administrator reads a product in the own workspace'
);
select lives_ok(
  $$insert into public.products (id, workspace_id, title, category, price)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa13', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'RLS Product A2', 'test', 11)$$,
  'administrator inserts a product in the own workspace'
);
select lives_ok(
  $$update public.products set title = 'RLS Product A updated'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa13'$$,
  'administrator updates a product in the own workspace'
);
select lives_ok(
  $$delete from public.products where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa13'$$,
  'administrator deletes a product in the own workspace'
);
select lives_ok(
  $$insert into public.objections (id, workspace_id, product_id, objection_title, rebuttal_args)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa14', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11', 'RLS objection A2', array['RLS rebuttal'])$$,
  'administrator inserts an objection for an own-workspace product'
);
select throws_ok(
  $$insert into public.objections (id, workspace_id, product_id, objection_title, rebuttal_args)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa15', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb11', 'RLS objection cross', array['RLS rebuttal'])$$,
  '42501',
  null,
  'administrator cannot attach an objection to a product in another workspace'
);
select lives_ok(
  $$insert into public.workflows (id, workspace_id, name, trigger_event)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa32', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'RLS Workflow A2', 'rls.test')$$,
  'administrator inserts a workflow in the own workspace'
);
select lives_ok(
  $$update public.workflows set name = 'RLS Workflow A2 updated'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa32'$$,
  'administrator updates a workflow in the own workspace'
);
select lives_ok(
  $$delete from public.workflows where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa32'$$,
  'administrator deletes a workflow in the own workspace'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"22222222-2222-2222-2222-222222222222"}', true);

select is(
  (select count(*)::integer from public.products where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11'),
  1,
  'operator reads a product in the own workspace'
);
select throws_ok(
  $$insert into public.products (id, workspace_id, title, category, price)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa16', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'RLS Product denied', 'test', 12)$$,
  '42501',
  null,
  'operator cannot insert a product'
);
select lives_ok(
  $$update public.products set title = 'RLS Product operator update denied'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11'$$,
  'operator update of a product is evaluated without an error'
);
select is(
  (select title from public.products where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11'),
  'RLS Product A',
  'operator update leaves the product unchanged'
);
select lives_ok(
  $$delete from public.products where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11'$$,
  'operator delete of a product is evaluated without an error'
);
select is(
  (select count(*)::integer from public.products where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11'),
  1,
  'operator delete leaves the product present'
);
select throws_ok(
  $$insert into public.objections (id, workspace_id, product_id, objection_title, rebuttal_args)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa17', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11', 'RLS objection denied', array['RLS rebuttal'])$$,
  '42501',
  null,
  'operator cannot insert an objection'
);
select lives_ok(
  $$insert into public.record_entities (id, workspace_id, object_slug)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa23', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'rls-deals-a')$$,
  'workspace member inserts a record entity in the own workspace'
);
select lives_ok(
  $$update public.record_entities set updated_at = now()
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa23'$$,
  'workspace member updates a record entity in the own workspace'
);
select lives_ok(
  $$delete from public.record_entities where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa23'$$,
  'workspace member deletes a record entity in the own workspace'
);
select lives_ok(
  $$insert into public.record_values (id, workspace_id, record_id, attribute_slug, value_json)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa24', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa21', 'stage2', '"member"'::jsonb)$$,
  'workspace member inserts a record value in the own workspace'
);
select lives_ok(
  $$update public.record_values set value_json = '"member-updated"'::jsonb
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa24'$$,
  'workspace member updates a record value in the own workspace'
);
select throws_ok(
  $$insert into public.record_values (id, workspace_id, record_id, attribute_slug, value_json)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa25', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb21', 'stage2', '"cross-parent"'::jsonb)$$,
  '42501',
  null,
  'workspace member cannot write a value for a parent in another workspace'
);
select is(
  (select count(*)::integer from public.workflows where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa31'),
  1,
  'operator reads a workflow in the own workspace'
);
select throws_ok(
  $$insert into public.workflows (id, workspace_id, name, trigger_event)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa33', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'RLS Workflow denied', 'rls.test')$$,
  '42501',
  null,
  'operator cannot insert a workflow'
);
select lives_ok(
  $$update public.workflows set name = 'RLS Workflow operator update denied'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa31'$$,
  'operator update of a workflow is evaluated without an error'
);
select is(
  (select name from public.workflows where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa31'),
  'RLS Workflow A',
  'operator update leaves the workflow unchanged'
);
select lives_ok(
  $$delete from public.workflows where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa31'$$,
  'operator delete of a workflow is evaluated without an error'
);
select is(
  (select count(*)::integer from public.workflows where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa31'),
  1,
  'operator delete leaves the workflow present'
);
select is(
  (select count(*)::integer from public.user_gamification where user_id = '22222222-2222-2222-2222-222222222222'),
  1,
  'user reads own gamification row'
);
select is(
  (select count(*)::integer from public.user_gamification where user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'user cannot read another user gamification row'
);
select lives_ok(
  $$update public.user_gamification set xp = 10
    where user_id = '22222222-2222-2222-2222-222222222222'$$,
  'user updates own gamification row'
);
select lives_ok(
  $$update public.user_gamification set xp = 10
    where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'user update of another user gamification row is evaluated without an error'
);
set local role postgres;
select is(
  (select xp from public.user_gamification where user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'user update leaves another user gamification row unchanged'
);
set local role authenticated;
select lives_ok(
  $$delete from public.user_gamification where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'user delete of another user gamification row is evaluated without an error'
);
set local role postgres;
select is(
  (select count(*)::integer from public.user_gamification where user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'user delete leaves another user gamification row present'
);
set local role authenticated;
select throws_ok(
  $$insert into public.user_gamification (user_id, level, xp)
    values ('11111111-1111-1111-1111-111111111111', 2, 20)$$,
  '42501',
  null,
  'user cannot insert another user gamification row'
);

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"33333333-3333-3333-3333-333333333333"}', true);

select is(
  (select count(*)::integer from public.products where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11'),
  0,
  'administrator in another workspace cannot read the product'
);
select is(
  (select count(*)::integer from public.workflows where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa31'),
  0,
  'administrator in another workspace cannot read the workflow'
);
select is(
  (select count(*)::integer from public.record_entities where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa21'),
  0,
  'administrator in another workspace cannot read the record entity'
);
select throws_ok(
  $$insert into public.products (id, workspace_id, title, category, price)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa34', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'RLS Product cross denied', 'test', 13)$$,
  '42501',
  null,
  'administrator in another workspace cannot insert a product'
);
select lives_ok(
  $$update public.products set title = 'RLS Product cross update denied'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11'$$,
  'cross-workspace product update is evaluated without an error'
);
set local role postgres;
select is(
  (select title from public.products where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11'),
  'RLS Product A',
  'cross-workspace update leaves the product unchanged'
);
set local role authenticated;
select lives_ok(
  $$delete from public.products where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11'$$,
  'cross-workspace product delete is evaluated without an error'
);
set local role postgres;
select is(
  (select count(*)::integer from public.products where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11'),
  1,
  'cross-workspace delete leaves the product present'
);
set local role authenticated;
select is(
  (select count(*)::integer from public.user_gamification where user_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'administrator in another workspace cannot read another user gamification row'
);

select * from finish();

rollback;
