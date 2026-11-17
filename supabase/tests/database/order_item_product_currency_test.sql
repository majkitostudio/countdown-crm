begin;

select plan(4);

insert into auth.users (id, email, aud, role, raw_user_meta_data)
values ('f0100000-0000-4000-8000-000000000001', 'item-currency-admin@example.test', 'authenticated', 'authenticated', '{"full_name":"Currency Test Admin"}'::jsonb);

insert into public.organizations (id, name, slug)
values ('f0100000-0000-4000-8000-000000000002', 'Item currency test organization', 'item-currency-test-org');

insert into public.workspaces (id, organization_id, name, slug)
values ('f0100000-0000-4000-8000-000000000003', 'f0100000-0000-4000-8000-000000000002', 'Item currency test workspace', 'item-currency-test-workspace');

insert into public.workspace_members (workspace_id, user_id, role)
values ('f0100000-0000-4000-8000-000000000003', 'f0100000-0000-4000-8000-000000000001', 'administrator');

-- Identical titles and prices isolate currency as the only relevant difference.
insert into public.products (id, workspace_id, title, category, price, currency)
values
  ('f0100000-0000-4000-8000-000000000004', 'f0100000-0000-4000-8000-000000000003', 'Test product', 'Test', 100, 'CZK'),
  ('f0100000-0000-4000-8000-000000000005', 'f0100000-0000-4000-8000-000000000003', 'Test product', 'Test', 100, 'EUR'),
  ('f0100000-0000-4000-8000-000000000006', 'f0100000-0000-4000-8000-000000000003', 'Test product', 'Test', 100, 'CZK');

insert into public.orders (id, workspace_id, total_amount, currency)
values ('f0100000-0000-4000-8000-000000000007', 'f0100000-0000-4000-8000-000000000003', 100, 'CZK');

-- Only the fixture setup uses the internal flag; all assertions run with it off.
select set_config('countdown.order_edit_rpc', 'on', true);
insert into public.order_items (id, workspace_id, order_id, product_id, product_title_snapshot, unit_price, minimum_unit_price, quantity, line_total, currency)
values ('f0100000-0000-4000-8000-000000000008', 'f0100000-0000-4000-8000-000000000003', 'f0100000-0000-4000-8000-000000000007', 'f0100000-0000-4000-8000-000000000004', 'Test product', 100, 100, 1, 100, 'CZK');
select set_config('countdown.order_edit_rpc', 'off', true);

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"f0100000-0000-4000-8000-000000000001"}', true);

select throws_ok(
  $$update public.order_items
    set product_id = 'f0100000-0000-4000-8000-000000000005'
    where id = 'f0100000-0000-4000-8000-000000000008'$$,
  'P0001',
  'All order items must use the order currency',
  'an administrator cannot switch an item to a product in another currency'
);

select is(
  (select product_id from public.order_items where id = 'f0100000-0000-4000-8000-000000000008'),
  'f0100000-0000-4000-8000-000000000004'::uuid,
  'the rejected update leaves the original product in place'
);

select lives_ok(
  $$update public.order_items
    set product_id = 'f0100000-0000-4000-8000-000000000006'
    where id = 'f0100000-0000-4000-8000-000000000008'$$,
  'an administrator can switch an item to a product in the same currency'
);

select is(
  (select product_id from public.order_items where id = 'f0100000-0000-4000-8000-000000000008'),
  'f0100000-0000-4000-8000-000000000006'::uuid,
  'the matching-currency update actually changed the product'
);

select * from finish();

rollback;
