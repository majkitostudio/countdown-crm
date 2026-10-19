-- ============================================================================
-- Vykonnostni sonda pro dotazy Exception Queue (Faze 5, krok 4).
--
-- Ucel: overit na syntetickem objemu dat, ze dotazy postavene ve Fazi 3 maji
-- odpovidajici index a zvladaji provozni objem. Nemeni schemu, jen docasne
-- plni izolovany workspace a meri plan.
--
-- Spusteni (lokalni Docker databaze):
--   docker cp scripts/measure-exception-queue-performance.sql supabase_db_countdown-crm:/tmp/perf.sql
--   docker exec supabase_db_countdown-crm psql -U postgres -d postgres -f /tmp/perf.sql
--
-- Data jsou izolovana ve workspace 'perf-probe' a pred kazdym behem se znovu
-- vytvori, takze sonda je opakovatelna a nemicha se s demo seedem.
-- ============================================================================

\set ON_ERROR_STOP on

-- 1. Izolovany synth workspace ---------------------------------------------
begin;

insert into public.organizations (id, name, slug)
values ('feedface-0000-4000-8000-000000000000', 'Perf Probe Org', 'perf-probe-org')
on conflict (id) do nothing;

insert into public.workspaces (id, organization_id, name, slug)
values ('feedface-0000-4000-8000-000000000001', 'feedface-0000-4000-8000-000000000000', 'Perf Probe', 'perf-probe')
on conflict (id) do nothing;

-- Operator pro polozky fronty (assigned_operator_id ma FK na profiles a na
-- jednoho operatora smi byt jen jedna aktivni polozka fronty).
insert into auth.users (id, email, aud, role)
select
  ('feedface-0000-4000-8000-2' || lpad(i::text, 11, '0'))::uuid,
  'perf-probe-operator-' || i || '@example.test',
  'authenticated',
  'authenticated'
from generate_series(1, 500) as i
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name, role, status)
select
  ('feedface-0000-4000-8000-2' || lpad(i::text, 11, '0'))::uuid,
  'perf-probe-operator-' || i || '@example.test',
  'Perf Probe Operator ' || i,
  'operator',
  'ready'
from generate_series(1, 500) as i
on conflict (id) do nothing;

-- Opakovatelnost: predchozi beh se nejdriv uklidi.
delete from public.lead_queue_items where workspace_id = 'feedface-0000-4000-8000-000000000001';
delete from public.orders where workspace_id = 'feedface-0000-4000-8000-000000000001';
delete from public.leads where workspace_id = 'feedface-0000-4000-8000-000000000001';

-- 2. Synteticky objem ------------------------------------------------------
-- Vypneme uzivatelske triggery (audit, orchestrace fronty) - merime dotaz nad
-- hotovymi daty, ne zapis. Referencni integritu drzime rucne.
set local session_replication_role = replica;

insert into public.leads (id, workspace_id, full_name, phone)
select
  ('feedface-0000-4000-8000-0' || lpad(i::text, 11, '0'))::uuid,
  'feedface-0000-4000-8000-000000000001',
  'Perf Lead ' || i,
  '+420700' || lpad(i::text, 6, '0')
from generate_series(1, 200000) as i;

-- 300 000 objednavek: 60 % delivered, 25 % returned, 10 % sent, 5 % pending.
-- Z "sent" casti je vetsina jiz na vydejne a obvolana; jen zlomek zustava
-- neobvolany (pickup risk), coz odpovida provozu.
insert into public.orders (
  id, workspace_id, lead_id, status, total_amount, created_at,
  package_location, package_arrived_at, pickup_call_completed_at
)
select
  ('feedface-0000-4000-8000-1' || lpad(i::text, 11, '0'))::uuid,
  'feedface-0000-4000-8000-000000000001',
  ('feedface-0000-4000-8000-0' || lpad(((i % 200000) + 1)::text, 11, '0'))::uuid,
  case
    when i % 100 < 60 then 'delivered'
    when i % 100 < 85 then 'returned'
    when i % 100 < 95 then 'sent'
    else 'pending'
  end,
  (1000 + (i % 4000))::numeric,
  now() - ((i % 400000) || ' seconds')::interval,
  case when i % 100 >= 85 and i % 100 < 95 and i % 3 <> 0 then 'Prague ' || (i % 40) else null end,
  case when i % 100 >= 85 and i % 100 < 95 and i % 3 <> 0 then now() - ((i % 20) || ' days')::interval else null end,
  case when i % 100 >= 85 and i % 100 < 95 and i % 3 <> 0 and i % 97 <> 0 then now() else null end
from generate_series(1, 300000) as i;

-- 200 000 polozek fronty. Kazdy z 500 operatoru ma nejvyse jednu aktivni
-- polozku (assigned/awaiting_outcome); zbytek je scheduled/closed.
-- assigned/awaiting_outcome vyzaduji operatora, ostatni stavy naopak NULL.
insert into public.lead_queue_items (workspace_id, lead_id, assigned_operator_id, state, updated_at)
select
  'feedface-0000-4000-8000-000000000001',
  ('feedface-0000-4000-8000-0' || lpad(i::text, 11, '0'))::uuid,
  case when i <= 500 then ('feedface-0000-4000-8000-2' || lpad(i::text, 11, '0'))::uuid else null end,
  case
    when i <= 500 then 'assigned'
    when i % 2 = 0 then 'scheduled'
    else 'closed'
  end,
  now() - ((i % 100000) || ' seconds')::interval
from generate_series(1, 200000) as i;

commit;

analyze public.orders;
analyze public.leads;
analyze public.lead_queue_items;

\echo ''
\echo '=== objem dat ==='
select 'orders' as tabulka, count(*) from public.orders
union all select 'leads', count(*) from public.leads
union all select 'lead_queue_items', count(*) from public.lead_queue_items;

\echo ''
\echo '=== Q1: pickup risk (s indexem orders_workspace_status_package_arrived_idx) ==='
explain (analyze, buffers, format text)
select o.id, o.lead_id, o.status, o.package_arrived_at, l.full_name
from public.orders o
left join public.leads l on l.id = o.lead_id
where o.workspace_id = 'feedface-0000-4000-8000-000000000001'
  and o.status = 'sent'
  and o.package_location is not null
  and o.package_arrived_at is not null
  and o.pickup_call_completed_at is null
order by o.package_arrived_at asc;

\echo ''
\echo '=== Q1: pickup risk (index vypnuty, pro srovnani) ==='
begin;
set local enable_indexscan = off;
set local enable_bitmapscan = off;
explain (analyze, buffers, format text)
select o.id, o.lead_id, o.status, o.package_arrived_at, l.full_name
from public.orders o
left join public.leads l on l.id = o.lead_id
where o.workspace_id = 'feedface-0000-4000-8000-000000000001'
  and o.status = 'sent'
  and o.package_location is not null
  and o.package_arrived_at is not null
  and o.pickup_call_completed_at is null
order by o.package_arrived_at asc;
rollback;

\echo ''
\echo '=== Q2: Exception Queue (fronta) ==='
explain (analyze, buffers, format text)
select q.id, q.lead_id, q.state, q.updated_at, l.full_name
from public.lead_queue_items q
left join public.leads l on l.id = q.lead_id
where q.workspace_id = 'feedface-0000-4000-8000-000000000001'
  and q.state in ('assigned', 'awaiting_outcome', 'scheduled')
order by q.updated_at desc;

\echo ''
\echo '=== Q2: Exception Queue (index vypnuty, pro srovnani) ==='
begin;
set local enable_indexscan = off;
set local enable_bitmapscan = off;
explain (analyze, buffers, format text)
select q.id, q.lead_id, q.state, q.updated_at, l.full_name
from public.lead_queue_items q
left join public.leads l on l.id = q.lead_id
where q.workspace_id = 'feedface-0000-4000-8000-000000000001'
  and q.state in ('assigned', 'awaiting_outcome', 'scheduled')
order by q.updated_at desc;
rollback;
