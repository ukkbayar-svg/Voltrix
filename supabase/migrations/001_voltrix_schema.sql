-- Voltrix Live Trading Dashboard Schema
-- Run this in your Supabase SQL Editor

-- Account data table for live dashboard
CREATE TABLE IF NOT EXISTS public.account_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(15,2) NOT NULL DEFAULT 52480.75,
  equity DECIMAL(15,2) NOT NULL DEFAULT 53308.75,
  floating_pl DECIMAL(15,2) NOT NULL DEFAULT 828.00,
  margin_level DECIMAL(10,2) NOT NULL DEFAULT 1842.5,
  used_margin DECIMAL(15,2) NOT NULL DEFAULT 2893.12,
  free_margin DECIMAL(15,2) NOT NULL DEFAULT 50415.63,
  daily_drawdown DECIMAL(8,4) NOT NULL DEFAULT 2.3,
  max_daily_drawdown DECIMAL(8,4) NOT NULL DEFAULT 5.0,
  max_account_drawdown DECIMAL(8,4) NOT NULL DEFAULT 10.0,
  current_account_drawdown DECIMAL(8,4) NOT NULL DEFAULT 3.8,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Positions table
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  type TEXT CHECK (type IN ('BUY', 'SELL')) NOT NULL,
  lots DECIMAL(8,2) NOT NULL,
  open_price DECIMAL(12,5) NOT NULL,
  current_price DECIMAL(12,5) NOT NULL,
  profit DECIMAL(12,2) NOT NULL DEFAULT 0,
  sparkline DECIMAL[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signals table (shared across all users)
CREATE TABLE IF NOT EXISTS public.signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  type TEXT CHECK (type IN ('BUY', 'SELL')) NOT NULL,
  entry DECIMAL(12,5) NOT NULL,
  sl DECIMAL(12,5) NOT NULL,
  tp DECIMAL(12,5) NOT NULL,
  status TEXT CHECK (status IN ('active', 'hit_tp', 'hit_sl', 'pending')) NOT NULL DEFAULT 'pending',
  confidence INTEGER CHECK (confidence BETWEEN 0 AND 100) NOT NULL DEFAULT 75,
  technical_reason TEXT,
  ai_insight TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk alerts table
CREATE TABLE IF NOT EXISTS public.risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  icon TEXT NOT NULL DEFAULT 'warning',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#FF9F0A',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.account_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for account_data
CREATE POLICY "Users can view own account data" ON public.account_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own account data" ON public.account_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own account data" ON public.account_data FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for positions
CREATE POLICY "Users can view own positions" ON public.positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own positions" ON public.positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own positions" ON public.positions FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for signals (all authenticated users can read signals)
CREATE POLICY "Authenticated users can read signals" ON public.signals FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert signals" ON public.signals FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update signals" ON public.signals FOR UPDATE TO authenticated USING (TRUE);

-- RLS Policies for risk_alerts
CREATE POLICY "Users can view own risk alerts" ON public.risk_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own risk alerts" ON public.risk_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.account_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.positions;

-- Seed initial signals data
INSERT INTO public.signals (id, symbol, type, entry, sl, tp, status, confidence, technical_reason, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'EUR/USD', 'BUY', 1.0855, 1.0820, 1.0920, 'active', 87, 'RSI Divergence + Support Bounce', NOW() - INTERVAL '30 minutes'),
  ('22222222-2222-2222-2222-222222222222', 'GBP/USD', 'SELL', 1.2720, 1.2765, 1.2650, 'active', 74, 'Double Top Rejection at Resistance', NOW() - INTERVAL '2 hours'),
  ('33333333-3333-3333-3333-333333333333', 'XAU/USD', 'BUY', 2342.00, 2325.00, 2380.00, 'hit_tp', 91, 'Ascending Triangle Breakout', NOW() - INTERVAL '4 hours'),
  ('44444444-4444-4444-4444-444444444444', 'USD/JPY', 'SELL', 150.20, 150.80, 149.20, 'active', 68, 'Overbought RSI + Trendline Resistance', NOW() - INTERVAL '8 hours'),
  ('55555555-5555-5555-5555-555555555555', 'AUD/USD', 'BUY', 0.6510, 0.6480, 0.6570, 'hit_sl', 62, 'Moving Average Crossover', NOW() - INTERVAL '12 hours'),
  ('66666666-6666-6666-6666-666666666666', 'NZD/USD', 'BUY', 0.5985, 0.5955, 0.6040, 'pending', 79, 'Bullish Engulfing at Key Support', NOW() - INTERVAL '16 hours')
ON CONFLICT (id) DO NOTHING;
