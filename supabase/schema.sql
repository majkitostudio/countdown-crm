-- ========================================================
-- Countdown CRM — Supabase Database Migration & Schema
-- Single Source of Truth for Production Architecture
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'agent', -- 'admin', 'manager', 'agent'
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

CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'manager', 'agent')),
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
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT,
  country TEXT DEFAULT 'CZ',
  status TEXT NOT NULL DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'customer', 'unresponsive'
  ai_score INT DEFAULT 50 CHECK (ai_score BETWEEN 0 AND 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRODUCTS TABLE (Catalog)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  duration_seconds INT NOT NULL DEFAULT 0,
  outcome TEXT NOT NULL DEFAULT 'completed', -- 'order_placed', 'followup_scheduled', 'objection', 'no_answer', 'completed'
  transcript TEXT,
  ai_sentiment TEXT DEFAULT 'Neutral',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORDERS TABLE (Sales)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE RESTRICT,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'pending', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. OBJECTIONS TABLE (Sales objection handling database)
CREATE TABLE IF NOT EXISTS public.objections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  singular_name TEXT NOT NULL,
  plural_name TEXT NOT NULL,
  icon TEXT DEFAULT 'Layers',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attribute_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  object_slug TEXT REFERENCES public.custom_objects(slug) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.record_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
      AND member.role = 'admin'
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

CREATE POLICY "Users can view gamification" ON public.user_gamification FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can manage own gamification" ON public.user_gamification FOR ALL USING (auth.role() = 'authenticated');

-- ========================================================
-- Initial Seed Data
-- ========================================================

INSERT INTO public.products (title, category, price, description) VALUES
('Magnesium Ultra Boost 500mg', 'supplements', 29.99, 'High absorption chelated magnesium for stress relief and sleep quality.'),
('HydraGlow Vitamin C Serum', 'cosmetics', 45.00, 'Premium anti-aging antioxidant serum for radiant skin.'),
('SonicClean Pro Wireless Headset', 'electronics', 89.99, 'Noise-canceling Bluetooth tele-sales headset with ultra clear mic.')
ON CONFLICT DO NOTHING;

INSERT INTO public.leads (full_name, phone, email, city, status, ai_score) VALUES
('Petr Svoboda', '+420 777 123 456', 'petr.svoboda@email.cz', 'Prague', 'qualified', 85),
('Elena Novak', '+420 608 987 654', 'elena.novak@gmail.com', 'Brno', 'new', 62),
('Tomas Dvorak', '+420 724 555 111', 'tomas.dvorak@post.cz', 'Ostrava', 'contacted', 74)
ON CONFLICT DO NOTHING;

INSERT INTO public.custom_objects (slug, singular_name, plural_name, icon, description) VALUES
('lead', 'Lead', 'Leads', 'Users', 'Core potential customers and call targets'),
('product', 'Product', 'Products', 'Package', 'Catalog items sold during tele-sales calls'),
('call', 'Call', 'Calls', 'Phone', 'Tele-sales conversation logs and AI transcripts'),
('deal', 'Deal', 'Deals', 'Briefcase', 'B2B opportunity pipeline records')
ON CONFLICT DO NOTHING;
