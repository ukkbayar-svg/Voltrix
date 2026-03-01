-- Migration 003: Create profiles table with RLS for admin access control
-- This table tracks user approval status and push notification tokens.

-- Create profiles table linked to Supabase auth users
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  is_approved BOOLEAN     NOT NULL DEFAULT false,
  push_token  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at  ON public.profiles(created_at DESC);

-- Auto-update updated_at on row change
CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (idempotent)
DROP POLICY IF EXISTS "profiles: users can select own"       ON public.profiles;
DROP POLICY IF EXISTS "profiles: users can insert own"       ON public.profiles;
DROP POLICY IF EXISTS "profiles: users can update own"       ON public.profiles;
DROP POLICY IF EXISTS "profiles: master admin can select all" ON public.profiles;
DROP POLICY IF EXISTS "profiles: master admin can update all" ON public.profiles;

-- Users can read their own profile
CREATE POLICY "profiles: users can select own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can create their own profile on signup
CREATE POLICY "profiles: users can insert own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile (e.g. push token)
CREATE POLICY "profiles: users can update own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Master admin (ukbayar@gmail.com) can read ALL profiles
CREATE POLICY "profiles: master admin can select all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.email() = 'ukbayar@gmail.com');

-- Master admin (ukbayar@gmail.com) can update ALL profiles (approve/block)
CREATE POLICY "profiles: master admin can update all"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.email() = 'ukbayar@gmail.com')
  WITH CHECK (auth.email() = 'ukbayar@gmail.com');

-- Enable real-time on profiles for admin dashboard live updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;
