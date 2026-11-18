begin;

set local search_path = extensions, public, private, auth, pg_catalog;

select plan(24);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('91111111-1111-4111-8111-111111111111', 'audit-admin@example.test', 'authenticated', 'authenticated', '{"full_name":"Audit Admin"}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Audit Integrity Org', 'audit-integrity-org');

insert into public.workspaces (id, organization_id, name, slug) values
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Audit A', 'audit-integrity-a'),
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Audit B', 'audit-integrity-b');

insert into public.workspace_members (workspace_id, user_id, role) values
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91111111-1111-4111-8111-111111111111', 'administrator');

insert into public.products (id, workspace_id, title, category, price, currency) values
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'Audit Product', 'Test', 100, 'CZK'),
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'Reassign Source', 'Test', 100, 'CZK'),
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa13', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'Reassign Target', 'Test', 120, 'CZK');

insert into public.leads (id, workspace_id, full_name, phone, status) values
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'Audit Lead', '+420700000091', 'new'),
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa22', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02', 'Other Workspace Lead', '+420700000092', 'new');

insert into public.orders (id, workspace_id, product_id, agent_id, total_amount, status, currency) values
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11', '91111111-1111-4111-8111-111111111111', 100, 'pending', 'CZK'),
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa32', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', null, '91111111-1111-4111-8111-111111111111', 0, 'pending', 'CZK'),
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa33', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12', '91111111-1111-4111-8111-111111111111', 100, 'pending', 'CZK'),
  ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa34', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02', null, null, 0, 'pending', 'CZK');

select ok(
  not has_table_privilege('authenticated', 'public.audit_logs', 'INSERT')
  and not has_table_privilege('authenticated', 'public.audit_logs', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.audit_logs', 'DELETE'),
  'authenticated has no direct write privilege on audit logs'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"91111111-1111-4111-8111-111111111111"}', true);

select throws_ok(
  $$insert into public.audit_logs (workspace_id, actor_id, actor_name, action, target_resource, details)
    values ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91111111-1111-4111-8111-111111111111', 'Audit Admin', 'FORGED', 'System', 'forged audit record')$$,
  '42501',
  null,
  'a workspace administrator cannot insert a fabricated audit row'
);

select throws_ok(
  $$update public.audit_logs set details = 'rewritten'$$,
  '42501',
  null,
  'a workspace administrator cannot rewrite audit rows'
);

select throws_ok(
  $$delete from public.audit_logs$$,
  '42501',
  null,
  'a workspace administrator cannot delete audit rows'
);

select lives_ok(
  $$insert into public.calls (id, workspace_id, agent_id, outcome)
    values ('91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa41', '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '91111111-1111-4111-8111-111111111111', 'completed')$$,
  'the normal member call insert still succeeds without a direct audit grant'
);

reset role;

select is(
  (select count(*)::integer from public.audit_logs
   where workspace_id = '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
     and action = 'CALL_COMPLETED'
     and actor_id = '91111111-1111-4111-8111-111111111111'
     and actor_name = 'Audit Admin'),
  1,
  'the call trigger writes an audit row attributed to the authenticated actor'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"91111111-1111-4111-8111-111111111111"}', true);

select lives_ok(
  $$select public.update_lead_status_with_audit(
    '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21',
    'contacted'
  )$$,
  'the lead status RPC still commits its paired audit row'
);

reset role;

select is(
  (select status from public.leads where id = '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21'),
  'contacted',
  'the lead status change is persisted'
);

select is(
  (select count(*)::integer from public.audit_logs
   where workspace_id = '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
     and action = 'LEAD_UPDATE'
     and actor_id = '91111111-1111-4111-8111-111111111111'),
  1,
  'the lead RPC audit row is attributed to the authenticated actor'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"91111111-1111-4111-8111-111111111111"}', true);

select throws_ok(
  $$select public.update_lead_status_with_audit(
    '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
    '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa22',
    'contacted'
  )$$,
  'P0001',
  'User is not authorized for the active workspace',
  'the definer lead RPC keeps cross-workspace isolation'
);

select lives_ok(
  $$select public.update_order_status_with_history(
    '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31',
    'in_progress',
    'test note'
  )$$,
  'the order status RPC still commits its paired audit row'
);

reset role;

select is(
  (select status from public.orders where id = '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31'),
  'in_progress',
  'the order status change is persisted'
);

select is(
  (select count(*)::integer from public.audit_logs
   where workspace_id = '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
     and action = 'ORDER_STATUS_CHANGED'
     and actor_id = '91111111-1111-4111-8111-111111111111'),
  1,
  'the order status audit row is attributed to the authenticated actor'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"91111111-1111-4111-8111-111111111111"}', true);

select throws_ok(
  $$select public.update_order_status_with_history(
    '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa34',
    'in_progress',
    null
  )$$,
  'P0001',
  'Order is not available for status updates',
  'the definer order RPC keeps cross-workspace isolation'
);

select lives_ok(
  $$select public.update_order_with_items(
    '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa32',
    1,
    '[{"product_id":"91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11","quantity":2,"unit_price":50}]'::jsonb,
    'manual',
    null,
    'test edit'
  )$$,
  'the order detail RPC still commits its paired audit row'
);

reset role;

select is(
  (select total_amount from public.orders where id = '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa32'),
  100.00::numeric,
  'the order total is recalculated from the edited items'
);

select is(
  (select count(*)::integer from public.order_items where order_id = '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa32'),
  1,
  'the edited order contains exactly one item'
);

select is(
  (select count(*)::integer from public.audit_logs
   where workspace_id = '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
     and action = 'ORDER_DETAILS_UPDATED'
     and actor_id = '91111111-1111-4111-8111-111111111111'),
  1,
  'the order detail audit row is attributed to the authenticated actor'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"91111111-1111-4111-8111-111111111111"}', true);

select is(
  (select cardinality(moved_order_ids) from public.reassign_orders_product_with_audit(
    '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12',
    '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa13'
  )),
  1,
  'the product reassignment RPC moves the matching order'
);

reset role;

select is(
  (select product_id from public.orders where id = '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa33'),
  '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa13'::uuid,
  'the reassigned order points at the target product'
);

select is(
  (select count(*)::integer from public.audit_logs
   where workspace_id = '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
     and action = 'ORDER_PRODUCT_REASSIGNED'
     and actor_id = '91111111-1111-4111-8111-111111111111'),
  1,
  'the reassignment audit row is attributed to the authenticated actor'
);

create function pg_temp.fail_audit() returns trigger language plpgsql as $$
begin
  raise exception 'forced audit failure';
end $$;

create trigger fail_audit before insert on public.audit_logs
  for each row execute function pg_temp.fail_audit();

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"91111111-1111-4111-8111-111111111111"}', true);

select throws_ok(
  $$select public.update_lead_status_with_audit(
    '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21',
    'customer'
  )$$,
  'P0001',
  'forced audit failure',
  'an audit write failure aborts the business change'
);

reset role;

select is(
  (select status from public.leads where id = '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21'),
  'contacted',
  'the failed audit leaves the lead status unchanged'
);

select is(
  (select count(*)::integer from public.audit_logs
   where workspace_id = '91aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
     and action = 'LEAD_UPDATE'),
  1,
  'the failed audit does not leave a partial audit row'
);

select * from finish();

rollback;
