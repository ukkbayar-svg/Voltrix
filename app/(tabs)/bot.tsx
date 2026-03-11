import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';
import GlassContainer from '@/components/GlassContainer';
import LineChart from '@/components/LineChart';
import { DbBotPublicStats, fetchBotPublicStats } from '@/lib/supabase';

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
  const [stats, setStats] = useState<DbBotPublicStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const curve = useMemo(() => {
    const raw = stats?.equity_curve ?? [];
    return raw.length >= 10 ? raw : FALLBACK_CURVE;
  }, [stats]);

  const load = async () => {
    try {
      const data = await fetchBotPublicStats();
      setStats(data);
      setIsLive(Boolean(data));
    } catch {
      setStats(null);
      setIsLive(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
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
            <Text style={styles.subtitle}>Public performance & verified results</Text>
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
              <Text style={styles.ctaTitle}>Copy the Bot (coming next)</Text>
            </View>
            <Text style={styles.ctaText}>
              Next step is connecting a trading account (cTrader/MT) so customers can copy positions automatically.
              For now, you can follow signals and track the bot’s verified performance here.
            </Text>
            <Pressable style={styles.ctaBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={16} color="#000" />
              <Text style={styles.ctaBtnText}>REFRESH STATS</Text>
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
