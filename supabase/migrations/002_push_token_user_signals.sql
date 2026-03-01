-- Migration 002: Add push_token to profiles and create user_signals table

-- Add push_token to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Create user_signals table for paper trading
CREATE TABLE IF NOT EXISTS user_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  entry_price NUMERIC NOT NULL,
  followed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, signal_id)
);

-- Enable RLS on user_signals
ALTER TABLE user_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_signals
CREATE POLICY "Users can view own signals"
  ON user_signals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own signals"
  ON user_signals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own signals"
  ON user_signals FOR DELETE
  USING (auth.uid() = user_id);

-- Enable real-time on user_signals
ALTER PUBLICATION supabase_realtime ADD TABLE user_signals;
