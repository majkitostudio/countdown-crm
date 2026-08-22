-- Allow operators to create orders only for their current queue assignment.
-- Managers and administrators retain workspace-scoped order creation.

create or replace function private.can_create_order_for_lead(
  target_workspace_id uuid,
  target_lead_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members as member
    join public.leads as lead
      on lead.id = target_lead_id
     and lead.workspace_id = target_workspace_id
    where member.workspace_id = target_workspace_id
      and member.user_id = (select auth.uid())
      and (
        member.role in ('team_leader', 'administrator')
        or exists (
          select 1
          from public.lead_queue_items as queue_item
          where queue_item.workspace_id = target_workspace_id
            and queue_item.lead_id = target_lead_id
            and queue_item.assigned_operator_id = (select auth.uid())
            and queue_item.state in ('assigned', 'in_progress')
        )
      )
  );
$$;

revoke all on function private.can_create_order_for_lead(uuid, uuid) from public, anon;
grant execute on function private.can_create_order_for_lead(uuid, uuid) to authenticated;

drop policy if exists "Workspace members can create orders" on public.orders;
create policy "Workspace members can create orders"
  on public.orders
  for insert
  to authenticated
  with check (
    workspace_id is not null
    and private.can_create_order_for_lead(workspace_id, lead_id)
    and (product_id is null or exists (
      select 1
      from public.products as product
      where product.id = orders.product_id
        and product.workspace_id = orders.workspace_id
    ))
  );
