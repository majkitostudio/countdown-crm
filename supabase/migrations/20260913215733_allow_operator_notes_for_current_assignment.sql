create or replace function private.can_create_lead_note_for_lead(
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
        private.is_workspace_manager_or_admin(target_workspace_id)
        or (
          member.role = 'operator'
          and exists (
          select 1
          FROM public.lead_queue_items AS queue_item
          where queue_item.workspace_id = target_workspace_id
            and queue_item.lead_id = target_lead_id
            AND queue_item.assigned_operator_id = (SELECT auth.uid())
            AND queue_item.state IN ('assigned', 'in_progress', 'awaiting_outcome')
          )
        )
      )
  );
$$;

revoke all on function private.can_create_lead_note_for_lead(uuid, uuid) from public, anon;
grant execute on function private.can_create_lead_note_for_lead(uuid, uuid) to authenticated;

DROP POLICY IF EXISTS "Workspace members can create lead notes" ON public.lead_notes;

create policy "Workspace members can create lead notes"
  on public.lead_notes
  for insert
  to authenticated
  with check (
    workspace_id is not null
    and author_id = (select auth.uid())
    and private.can_create_lead_note_for_lead(workspace_id, lead_id)
  );
