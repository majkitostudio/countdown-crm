-- ========================================================
-- Countdown CRM — historical Supabase schema snapshot
--
-- This file is retained for reference and inspection only. It is not a
-- provisioning script and must not be used as a fresh-database source of
-- truth. The ordered files in supabase/migrations/ are authoritative for
-- deployed environments. Before any deployment, verify their provenance and
-- apply only through the approved Supabase migration workflow.
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'operator', -- 'administrator', 'team_leader', 'operator'
  status TEXT NOT NULL DEFAULT 'ready', -- 'ready', 'in_call', 'break'
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ORGANIZATIONS, WORKSPACES & MEMBERSHIPS
-- MVP uses one organization/workspace, but the model is multi-tenant ready.
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

INSERT INTO public.organizations (name, slug)
VALUES ('Countdown CRM', 'countdown')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.workspaces (organization_id, name, slug)
SELECT id, 'Main workspace', 'main'
FROM public.organizations
WHERE slug = 'countdown'
ON CONFLICT (organization_id, slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('administrator', 'team_leader', 'operator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS workspaces_organization_id_idx
  ON public.workspaces(organization_id);

CREATE INDEX IF NOT EXISTS workspace_members_user_id_idx
  ON public.workspace_members(user_id);

-- 3. LEADS TABLE (Customer directory)
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT,
  company TEXT,
  country TEXT DEFAULT 'CZ',
  status TEXT NOT NULL DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'customer', 'unresponsive'
  ai_score INT DEFAULT 50 CHECK (ai_score BETWEEN 0 AND 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3b. LEAD NOTES TABLE (Persisted operator timeline notes)
CREATE TABLE IF NOT EXISTS public.lead_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lead_notes_workspace_lead_created_idx
  ON public.lead_notes (workspace_id, lead_id, created_at DESC);

-- 3c. PERSONAL OPERATOR REMINDERS
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
CREATE INDEX IF NOT EXISTS operator_reminders_owner_id_idx
  ON public.operator_reminders (owner_id);
CREATE INDEX IF NOT EXISTS operator_reminders_lead_id_idx
  ON public.operator_reminders (lead_id);

-- 3d. SERVER-CONTROLLED LEAD QUEUE
-- Operators receive one routed assignment; they do not browse this pool.
CREATE TABLE IF NOT EXISTS public.operator_presence (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'offline'
    CHECK (state IN ('offline', 'available', 'break', 'in_call', 'after_call')),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, operator_id)
);

CREATE TABLE IF NOT EXISTS public.lead_queue_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  preferred_operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  state TEXT NOT NULL DEFAULT 'available'
    CHECK (state IN ('available', 'assigned', 'in_progress', 'waiting_callback', 'closed', 'paused')),
  priority INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  claimed_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,
  lease_expires_at TIMESTAMPTZ,
  last_outcome TEXT,
  released_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, lead_id),
  CHECK (
    (state IN ('assigned', 'in_progress') AND assigned_operator_id IS NOT NULL)
    OR (state IN ('available', 'waiting_callback', 'closed', 'paused') AND assigned_operator_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.lead_queue_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  queue_item_id UUID NOT NULL REFERENCES public.lead_queue_items(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'claimed', 'started', 'heartbeat', 'completed', 'released',
    'reassigned', 'callback_scheduled', 'requeued', 'lease_expired',
    'reopened', 'paused'
  )),
  from_state TEXT,
  to_state TEXT NOT NULL,
  from_operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  to_operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS lead_queue_one_current_per_operator_idx
  ON public.lead_queue_items (workspace_id, assigned_operator_id)
  WHERE state IN ('assigned', 'in_progress');
CREATE INDEX IF NOT EXISTS lead_queue_routing_idx
  ON public.lead_queue_items (workspace_id, state, available_at, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS lead_queue_preferred_operator_idx
  ON public.lead_queue_items (workspace_id, preferred_operator_id, state, available_at);
CREATE INDEX IF NOT EXISTS lead_queue_events_item_created_idx
  ON public.lead_queue_events (queue_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_queue_events_workspace_created_idx
  ON public.lead_queue_events (workspace_id, created_at DESC);

-- 4. PRODUCTS TABLE (Catalog)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- 'supplements', 'cosmetics', 'electronics'
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  image_url TEXT,
  in_stock BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CALLS TABLE (Call center logs)
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  duration_seconds INT NOT NULL DEFAULT 0,
  outcome TEXT NOT NULL DEFAULT 'completed', -- 'order_placed', 'followup_scheduled', 'objection', 'no_answer', 'completed'
  transcript TEXT,
  ai_sentiment TEXT DEFAULT 'Neutral',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5a. TELNYX TELEPHONY FOUNDATION
CREATE TABLE IF NOT EXISTS public.telephony_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider = 'telnyx'),
  provider_credential_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, operator_id, provider)
);

CREATE TABLE IF NOT EXISTS public.telephony_call_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  queue_item_id UUID REFERENCES public.lead_queue_items(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider = 'telnyx'),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  telnyx_call_control_id TEXT,
  telnyx_call_leg_id TEXT,
  telnyx_call_session_id TEXT,
  telnyx_connection_id TEXT,
  from_number TEXT,
  to_number TEXT,
  status TEXT NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated', 'ringing', 'connected', 'held', 'ended', 'failed')),
  started_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  recording_id TEXT,
  recording_url TEXT,
  hangup_cause TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.telephony_call_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  call_session_id UUID REFERENCES public.telephony_call_sessions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider = 'telnyx'),
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider_call_control_id TEXT,
  provider_call_leg_id TEXT,
  provider_call_session_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_event_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS telephony_sessions_telnyx_control_id_idx
  ON public.telephony_call_sessions (telnyx_call_control_id)
  WHERE telnyx_call_control_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS telephony_sessions_workspace_created_idx
  ON public.telephony_call_sessions (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS telephony_events_session_created_idx
  ON public.telephony_call_events (call_session_id, created_at DESC);

-- 6. ORDERS TABLE (Sales)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE RESTRICT,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'pending', 'cancelled'
  order_source TEXT NOT NULL DEFAULT 'previous_call',
  source_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. OBJECTIONS TABLE (Sales objection handling database)
CREATE TABLE IF NOT EXISTS public.objections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  objection_title TEXT NOT NULL,
  rebuttal_args TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 8. EAV SCHEMAS (Attio-Grade Dynamic Objects & Attributes)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.custom_objects (
  slug TEXT PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  singular_name TEXT NOT NULL,
  plural_name TEXT NOT NULL,
  icon TEXT DEFAULT 'Layers',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attribute_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  object_slug TEXT REFERENCES public.custom_objects(slug) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  data_type TEXT NOT NULL, -- 'text', 'number', 'select', 'multi_select', 'boolean', 'ai_generated', 'relation'
  options JSONB,
  is_ai BOOLEAN DEFAULT FALSE,
  ai_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(object_slug, slug)
);

CREATE TABLE IF NOT EXISTS public.record_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  object_slug TEXT REFERENCES public.custom_objects(slug) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.record_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  record_id UUID REFERENCES public.record_entities(id) ON DELETE CASCADE,
  attribute_slug TEXT NOT NULL,
  value_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(record_id, attribute_slug)
);

-- ========================================================
-- 9. WORKFLOW ENGINE (Agentic Rules & Executions)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL, -- 'on_call_ended', 'on_lead_status_changed', 'on_order_placed', 'on_lead_created'
  conditions JSONB DEFAULT '[]'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  trigger_event TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'failed'
  execution_time_ms INT DEFAULT 0,
  logs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 10. ENTERPRISE AUDIT LOGS & GAMIFICATION
-- ========================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target_resource TEXT NOT NULL,
  details TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  ip_address TEXT DEFAULT '127.0.0.1'
);

CREATE TABLE IF NOT EXISTS public.user_gamification (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  badges JSONB DEFAULT '[]'::jsonb,
  stats JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- Row Level Security (RLS) Policies
-- ========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telephony_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telephony_call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telephony_call_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_queue_events ENABLE ROW LEVEL SECURITY;

-- Workspace membership helper functions run as a definer to avoid recursive
-- RLS evaluation when policies inspect workspace_members.
CREATE OR REPLACE FUNCTION public.is_workspace_member(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id = target_workspace_id
      AND member.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members AS member
    WHERE member.workspace_id = target_workspace_id
      AND member.user_id = auth.uid()
      AND member.role = 'administrator'
  );
$$;

REVOKE ALL ON FUNCTION public.is_workspace_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_workspace_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(UUID) TO authenticated;

-- Allow authenticated users full access to domain entities
CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Agents can view leads" ON public.leads FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Agents can manage leads" ON public.leads FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Agents can view products" ON public.products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Agents can manage products" ON public.products FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Agents can view calls" ON public.calls FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Agents can insert calls" ON public.calls FOR INSERT WITH CHECK (auth.role() = 'authenticated');

REVOKE ALL ON TABLE public.telephony_credentials, public.telephony_call_sessions, public.telephony_call_events
  FROM anon, authenticated;
GRANT SELECT ON TABLE public.telephony_call_sessions, public.telephony_call_events TO authenticated;
CREATE POLICY "Workspace members can view telephony sessions"
  ON public.telephony_call_sessions FOR SELECT
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace members can view telephony events"
  ON public.telephony_call_events FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Agents can view orders" ON public.orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Agents can insert orders" ON public.orders FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Agents can view objections" ON public.objections FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers can manage objections" ON public.objections FOR ALL USING (auth.role() = 'authenticated');

-- Policies for Custom Objects, EAV, Workflows, Audit
CREATE POLICY "Members can view their organizations" ON public.organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.workspaces AS workspace
      WHERE workspace.organization_id = organizations.id
        AND public.is_workspace_member(workspace.id)
    )
  );

CREATE POLICY "Organization admins can update their organizations" ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspaces AS workspace
      WHERE workspace.organization_id = organizations.id
        AND public.is_workspace_admin(workspace.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workspaces AS workspace
      WHERE workspace.organization_id = organizations.id
        AND public.is_workspace_admin(workspace.id)
    )
  );

CREATE POLICY "Members can view their workspaces" ON public.workspaces
  FOR SELECT USING (public.is_workspace_member(id));

CREATE POLICY "Workspace admins can update their workspaces" ON public.workspaces
  FOR UPDATE
  USING (public.is_workspace_admin(id))
  WITH CHECK (public.is_workspace_admin(id));

CREATE POLICY "Members can view workspace memberships" ON public.workspace_members
  FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace admins can manage memberships" ON public.workspace_members
  FOR ALL
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Authenticated users can view custom_objects" ON public.custom_objects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage custom_objects" ON public.custom_objects FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view attribute_definitions" ON public.attribute_definitions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage attribute_definitions" ON public.attribute_definitions FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view record_entities" ON public.record_entities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Agents can manage record_entities" ON public.record_entities FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view record_values" ON public.record_values FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Agents can manage record_values" ON public.record_values FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view workflows" ON public.workflows FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers can manage workflows" ON public.workflows FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view workflow_executions" ON public.workflow_executions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System can insert workflow_executions" ON public.workflow_executions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view audit_logs" ON public.audit_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System can insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Workspace members can view lead notes" ON public.lead_notes
  FOR SELECT USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));
CREATE POLICY "Workspace members can create lead notes" ON public.lead_notes
  FOR INSERT WITH CHECK (
    workspace_id IS NOT NULL
    AND public.is_workspace_member(workspace_id)
    AND author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.leads AS lead
      WHERE lead.id = lead_notes.lead_id
        AND lead.workspace_id = lead_notes.workspace_id
    )
  );

CREATE POLICY "Operators can view own reminders" ON public.operator_reminders
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()) AND public.is_workspace_member(workspace_id));
CREATE POLICY "Operators can create own reminders" ON public.operator_reminders
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND status = 'open'
    AND completed_at IS NULL
    AND public.is_workspace_member(workspace_id)
    AND (
      lead_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.leads AS lead
        WHERE lead.id = operator_reminders.lead_id
          AND lead.workspace_id = operator_reminders.workspace_id
      )
    )
  );
CREATE POLICY "Operators can update own reminders" ON public.operator_reminders
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()) AND public.is_workspace_member(workspace_id))
  WITH CHECK (owner_id = (SELECT auth.uid()) AND public.is_workspace_member(workspace_id));

GRANT SELECT, INSERT ON TABLE public.lead_notes TO authenticated;

REVOKE ALL ON TABLE public.operator_presence, public.lead_queue_items, public.lead_queue_events, public.operator_reminders
  FROM anon, authenticated;
GRANT SELECT ON TABLE public.operator_presence, public.lead_queue_items, public.lead_queue_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.operator_reminders TO authenticated;

DROP POLICY IF EXISTS "Team Leaders and Administrators can view operator presence" ON public.operator_presence;
CREATE POLICY "Team Leaders and Administrators can view operator presence"
  ON public.operator_presence FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members AS member
    WHERE member.workspace_id = operator_presence.workspace_id
      AND member.user_id = (SELECT auth.uid())
      AND member.role IN ('team_leader', 'administrator')
  ));

DROP POLICY IF EXISTS "Operators can view own presence" ON public.operator_presence;
CREATE POLICY "Operators can view own presence"
  ON public.operator_presence FOR SELECT TO authenticated
  USING (operator_id = (SELECT auth.uid()) AND public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Team Leaders and Administrators can view queue items" ON public.lead_queue_items;
CREATE POLICY "Team Leaders and Administrators can view queue items"
  ON public.lead_queue_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members AS member
    WHERE member.workspace_id = lead_queue_items.workspace_id
      AND member.user_id = (SELECT auth.uid())
      AND member.role IN ('team_leader', 'administrator')
  ));

DROP POLICY IF EXISTS "Operators can view current queue item" ON public.lead_queue_items;
CREATE POLICY "Operators can view current queue item"
  ON public.lead_queue_items FOR SELECT TO authenticated
  USING (
    assigned_operator_id = (SELECT auth.uid())
    AND state IN ('assigned', 'in_progress')
    AND public.is_workspace_member(workspace_id)
  );

DROP POLICY IF EXISTS "Team Leaders and Administrators can view queue events" ON public.lead_queue_events;
CREATE POLICY "Team Leaders and Administrators can view queue events"
  ON public.lead_queue_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members AS member
    WHERE member.workspace_id = lead_queue_events.workspace_id
      AND member.user_id = (SELECT auth.uid())
      AND member.role IN ('team_leader', 'administrator')
  ));

CREATE POLICY "Users can view gamification" ON public.user_gamification FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can manage own gamification" ON public.user_gamification FOR ALL USING (auth.role() = 'authenticated');

-- ========================================================
-- Initial Seed Data
-- ========================================================

INSERT INTO public.products (workspace_id, title, category, price, description)
SELECT workspace.id, seed.title, seed.category, seed.price, seed.description
FROM (VALUES
  ('Magnesium Ultra Boost 500mg', 'supplements'::TEXT, 29.99::DECIMAL, 'High absorption chelated magnesium for stress relief and sleep quality.'),
  ('HydraGlow Vitamin C Serum', 'cosmetics'::TEXT, 45.00::DECIMAL, 'Premium anti-aging antioxidant serum for radiant skin.'),
  ('SonicClean Pro Wireless Headset', 'electronics'::TEXT, 89.99::DECIMAL, 'Noise-canceling Bluetooth tele-sales headset with ultra clear mic.')
) AS seed(title, category, price, description)
CROSS JOIN (SELECT id FROM public.workspaces WHERE slug = 'main' LIMIT 1) AS workspace
WHERE NOT EXISTS (SELECT 1 FROM public.products LIMIT 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.leads (workspace_id, full_name, phone, email, city, status, ai_score)
SELECT workspace.id, seed.full_name, seed.phone, seed.email, seed.city, seed.status, seed.ai_score
FROM (VALUES
  ('Petr Svoboda', '+420 777 123 456', 'petr.svoboda@email.cz', 'Prague', 'qualified', 85),
  ('Elena Novak', '+420 608 987 654', 'elena.novak@gmail.com', 'Brno', 'new', 62),
  ('Tomas Dvorak', '+420 724 555 111', 'tomas.dvorak@post.cz', 'Ostrava', 'contacted', 74)
) AS seed(full_name, phone, email, city, status, ai_score)
CROSS JOIN (SELECT id FROM public.workspaces WHERE slug = 'main' LIMIT 1) AS workspace
WHERE NOT EXISTS (SELECT 1 FROM public.leads LIMIT 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.custom_objects (workspace_id, slug, singular_name, plural_name, icon, description)
SELECT workspace.id, seed.slug, seed.singular_name, seed.plural_name, seed.icon, seed.description
FROM (VALUES
('lead', 'Lead', 'Leads', 'Users', 'Core potential customers and call targets'),
('product', 'Product', 'Products', 'Package', 'Catalog items sold during tele-sales calls'),
('call', 'Call', 'Calls', 'Phone', 'Tele-sales conversation logs and AI transcripts'),
('deal', 'Deal', 'Deals', 'Briefcase', 'B2B opportunity pipeline records')
) AS seed(slug, singular_name, plural_name, icon, description)
CROSS JOIN (SELECT id FROM public.workspaces WHERE slug = 'main' LIMIT 1) AS workspace
ON CONFLICT DO NOTHING;
