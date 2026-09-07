with rpc_names(name) as (
  values
    ('add_wallet_bonus_rule'::text),
    ('add_wallet_manual_adjustment'::text),
    ('complete_call_with_order_items_idempotent'::text),
    ('complete_lead_call_with_order_items_idempotent'::text),
    ('update_wallet_settings'::text)
),
public_rpc as (
  select procedure.oid, procedure.proname, procedure.prosecdef, procedure.proconfig, procedure.proacl
  from pg_proc as procedure
  join pg_namespace as namespace on namespace.oid = procedure.pronamespace
  join rpc_names on rpc_names.name = procedure.proname
  where namespace.nspname = 'public'
),
private_rpc as (
  select procedure.oid, procedure.proname, procedure.prosecdef, procedure.proconfig, procedure.proacl
  from pg_proc as procedure
  join pg_namespace as namespace on namespace.oid = procedure.pronamespace
  join rpc_names on rpc_names.name = procedure.proname
  where namespace.nspname = 'private'
),
public_grants as (
  select
    count(*) filter (where has_function_privilege('authenticated', public_rpc.oid, 'EXECUTE')) = 5
      and count(*) filter (where has_function_privilege('anon', public_rpc.oid, 'EXECUTE')) = 0
      and count(*) filter (where public_rpc.proacl is not null and exists (
        select 1
        from aclexplode(public_rpc.proacl) as privilege
        where privilege.grantee = 0
          and privilege.privilege_type = 'EXECUTE'
      )) = 0 as is_valid
  from public_rpc
),
private_grants as (
  select
    count(*) filter (where has_function_privilege('authenticated', private_rpc.oid, 'EXECUTE')) = 5
      and count(*) filter (where has_function_privilege('anon', private_rpc.oid, 'EXECUTE')) = 0
      and count(*) filter (where private_rpc.proacl is not null and exists (
        select 1
        from aclexplode(private_rpc.proacl) as privilege
        where privilege.grantee = 0
          and privilege.privilege_type = 'EXECUTE'
      )) = 0 as is_valid
  from private_rpc
)
select jsonb_build_object(
  'public_rpc_boundaries', (select count(*) from public_rpc) = 5
    and (select count(*) from public_rpc where not prosecdef) = 5,
  'public_rpc_grants', (select is_valid from public_grants),
  'public_rpc_search_path', (select count(*) from public_rpc where proconfig @> array['search_path=""']::text[]) = 5,
  'private_rpc_implementations', (select count(*) from private_rpc) = 5
    and (select count(*) from private_rpc where prosecdef) = 5,
  'private_rpc_grants', (select is_valid from private_grants),
  'private_rpc_search_path', (select count(*) from private_rpc where proconfig @> array['search_path=""']::text[]) = 5,
  'pgtap_not_public', not exists (
    select 1
    from pg_extension as extension
    join pg_namespace as namespace on namespace.oid = extension.extnamespace
    where extension.extname = 'pgtap'
      and namespace.nspname = 'public'
  ),
  'private_schema_not_exposed', not (
    'private' = any(string_to_array(
      regexp_replace(coalesce(current_setting('pgrst.db_schemas', true), ''), '\s+', '', 'g'),
      ','
    ))
  )
) as evidence
