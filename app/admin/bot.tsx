import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';
import GlassContainer from '@/components/GlassContainer';
import { useAuth } from '@/lib/auth';
import { DbBotPublicStats, fetchBotPublicStats, updateBotPublicStats } from '@/lib/supabase';

const ADMIN_UID = '40e32eee-1bee-4033-9ce1-f3b29d112d6e';

function parseNum(input: string): number {
  const n = Number(input);
  return Number.isFinite(n) ? n : 0;
}

export default function AdminBotScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const isAdmin = user?.id === ADMIN_UID;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<DbBotPublicStats | null>(null);

  const [totalReturn, setTotalReturn] = useState('0');
  const [winRate, setWinRate] = useState('0');
  const [maxDD, setMaxDD] = useState('0');
  const [profitFactor, setProfitFactor] = useState('0');
  const [curve, setCurve] = useState('10000,10050,10120,10080,10200');

  const load = async () => {
    setError(null);
    try {
      const data = await fetchBotPublicStats();
      setStats(data);
      if (data) {
        setTotalReturn(String(Number(data.total_return ?? 0)));
        setWinRate(String(Number(data.win_rate ?? 0)));
        setMaxDD(String(Number(data.max_drawdown ?? 0)));
        setProfitFactor(String(Number(data.profit_factor ?? 0)));
        setCurve((data.equity_curve ?? []).join(',') || '');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bot stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/(tabs)');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const curveArray = useMemo(() => {
    const parts = curve
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => Number(p));
    return parts.filter((n) => Number.isFinite(n));
  }, [curve]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateBotPublicStats({
        total_return: parseNum(totalReturn),
        win_rate: parseNum(winRate),
        max_drawdown: parseNum(maxDD),
        profit_factor: parseNum(profitFactor),
        equity_curve: curveArray,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save bot stats');
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!isAdmin) return null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 60 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.voltrixAccent} />}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Bot Performance</Text>
            <Text style={styles.subtitle}>Edit public stats shown to customers</Text>
          </View>
        </Animated.View>

        <GlassContainer style={styles.card}>
          <Text style={styles.sectionTitle}>cTrader Open API</Text>
          <Text style={styles.sectionText}>
            When you’re ready, we’ll connect your cTrader bot to auto-sync equity/trades.
            For now you can publish verified performance manually.
          </Text>
          <Image source={require('@/assets/images/ctrader-openapi-app.png')} style={styles.image} resizeMode="contain" />
        </GlassContainer>

        <GlassContainer style={styles.card}>
          <Text style={styles.sectionTitle}>Public Metrics</Text>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={Colors.voltrixAccent} />
              <Text style={styles.loadingText}>Loading…</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={Colors.crimsonRed} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.grid}>
            <View style={styles.field}>
              <Text style={styles.label}>Total Return (%)</Text>
              <TextInput value={totalReturn} onChangeText={setTotalReturn} style={styles.input} keyboardType="numeric" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Win Rate (%)</Text>
              <TextInput value={winRate} onChangeText={setWinRate} style={styles.input} keyboardType="numeric" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Max Drawdown (%)</Text>
              <TextInput value={maxDD} onChangeText={setMaxDD} style={styles.input} keyboardType="numeric" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Profit Factor</Text>
              <TextInput value={profitFactor} onChangeText={setProfitFactor} style={styles.input} keyboardType="numeric" />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Equity Curve (comma-separated)</Text>
            <TextInput
              value={curve}
              onChangeText={setCurve}
              style={[styles.input, styles.inputMultiline]}
              multiline
              numberOfLines={4}
            />
            <Text style={styles.helper}>
              Example: 10000, 10120, 10080, 10240
            </Text>
          </View>

          <Pressable onPress={onSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.7 }]}>
            {saving ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Ionicons name="save" size={16} color="#000" />
                <Text style={styles.saveText}>PUBLISH</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.updatedText}>
            Last updated: {stats?.updated_at ? new Date(stats.updated_at).toLocaleString() : '—'}
          </Text>
        </GlassContainer>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.pureBlack },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  headerText: { flex: 1 },
  title: { color: Colors.textPrimary, fontSize: 22, fontWeight: '900' },
  subtitle: { color: Colors.textSecondary, marginTop: 4 },
  card: { padding: 14, gap: 10 },
  sectionTitle: { color: Colors.textPrimary, fontWeight: '900', fontSize: 14 },
  sectionText: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  image: { width: '100%', height: 220, borderRadius: 12, backgroundColor: Colors.pureBlack },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  loadingText: { color: Colors.textSecondary },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 59, 92, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 92, 0.25)',
    borderRadius: BorderRadius.md,
    padding: 12,
  },
  errorText: { color: Colors.crimsonRed, fontSize: 13, flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  field: { width: '48%', gap: 6 },
  label: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  input: {
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    paddingHorizontal: 12,
    color: Colors.textPrimary,
    backgroundColor: Colors.pureBlack,
    fontFamily: Fonts.mono,
  },
  inputMultiline: {
    height: 96,
    paddingTop: 10,
    textAlignVertical: 'top',
    width: '100%',
  },
  helper: { color: Colors.textTertiary, fontSize: 11 },
  saveBtn: {
    marginTop: 6,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.voltrixAccent,
    flexDirection: 'row',
    gap: 10,
  },
  saveText: { color: '#000', fontWeight: '900', letterSpacing: 1.2, fontFamily: Fonts.mono, fontSize: 12 },
  updatedText: { marginTop: 2, color: Colors.textTertiary, fontSize: 11 },
});
