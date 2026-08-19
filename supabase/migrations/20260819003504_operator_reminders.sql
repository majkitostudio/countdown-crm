-- Personal operator reminders are separate from the call queue. They may be
-- linked to a lead, but they do not create or change a callback assignment.
CREATE TABLE IF NOT EXISTS public.operator_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
  note TEXT CHECK (note IS NULL OR char_length(note) <= 2000),
  due_at TIMESTAMPTZ NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (remind_at <= due_at),
  CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status IN ('open', 'cancelled') AND completed_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS operator_reminders_owner_due_idx
  ON public.operator_reminders (workspace_id, owner_id, status, due_at);

CREATE INDEX IF NOT EXISTS operator_reminders_workspace_due_idx
  ON public.operator_reminders (workspace_id, due_at);

ALTER TABLE public.operator_reminders ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.operator_reminders FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.operator_reminders TO authenticated;

CREATE POLICY "Operators can view own reminders and managers can view workspace reminders"
  ON public.operator_reminders
  FOR SELECT TO authenticated
  USING (
    private.is_workspace_manager_or_admin(workspace_id)
    OR (
      owner_id = (SELECT auth.uid())
      AND private.is_workspace_member(workspace_id)
    )
  );

CREATE POLICY "Operators can create own reminders"
  ON public.operator_reminders
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND status = 'open'
    AND completed_at IS NULL
    AND private.is_workspace_member(workspace_id)
    AND (
      lead_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.leads AS lead
        WHERE lead.id = operator_reminders.lead_id
          AND lead.workspace_id = operator_reminders.workspace_id
      )
    )
  );

CREATE POLICY "Owners and managers can update reminders"
  ON public.operator_reminders
  FOR UPDATE TO authenticated
  USING (
    private.is_workspace_manager_or_admin(workspace_id)
    OR (
      owner_id = (SELECT auth.uid())
      AND private.is_workspace_member(workspace_id)
    )
  )
  WITH CHECK (
    private.is_workspace_manager_or_admin(workspace_id)
    OR (
      owner_id = (SELECT auth.uid())
      AND private.is_workspace_member(workspace_id)
    )
  );

DROP TRIGGER IF EXISTS operator_reminders_workspace_immutable ON public.operator_reminders;
CREATE TRIGGER operator_reminders_workspace_immutable
  BEFORE UPDATE OF workspace_id ON public.operator_reminders
  FOR EACH ROW EXECUTE FUNCTION private.prevent_workspace_change();
