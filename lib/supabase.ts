import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Handle app state for token refresh
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

// Database types
export interface DbSignal {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entry: number;
  sl: number;
  tp: number;
  status: 'active' | 'hit_tp' | 'hit_sl' | 'pending';
  confidence: number;
  technical_reason: string | null;
  ai_insight: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAccountData {
  id: string;
  user_id: string;
  balance: number;
  equity: number;
  floating_pl: number;
  margin_level: number;
  used_margin: number;
  free_margin: number;
  daily_drawdown: number;
  max_daily_drawdown: number;
  max_account_drawdown: number;
  current_account_drawdown: number;
  updated_at: string;
}

export interface DbPosition {
  id: string;
  user_id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  lots: number;
  open_price: number;
  current_price: number;
  profit: number;
  sparkline: number[];
  is_active: boolean;
  opened_at: string;
  updated_at: string;
}

export interface DbRiskAlert {
  id: string;
  user_id: string;
  icon: string;
  title: string;
  description: string;
  color: string;
  created_at: string;
}

export interface DbProfile {
  id: string;
  email: string;
  created_at: string;
  is_approved: boolean;
  push_token?: string | null;
}

export interface DbUserSignal {
  id: string;
  user_id: string;
  signal_id: string;
  entry_price: number;
  followed_at: string;
}

// Ensure a profile row exists for the current user
export async function upsertProfile(userId: string, email: string): Promise<void> {
  await supabase
    .from('profiles')
    .upsert({ id: userId, email, is_approved: false }, { onConflict: 'id', ignoreDuplicates: true });
}

// Fetch current user's approval status
export async function fetchApprovalStatus(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('is_approved')
    .eq('id', userId)
    .single();
  return data?.is_approved ?? false;
}

// Admin: fetch all profiles
export async function fetchAllProfiles(): Promise<DbProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Update push token for a user profile
export async function updatePushToken(userId: string, pushToken: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({ push_token: pushToken })
    .eq('id', userId);
}

// Follow a signal (paper trading)
export async function followSignal(userId: string, signalId: string, entryPrice: number): Promise<void> {
  const { error } = await supabase
    .from('user_signals')
    .upsert(
      { user_id: userId, signal_id: signalId, entry_price: entryPrice },
      { onConflict: 'user_id,signal_id' }
    );
  if (error) throw error;
}

// Unfollow a signal
export async function unfollowSignal(userId: string, signalId: string): Promise<void> {
  const { error } = await supabase
    .from('user_signals')
    .delete()
    .eq('user_id', userId)
    .eq('signal_id', signalId);
  if (error) throw error;
}

// Fetch all signals followed by user
export async function fetchUserSignals(userId: string): Promise<DbUserSignal[]> {
  const { data, error } = await supabase
    .from('user_signals')
    .select('*')
    .eq('user_id', userId)
    .order('followed_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Fetch approved user push tokens (for sending notifications)
export async function fetchApprovedPushTokens(): Promise<string[]> {
  const { data } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('is_approved', true)
    .not('push_token', 'is', null);
  return (data ?? []).map((p: { push_token: string | null }) => p.push_token).filter(Boolean) as string[];
}

// Admin: set approval status — restricted to master admin session only
export async function setUserApproval(userId: string, approved: boolean): Promise<void> {
  // Backend synchronization: verify the active authenticated session is the master admin
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.email !== 'ukbayar@gmail.com') {
    throw new Error('Unauthorized: Only the master admin can modify approval status.');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_approved: approved })
    .eq('id', userId);
  if (error) throw error;
}
