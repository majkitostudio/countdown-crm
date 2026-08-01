-- ========================================================
-- Countdown CRM — Supabase Database Migration & Schema
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

-- 2. LEADS TABLE (Customer directory)
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

-- 3. PRODUCTS TABLE (Catalog)
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

-- 4. CALLS TABLE (Call center logs)
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  duration_seconds INT NOT NULL DEFAULT 0,
  outcome TEXT NOT NULL DEFAULT 'completed', -- 'order_placed', 'followup_scheduled', 'objection', 'no_answer'
  transcript TEXT,
  ai_sentiment TEXT DEFAULT 'Neutral',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDERS TABLE (Sales)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE RESTRICT,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'pending', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. OBJECTIONS TABLE (Sales objection handling database)
CREATE TABLE IF NOT EXISTS public.objections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  objection_title TEXT NOT NULL,
  rebuttal_args TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- Row Level Security (RLS) Policies
-- ========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objections ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select & update profiles
CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Allow authenticated agents full access to leads, products, calls, orders
CREATE POLICY "Agents can view leads" ON public.leads FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Agents can manage leads" ON public.leads FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Agents can view products" ON public.products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Agents can manage products" ON public.products FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Agents can view calls" ON public.calls FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Agents can insert calls" ON public.calls FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Agents can view orders" ON public.orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Agents can insert orders" ON public.orders FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Agents can view objections" ON public.objections FOR SELECT USING (auth.role() = 'authenticated');

-- ========================================================
-- Initial Seed Data (Demo dataset)
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
