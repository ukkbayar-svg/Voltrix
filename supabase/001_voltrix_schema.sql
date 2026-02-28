-- ============================================================
-- VOLTRIX — Production Database Schema
-- Migration: 001_voltrix_schema.sql
-- Target Project: qqhuwgpkdhbtlvmdjeax
-- Description: Core tables for account data, positions,
--              trading signals, and risk alerts with RLS.
-- ============================================================

-- Enable UUID extension (required for gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: account_data
-- Stores per-user live account metrics (balance, equity, P/L,
-- margin stats, and drawdown thresholds).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.account_data (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance                 NUMERIC(18, 2)  NOT NULL DEFAULT 10000.00,
    equity                  NUMERIC(18, 2)  NOT NULL DEFAULT 10000.00,
    floating_pl             NUMERIC(18, 2)  NOT NULL DEFAULT 0.00,
    margin_level            NUMERIC(10, 2)  NOT NULL DEFAULT 1000.00,
    used_margin             NUMERIC(18, 2)  NOT NULL DEFAULT 0.00,
    free_margin             NUMERIC(18, 2)  NOT NULL DEFAULT 10000.00,
    daily_drawdown          NUMERIC(6, 4)   NOT NULL DEFAULT 0.0000,
    max_daily_drawdown      NUMERIC(6, 4)   NOT NULL DEFAULT 0.0500,
    max_account_drawdown    NUMERIC(6, 4)   NOT NULL DEFAULT 0.1000,
    current_account_drawdown NUMERIC(6, 4)  NOT NULL DEFAULT 0.0000,
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT account_data_user_id_unique UNIQUE (user_id)
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_account_data_user_id ON public.account_data(user_id);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_account_data_updated_at
    BEFORE UPDATE ON public.account_data
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TABLE: positions
-- Stores active and historical open positions per user.
-- sparkline stored as JSONB array of floats for chart rendering.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.positions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol          VARCHAR(20)     NOT NULL,
    type            VARCHAR(4)      NOT NULL CHECK (type IN ('BUY', 'SELL')),
    lots            NUMERIC(10, 2)  NOT NULL DEFAULT 0.01,
    open_price      NUMERIC(18, 6)  NOT NULL,
    current_price   NUMERIC(18, 6)  NOT NULL,
    profit          NUMERIC(18, 2)  NOT NULL DEFAULT 0.00,
    sparkline       JSONB           NOT NULL DEFAULT '[]',
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    opened_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_positions_user_id         ON public.positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_user_active     ON public.positions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_positions_symbol          ON public.positions(symbol);
CREATE INDEX IF NOT EXISTS idx_positions_opened_at       ON public.positions(opened_at DESC);

CREATE OR REPLACE TRIGGER trg_positions_updated_at
    BEFORE UPDATE ON public.positions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TABLE: signals
-- Stores AI-generated and analyst trading signals.
-- Shared across all users (no user_id FK) — signals are global.
-- Confidence stored as 0–100 integer percentage.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.signals (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol              VARCHAR(20)     NOT NULL,
    type                VARCHAR(4)      NOT NULL CHECK (type IN ('BUY', 'SELL')),
    entry               NUMERIC(18, 6)  NOT NULL,
    sl                  NUMERIC(18, 6)  NOT NULL,
    tp                  NUMERIC(18, 6)  NOT NULL,
    status              VARCHAR(20)     NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('active', 'hit_tp', 'hit_sl', 'pending')),
    confidence          SMALLINT        NOT NULL DEFAULT 50
                            CHECK (confidence BETWEEN 0 AND 100),
    technical_reason    TEXT,
    ai_insight          TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Indexes for signal feed queries
CREATE INDEX IF NOT EXISTS idx_signals_status       ON public.signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_symbol       ON public.signals(symbol);
CREATE INDEX IF NOT EXISTS idx_signals_created_at   ON public.signals(created_at DESC);

CREATE OR REPLACE TRIGGER trg_signals_updated_at
    BEFORE UPDATE ON public.signals
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TABLE: risk_alerts
-- Stores auto-generated and system risk notifications per user.
-- icon maps to Ionicons names used in React Native UI layer.
-- color stores hex code for dynamic badge styling.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.risk_alerts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    icon        VARCHAR(64)     NOT NULL DEFAULT 'warning-outline',
    title       VARCHAR(128)    NOT NULL,
    description TEXT            NOT NULL,
    color       VARCHAR(16)     NOT NULL DEFAULT '#FF9F0A',
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Indexes for alert feed queries
CREATE INDEX IF NOT EXISTS idx_risk_alerts_user_id      ON public.risk_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_created_at   ON public.risk_alerts(user_id, created_at DESC);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- Applied to all tables. All policies enforce user_id isolation.
-- The signals table uses public read (all authenticated users)
-- since signals are a shared, broadcast resource.
-- ============================================================
ALTER TABLE public.account_data   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_alerts     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: account_data
-- Users can only read, insert, and update their own row.
-- ============================================================
CREATE POLICY "account_data: users can select own row"
    ON public.account_data FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "account_data: users can insert own row"
    ON public.account_data FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "account_data: users can update own row"
    ON public.account_data FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "account_data: users can delete own row"
    ON public.account_data FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: positions
-- Users can only read and manage their own positions.
-- ============================================================
CREATE POLICY "positions: users can select own"
    ON public.positions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "positions: users can insert own"
    ON public.positions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "positions: users can update own"
    ON public.positions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "positions: users can delete own"
    ON public.positions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: signals
-- All authenticated users can read signals (broadcast feed).
-- Only service_role (backend/admin) can insert/update signals.
-- ============================================================
CREATE POLICY "signals: authenticated read"
    ON public.signals FOR SELECT
    TO authenticated
    USING (TRUE);

-- Service role bypasses RLS by default; this policy prevents
-- anon users from writing signals via the public API key.
CREATE POLICY "signals: service role can insert"
    ON public.signals FOR INSERT
    TO service_role
    WITH CHECK (TRUE);

CREATE POLICY "signals: service role can update"
    ON public.signals FOR UPDATE
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

-- ============================================================
-- RLS POLICIES: risk_alerts
-- Users can only read and manage their own risk alerts.
-- Insert is also allowed from authenticated (auto-seeded on client).
-- ============================================================
CREATE POLICY "risk_alerts: users can select own"
    ON public.risk_alerts FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "risk_alerts: users can insert own"
    ON public.risk_alerts FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "risk_alerts: users can delete own"
    ON public.risk_alerts FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================
-- REALTIME: Enable Supabase Realtime publication
-- Allows the app's real-time subscriptions to receive
-- postgres_changes events on all four tables.
-- ============================================================
DO $$
BEGIN
    -- Add tables to supabase_realtime publication if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND tablename = 'account_data'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.account_data;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND tablename = 'positions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.positions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND tablename = 'signals'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND tablename = 'risk_alerts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.risk_alerts;
    END IF;
END $$;

-- ============================================================
-- SEED: Default signal examples (optional dev seed)
-- These demonstrate the expected data shape for the signals feed.
-- Remove or comment out for a clean production migration.
-- ============================================================
INSERT INTO public.signals (symbol, type, entry, sl, tp, status, confidence, technical_reason)
VALUES
    ('EUR/USD', 'BUY',  1.08520, 1.08200, 1.09100, 'active',  82, 'Price broke above 50 EMA with strong volume. RSI at 58 — bullish momentum. Key resistance at 1.0900.'),
    ('XAU/USD', 'BUY',  2318.50, 2295.00, 2365.00, 'active',  88, 'Gold consolidating above 200 SMA. Inverse H&S pattern forming. Safe-haven demand elevated.'),
    ('GBP/USD', 'SELL', 1.26800, 1.27200, 1.25900, 'pending', 74, 'Double top formed at 1.2720. Bearish divergence on RSI. Break below 1.2660 confirms.'),
    ('USD/JPY', 'BUY',  153.400, 152.800, 154.500, 'hit_tp',  91, 'BOJ intervention risk eased. Dollar strength persists. Break above 153.50 continuation target.'),
    ('AUD/USD', 'SELL', 0.65200, 0.65600, 0.64500, 'hit_sl',  67, 'RBA pause weighing on AUD. Weak Chinese PMI data. Trend continuation below 0.6520 level.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- END OF MIGRATION: 001_voltrix_schema.sql
-- ============================================================
