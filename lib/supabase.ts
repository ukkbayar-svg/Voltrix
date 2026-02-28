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
