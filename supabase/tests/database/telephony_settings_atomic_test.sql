begin;
select plan(22);

select ok(not has_table_privilege('authenticated', 'public.workspace_telephony_settings', 'INSERT')
  and not has_table_privilege('authenticated', 'public.workspace_telephony_settings', 'UPDATE'),
  'authenticated cannot write settings directly');
select ok(has_table_privilege('service_role', 'public.workspace_telephony_settings', 'SELECT,INSERT,UPDATE'),
  'service role retains its settings grants');
select ok(not has_function_privilege('anon', 'public.update_telephony_adapter_with_audit(uuid,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.update_telephony_adapter_with_audit(uuid,text)', 'EXECUTE')
  and not has_function_privilege('service_role', 'public.update_telephony_adapter_with_audit(uuid,text)', 'EXECUTE'),
  'RPC execution is limited to authenticated users');

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('71111111-1111-4111-8111-111111111111', 'telephony-admin@example.test', 'authenticated', 'authenticated', '{"full_name":"Telephony Admin"}'),
  ('72222222-2222-4222-8222-222222222222', 'telephony-operator@example.test', 'authenticated', 'authenticated', '{"full_name":"Telephony Operator"}');
insert into public.organizations (id, name, slug) values
  ('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Telephony Org', 'telephony-atomic-org');
insert into public.workspaces (id, organization_id, name, slug) values
  ('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A', 'telephony-atomic-a'),
  ('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02', '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'B', 'telephony-atomic-b'),
  ('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03', '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'C', 'telephony-atomic-c');
insert into public.workspace_members (workspace_id, user_id, role) values
  ('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '71111111-1111-4111-8111-111111111111', 'administrator'),
  ('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', '72222222-2222-4222-8222-222222222222', 'operator'),
  ('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03', '71111111-1111-4111-8111-111111111111', 'administrator');

-- The RPC must work even when the calling role cannot insert audit rows.
revoke insert on public.audit_logs from authenticated;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"71111111-1111-4111-8111-111111111111"}', true);
select lives_ok($$select public.update_telephony_adapter_with_audit('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'local_sip')$$,
  'administrator writes without direct audit insert privilege');
select throws_ok($$insert into public.workspace_telephony_settings (workspace_id) values ('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02')$$,
  '42501', null, 'direct settings insert is denied');
select throws_ok($$update public.workspace_telephony_settings set active_adapter = 'telnyx'$$,
  '42501', null, 'direct settings update is denied');
select throws_ok($$select public.update_telephony_adapter_with_audit('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02', 'local_sip')$$,
  'P0001', 'User is not authorized for the workspace', 'administrator cannot mutate another workspace');
select throws_ok($$select public.update_telephony_adapter_with_audit('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'telnyx')$$,
  'P0001', 'Telnyx activation is blocked', 'Telnyx is blocked in SQL');
select throws_ok($$select public.update_telephony_adapter_with_audit('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'simulation')$$,
  'P0001', 'Unsupported telephony adapter', 'simulation cannot be selected');
select throws_ok($$select public.update_telephony_adapter_with_audit('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', null)$$,
  'P0001', 'Unsupported telephony adapter', 'null adapter is rejected');
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"72222222-2222-4222-8222-222222222222"}', true);
select throws_ok($$select public.update_telephony_adapter_with_audit('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'local_sip')$$,
  'P0001', 'User is not authorized for the workspace', 'operator is denied');
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select throws_ok($$select public.update_telephony_adapter_with_audit('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'local_sip')$$,
  'P0001', 'Authentication is required', 'missing identity is denied');
reset role;
select is((select updated_by::text from public.workspace_telephony_settings where workspace_id = '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'),
  '71111111-1111-4111-8111-111111111111', 'updated_by derives from identity');
select is((select count(*)::integer from public.audit_logs where workspace_id = '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
  and actor_id = '71111111-1111-4111-8111-111111111111' and actor_name = 'Telephony Admin'
  and action = 'SETTINGS_CHANGE' and details = 'Telephony adapter changed to local_sip.'), 1, 'audit is attributed to authenticated actor');
select is((select count(*)::integer from public.audit_logs where workspace_id = '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
  and action = 'SETTINGS_CHANGE' and ip_address is null), 1, 'unknown IP is stored as null instead of the column default');
select is((select count(*)::integer from public.workspace_telephony_settings where workspace_id = '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02'), 0,
  'other workspace remains unchanged');

create function pg_temp.fail_telephony_audit() returns trigger language plpgsql as $$
begin raise exception 'forced audit failure'; end $$;
update public.workspace_telephony_settings set updated_at = '2000-01-01 00:00:00+00'
  where workspace_id = '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01';
create trigger fail_telephony_audit before insert on public.audit_logs
  for each row execute function pg_temp.fail_telephony_audit();
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"71111111-1111-4111-8111-111111111111"}', true);
select throws_ok($$select public.update_telephony_adapter_with_audit('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'local_sip')$$,
  'P0001', 'forced audit failure', 'audit error aborts update');
select throws_ok($$select public.update_telephony_adapter_with_audit('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03', 'local_sip')$$,
  'P0001', 'forced audit failure', 'audit error aborts initial insert');
select throws_ok($$select public.update_telephony_adapter_with_audit('7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'unknown')$$,
  'P0001', 'Unsupported telephony adapter', 'unknown adapter is rejected');
reset role;
select is((select count(*)::integer from public.audit_logs where workspace_id = '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'), 1,
  'failed update leaves no extra audit');
select is((select count(*)::integer from public.workspace_telephony_settings where workspace_id = '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
  and active_adapter = 'local_sip' and updated_by = '71111111-1111-4111-8111-111111111111'
  and updated_at = '2000-01-01 00:00:00+00'), 1,
  'failed update leaves settings intact');
select is((select count(*)::integer from public.workspace_telephony_settings where workspace_id = '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03'), 0,
  'failed audit rolls back initial insert');
select * from finish();
rollback;
