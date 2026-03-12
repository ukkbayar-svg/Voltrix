import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';
import GlassContainer from '@/components/GlassContainer';
import LineChart from '@/components/LineChart';
import { DbBotPublicStats, fetchBotPublicStats, supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type CTraderConnection = {
  user_id: string;
  scope: string;
  expires_at: string | null;
  connected_at: string;
  updated_at: string;
};

const CTRADER_CLIENT_ID = '22613_FRBTa13cBKlKsRMDLnKP6fYcp9qffA13eo8GdakD7LkAuBA3AL';

function formatPct(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatNumber(value: number, decimals = 2) {
  return value.toFixed(decimals);
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <GlassContainer style={styles.statCard}>
      <View style={styles.statTopRow}>
        <View style={[styles.statIcon, { backgroundColor: `${color}18`, borderColor: `${color}33` }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color, fontFamily: Fonts.mono }]}>{value}</Text>
    </GlassContainer>
  );
}

const FALLBACK_CURVE = Array.from({ length: 40 }).map((_, i) => 10000 + i * 60 + (Math.random() - 0.5) * 120);

export default function BotScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [stats, setStats] = useState<DbBotPublicStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const [conn, setConn] = useState<CTraderConnection | null>(null);
  const [connLoading, setConnLoading] = useState(false);

  const curve = useMemo(() => {
    const raw = stats?.equity_curve ?? [];
    return raw.length >= 10 ? raw : FALLBACK_CURVE;
  }, [stats]);

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchBotPublicStats();
      setStats(data);
      setIsLive(Boolean(data));
    } catch {
      setStats(null);
      setIsLive(false);
    }
  }, []);

  const loadConnection = useCallback(async () => {
    if (!user?.id) {
      setConn(null);
      return;
    }

    setConnLoading(true);
    const { data } = await supabase
      .from('ctrader_connections')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    setConn(data as CTraderConnection | null);
    setConnLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadStats();
    loadConnection();
  }, [loadStats, loadConnection]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadConnection()]);
    setRefreshing(false);
  };

  const redirectUri = useMemo(() => {
    // IMPORTANT: This must EXACTLY match one of the redirect URIs configured in your cTrader Open API application.
    if (Platform.OS === 'web') return `${window.location.origin}/auth/ctrader`;
    return Linking.createURL('auth/ctrader', { scheme: 'fastshot' });
  }, []);

  const startConnect = async () => {
    if (!user) return;

    const authUrl =
      `https://id.ctrader.com/my/settings/openapi/grantingaccess/?` +
      `client_id=${encodeURIComponent(CTRADER_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=trading&product=web`;

    if (Platform.OS === 'web') {
      window.location.href = authUrl;
      return;
    }

    await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  };

  const disconnect = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await supabase.functions.invoke('ctrader-disconnect', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    await loadConnection();
  };

  const totalReturn = Number(stats?.total_return ?? 0);
  const winRate = Number(stats?.win_rate ?? 0);
  const maxDD = Number(stats?.max_drawdown ?? 0);
  const pf = Number(stats?.profit_factor ?? 0);

  const returnColor = totalReturn >= 0 ? Colors.neonGreen : Colors.crimsonRed;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.voltrixAccent} />}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <View style={styles.voltrixDot} />
              <Text style={styles.brandTag}>VOLTRIX</Text>
            </View>
            <Text style={styles.title}>Bot</Text>
            <Text style={styles.subtitle}>Verified performance</Text>
          </View>

          <View style={styles.headerRight}>
            <View style={[styles.liveIndicator, { borderColor: isLive ? Colors.voltrixAccentGlow : Colors.borderDark }]}>
              <View style={[styles.liveDot, { backgroundColor: isLive ? Colors.voltrixAccent : Colors.textTertiary }]} />
              <Text style={[styles.liveText, { color: isLive ? Colors.voltrixAccent : Colors.textTertiary }]}>
                {isLive ? 'LIVE' : 'OFF'}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(500)}>
          <GlassContainer style={styles.connectCard}>
            <View style={styles.connectHeader}>
              <View style={styles.connectTitleRow}>
                <Ionicons name="link" size={16} color={Colors.voltrixAccent} />
                <Text style={styles.connectTitle}>cTrader Connection</Text>
              </View>
              <Text style={styles.connectSub}>
                When you're ready, we'll connect your cTrader bot to auto-sync equity/trades. For now you can publish verified performance manually.
              </Text>
              <View style={styles.redirectBox}>
                <Text style={styles.redirectLabel}>Redirect URI (must be added in cTrader app)</Text>
                <Text selectable style={[styles.redirectValue, { fontFamily: Fonts.mono }]}>
                  {redirectUri}
                </Text>
              </View>
            </View>

            {user ? (
              <View style={styles.connectActions}>
                {connLoading ? (
                  <Text style={styles.connectMeta}>Checking…</Text>
                ) : conn ? (
                  <>
                    <Text style={styles.connectMeta}>
                      Connected • Scope: {conn.scope} {conn.expires_at ? `• Expires: ${new Date(conn.expires_at).toLocaleDateString()}` : ''}
                    </Text>
                    <Pressable style={[styles.connectBtn, styles.disconnectBtn]} onPress={disconnect}>
                      <Ionicons name="close-circle" size={16} color="#000" />
                      <Text style={styles.connectBtnText}>DISCONNECT</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.connectMeta}>Not connected</Text>
                    <Pressable style={styles.connectBtn} onPress={startConnect}>
                      <Ionicons name="log-in" size={16} color="#000" />
                      <Text style={styles.connectBtnText}>CONNECT CTRADER</Text>
                    </Pressable>
                  </>
                )}
              </View>
            ) : (
              <Text style={styles.connectMeta}>Sign in to connect your cTrader account.</Text>
            )}
          </GlassContainer>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.heroCard}>
          <GlassContainer style={styles.heroInner}>
            <Text style={styles.heroLabel}>Equity Curve</Text>
            <LineChart data={curve.map((v) => Number(v))} height={140} />
            <View style={styles.heroMetaRow}>
              <Text style={styles.heroMetaText}>Updated: {stats?.updated_at ? new Date(stats.updated_at).toLocaleString() : '—'}</Text>
              <Text style={[styles.heroMetaText, { fontFamily: Fonts.mono }]}>Points: {curve.length}</Text>
            </View>
          </GlassContainer>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.statsGrid}>
          <StatCard label="Total Return" value={formatPct(totalReturn)} icon="trending-up" color={returnColor} />
          <StatCard label="Win Rate" value={formatPct(winRate)} icon="checkmark-circle" color={Colors.voltrixAccent} />
          <StatCard label="Max Drawdown" value={formatPct(maxDD)} icon="alert-circle" color={Colors.orange} />
          <StatCard label="Profit Factor" value={formatNumber(pf, 2)} icon="stats-chart" color={Colors.neonGreen} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.ctaCard}>
          <GlassContainer style={styles.ctaInner}>
            <View style={styles.ctaTitleRow}>
              <Ionicons name="sparkles" size={16} color={Colors.voltrixAccent} />
              <Text style={styles.ctaTitle}>cTrader Open API</Text>
            </View>
            <Text style={styles.ctaText}>
              When you're ready, we'll connect your cTrader bot to auto-sync equity/trades. For now you can publish verified performance manually.
            </Text>
            <Pressable style={styles.ctaBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={16} color="#000" />
              <Text style={styles.ctaBtnText}>REFRESH</Text>
            </Pressable>
          </GlassContainer>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.pureBlack },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerRight: { marginTop: 8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  voltrixDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.voltrixAccent,
    shadowColor: Colors.voltrixAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  brandTag: { color: Colors.voltrixAccent, fontSize: 10, fontWeight: '800', letterSpacing: 2.5 },
  title: { color: Colors.textPrimary, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: Colors.textTertiary, fontSize: 13, marginTop: 2 },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.cardBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, fontFamily: Fonts.mono },

  connectCard: { padding: 14, gap: 12 },
  connectHeader: { gap: 10 },
  connectTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  connectTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '900' },
  connectSub: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  redirectBox: {
    borderWidth: 1,
    borderColor: Colors.borderDark,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.lg,
    padding: 10,
    gap: 6,
  },
  redirectLabel: { color: Colors.textTertiary, fontSize: 10, fontWeight: '800', letterSpacing: 0.9 },
  redirectValue: { color: Colors.textPrimary, fontSize: 11 },

  connectActions: { gap: 10 },
  connectMeta: { color: Colors.textTertiary, fontSize: 12 },
  connectBtn: {
    height: 46,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.voltrixAccent,
    flexDirection: 'row',
    gap: 8,
  },
  disconnectBtn: { backgroundColor: Colors.orange },
  connectBtnText: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 1.3, fontFamily: Fonts.mono },

  heroCard: {},
  heroInner: { padding: 14 },
  heroLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 10 },
  heroMetaRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  heroMetaText: { color: Colors.textTertiary, fontSize: 11 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '48%', padding: 12 },
  statTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statIcon: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  statLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  statValue: { fontSize: 18, fontWeight: '900' },
  ctaCard: {},
  ctaInner: { padding: 14, gap: 10 },
  ctaTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800' },
  ctaText: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  ctaBtn: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.voltrixAccent,
    borderRadius: BorderRadius.lg,
    height: 46,
  },
  ctaBtnText: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 1.3, fontFamily: Fonts.mono },
});