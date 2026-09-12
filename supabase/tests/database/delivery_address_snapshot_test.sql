begin;

select plan(5);

select ok(
  to_regclass('public.orders') is not null,
  'orders table exists'
);

select has_column(
  'public',
  'orders',
  'delivery_address_snapshot',
  'orders store a delivery-address snapshot'
);

insert into public.organizations (id, name, slug)
values ('d1aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Delivery address test organization', 'delivery-address-test-org');

insert into public.workspaces (id, organization_id, name, slug)
values ('d1aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'd1aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Delivery address test workspace', 'delivery-address-test-workspace');

select lives_ok(
  $$insert into public.orders (workspace_id, total_amount, delivery_address_snapshot)
    values (
      'd1aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
      1,
      null
    )$$,
  'legacy orders may omit a delivery-address snapshot'
);

select lives_ok(
  $$insert into public.orders (workspace_id, total_amount, delivery_address_snapshot)
    values (
      'd1aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
      1,
      '{"recipient_name":"Jane Doe","line1":"Main 1","city":"Prague","postal_code":"110 00","country":"CZ"}'::jsonb
    )$$,
  'a complete delivery-address object is accepted'
);

select throws_ok(
  $$insert into public.orders (workspace_id, total_amount, delivery_address_snapshot)
    values (
      'd1aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
      1,
      '"not an address"'::jsonb
    )$$,
  '23514',
  null,
  'a delivery-address snapshot must be an object with all required fields'
);

select * from finish();

rollback;
