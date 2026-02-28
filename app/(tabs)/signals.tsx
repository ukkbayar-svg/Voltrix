import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTextGeneration } from '@fastshot/ai';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';
import { mockSignals, Signal } from '@/constants/mockData';
import SignalCard from '@/components/SignalCard';

type FilterType = 'all' | 'active' | 'hit_tp' | 'hit_sl' | 'pending';

const filterOptions: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'hit_tp', label: 'TP Hit' },
  { key: 'hit_sl', label: 'SL Hit' },
  { key: 'pending', label: 'Pending' },
];

export default function SignalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');
  const [signals, setSignals] = useState<Signal[]>(mockSignals);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const { generateText } = useTextGeneration();

  // Generate Voltrix AI insights for signals that don't have them
  const generateAIInsights = useCallback(async () => {
    setLoadingInsights(true);
    try {
      const signalsNeedingInsights = signals.filter((s) => !s.aiInsight);
      const updatedSignals = [...signals];

      for (const signal of signalsNeedingInsights) {
        try {
          const prompt = `You are Voltrix AI, a professional forex trading analyst for the Voltrix trading platform. Given this trade signal for ${signal.symbol} (${signal.type} at ${signal.entry}, SL: ${signal.sl}, TP: ${signal.tp}), with the technical reason being "${signal.technicalReason}", provide a concise 1-2 sentence AI insight explaining the technical logic and market context. Be specific about indicators and price action. Keep it under 150 characters.`;

          const result = await generateText(prompt);

          if (result) {
            const index = updatedSignals.findIndex((s) => s.id === signal.id);
            if (index !== -1) {
              updatedSignals[index] = { ...updatedSignals[index], aiInsight: result };
            }
          }
        } catch {
          // Continue with next signal on error
        }
      }

      setSignals(updatedSignals);
    } catch {
      // Silent fail for AI insights
    } finally {
      setLoadingInsights(false);
    }
  }, [signals, generateText]);

  // Load Voltrix AI insights on mount
  useEffect(() => {
    generateAIInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSignals = signals.filter((s) => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    generateAIInsights().finally(() => setRefreshing(false));
  }, [generateAIInsights]);

  const handleSignalPress = (signal: Signal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/signal/[id]',
      params: { id: signal.id },
    });
  };

  const activeCount = signals.filter((s) => s.status === 'active').length;
  const winRate = signals.length > 0
    ? ((signals.filter((s) => s.status === 'hit_tp').length / signals.filter((s) => s.status !== 'pending' && s.status !== 'active').length) * 100) || 0
    : 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.voltrixAccent}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <View style={styles.voltrixDot} />
              <Text style={styles.brandTag}>VOLTRIX</Text>
            </View>
            <Text style={styles.title}>Signals</Text>
            <Text style={styles.subtitle}>Voltrix AI Trade Insights</Text>
          </View>
          {loadingInsights && (
            <View style={styles.aiLoadingBadge}>
              <ActivityIndicator size="small" color={Colors.voltrixAccent} />
              <Text style={styles.aiLoadingText}>Voltrix AI...</Text>
            </View>
          )}
        </Animated.View>

        {/* Stats Row */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{signals.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.neonGreen }]}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.voltrixAccent, fontFamily: Fonts.mono }]}>
              {winRate.toFixed(0)}%
            </Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
        </Animated.View>

        {/* Filter Tabs */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {filterOptions.map((opt) => (
              <Pressable
                key={opt.key}
                style={[styles.filterChip, filter === opt.key && styles.filterChipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFilter(opt.key);
                }}
              >
                <Text style={[styles.filterText, filter === opt.key && styles.filterTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Signals Feed */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          {filteredSignals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="radio-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No signals found</Text>
              <Text style={styles.emptySubtext}>Try a different filter</Text>
            </View>
          ) : (
            filteredSignals.map((signal, index) => (
              <Animated.View key={signal.id} entering={FadeInDown.delay(350 + index * 80).duration(400)}>
                <SignalCard signal={signal} onPress={() => handleSignalPress(signal)} />
              </Animated.View>
            ))
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.pureBlack,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
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
  brandTag: {
    color: Colors.voltrixAccent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.5,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: Colors.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
  aiLoadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.voltrixAccentDim,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.voltrixAccentGlow,
    marginTop: 8,
  },
  aiLoadingText: {
    color: Colors.voltrixAccent,
    fontSize: 11,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.md,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '500',
  },
  filterRow: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  filterChipActive: {
    backgroundColor: Colors.voltrixAccentDim,
    borderColor: Colors.voltrixAccent,
  },
  filterText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: Colors.voltrixAccent,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: Colors.textTertiary,
    fontSize: 13,
  },
});
