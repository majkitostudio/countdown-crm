-- Browser push delivery for personal operator reminders.
-- The browser subscription is user/workspace scoped; the cron worker uses a
-- server-only client to deliver due reminders and never exposes this data to
-- the public client.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL CHECK (char_length(endpoint) BETWEEN 1 AND 2048),
  p256dh TEXT NOT NULL CHECK (char_length(p256dh) BETWEEN 1 AND 512),
  auth TEXT NOT NULL CHECK (char_length(auth) BETWEEN 1 AND 512),
  user_agent TEXT CHECK (user_agent IS NULL OR char_length(user_agent) <= 512),
  disabled_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_owner_idx
  ON public.push_subscriptions (workspace_id, user_id, disabled_at);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.push_subscriptions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.push_subscriptions TO authenticated;

CREATE POLICY "Users can view own push subscriptions"
  ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  );

CREATE POLICY "Users can create own push subscriptions"
  ON public.push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  );

CREATE POLICY "Users can update own push subscriptions"
  ON public.push_subscriptions
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  );

CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.is_workspace_member(workspace_id)
  );

ALTER TABLE public.operator_reminders
  ADD COLUMN IF NOT EXISTS push_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (push_status IN ('pending', 'sending', 'sent', 'skipped', 'failed')),
  ADD COLUMN IF NOT EXISTS push_attempts INTEGER NOT NULL DEFAULT 0
    CHECK (push_attempts >= 0),
  ADD COLUMN IF NOT EXISTS push_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS push_last_error TEXT;

CREATE INDEX IF NOT EXISTS operator_reminders_push_due_idx
  ON public.operator_reminders (push_status, remind_at)
  WHERE status = 'open';
