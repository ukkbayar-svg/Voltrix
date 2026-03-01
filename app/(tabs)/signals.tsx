import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import * as Haptics from '@/lib/haptics';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useTextGeneration } from '@fastshot/ai';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';
import { mockSignals, Signal } from '@/constants/mockData';
import SignalCard from '@/components/SignalCard';
import { supabase, DbSignal, followSignal, unfollowSignal, fetchUserSignals } from '@/lib/supabase';
import { useApproval } from '@/lib/useApproval';
import ApprovalWall from '@/components/ApprovalWall';
import { useAuth } from '@fastshot/auth';

type FilterType = 'all' | 'active' | 'hit_tp' | 'hit_sl' | 'pending';

const filterOptions: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'hit_tp', label: 'TP Hit' },
  { key: 'hit_sl', label: 'SL Hit' },
  { key: 'pending', label: 'Pending' },
];

// Convert DB signal to Signal format
function dbToSignal(db: DbSignal): Signal {
  return {
    id: db.id,
    symbol: db.symbol,
    type: db.type,
    entry: Number(db.entry),
    sl: Number(db.sl),
    tp: Number(db.tp),
    timestamp: db.created_at,
    status: db.status,
    confidence: db.confidence,
    aiInsight: db.ai_insight || undefined,
    technicalReason: db.technical_reason || undefined,
  };
}

// Verified badge for TP-hit signals
function VerifiedBadge() {
  return (
    <View style={styles.verifiedBadge}>
      <Ionicons name="checkmark-circle" size={11} color={Colors.neonGreen} />
      <Text style={styles.verifiedText}>VERIFIED</Text>
    </View>
  );
}

// New signal notification chip
function NewSignalChip({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Animated.View entering={FadeInRight.duration(400)} style={styles.newSignalChip}>
      <View style={styles.newDot} />
      <Text style={styles.newSignalText}>{count} NEW</Text>
    </Animated.View>
  );
}

// Enhanced SignalCard wrapper with Verified badge
function EnhancedSignalCard({
  signal,
  onPress,
  isFollowed,
  onFollow,
  onUnfollow,
}: {
  signal: Signal;
  onPress: () => void;
  isFollowed: boolean;
  onFollow: (s: Signal) => Promise<void>;
  onUnfollow: (s: Signal) => Promise<void>;
}) {
  return (
    <View style={styles.signalCardWrapper}>
      {signal.status === 'hit_tp' && (
        <View style={styles.verifiedOverlay}>
          <VerifiedBadge />
        </View>
      )}
      <SignalCard
        signal={signal}
        onPress={onPress}
        isFollowed={isFollowed}
        onFollow={onFollow}
        onUnfollow={onUnfollow}
        showFollowButton
      />
    </View>
  );
}

export default function SignalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { isApproved, isAdmin, isLoading: approvalLoading } = useApproval();
  const [filter, setFilter] = useState<FilterType>('all');
  const [signals, setSignals] = useState<Signal[]>(mockSignals);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [newSignalCount, setNewSignalCount] = useState(0);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const { generateText } = useTextGeneration();

  // Generate AI insights for a single signal
  const generateInsightForSignal = useCallback(async (signal: Signal): Promise<string> => {
    try {
      const prompt = `You are Voltrix AI, a professional forex trading analyst. Given this trade signal for ${signal.symbol} (${signal.type} at ${signal.entry}, SL: ${signal.sl}, TP: ${signal.tp}), with the technical reason "${signal.technicalReason || 'Technical Analysis'}", provide a concise 1-2 sentence AI insight explaining the technical logic and market context. Be specific about indicators and price action. Keep it under 150 characters.`;
      const result = await generateText(prompt);
      return result || '';
    } catch {
      return '';
    }
  }, [generateText]);

  // Generate AI insights for signals that don't have them
  const generateAIInsights = useCallback(async (signalList: Signal[]) => {
    setLoadingInsights(true);
    try {
      const signalsNeedingInsights = signalList.filter((s) => !s.aiInsight);
      if (signalsNeedingInsights.length === 0) {
        setLoadingInsights(false);
        return signalList;
      }

      const updatedSignals = [...signalList];

      for (const signal of signalsNeedingInsights) {
        const insight = await generateInsightForSignal(signal);
        if (insight) {
          const index = updatedSignals.findIndex((s) => s.id === signal.id);
          if (index !== -1) {
            updatedSignals[index] = { ...updatedSignals[index], aiInsight: insight };
            // Save insight to Supabase if using live data
            supabase
              .from('signals')
              .update({ ai_insight: insight })
              .eq('id', signal.id)
              .then(() => {});
          }
        }
      }

      setSignals(updatedSignals);
      return updatedSignals;
    } catch {
      return signalList;
    } finally {
      setLoadingInsights(false);
    }
  }, [generateInsightForSignal]);

  // Fetch signals from Supabase
  const fetchSignals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const converted = data.map(dbToSignal);
        // Track seen IDs
        converted.forEach((s) => seenIdsRef.current.add(s.id));
        setSignals(converted);
        setIsLive(true);
        return converted;
      }
    } catch {
      // Fall back to mock signals and seed Supabase
      // seedSignals called in init
    }
    return null;
  }, []);

  // Seed initial signals to Supabase
  const seedSignals = useCallback(async () => {
    try {
      const { data: existing } = await supabase
        .from('signals')
        .select('id')
        .limit(1);

      if (!existing || existing.length === 0) {
        const toInsert = mockSignals.map((s) => ({
          symbol: s.symbol,
          type: s.type,
          entry: s.entry,
          sl: s.sl,
          tp: s.tp,
          status: s.status,
          confidence: s.confidence,
          technical_reason: s.technicalReason || null,
          ai_insight: s.aiInsight || null,
        }));
        const { data } = await supabase.from('signals').insert(toInsert).select();
        if (data) {
          const converted = data.map(dbToSignal);
          converted.forEach((s) => seenIdsRef.current.add(s.id));
          setSignals(converted);
          setIsLive(true);
          return converted;
        }
      }
    } catch {
      // Table doesn't exist yet, use mock
    }
    return null;
  }, []);

  // Subscribe to real-time signal changes
  const subscribeToSignals = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    const channel = supabase
      .channel('signals-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals',
        },
        async (payload) => {
          const newSignal = dbToSignal(payload.new as DbSignal);

          // Only notify if we haven't seen this signal
          if (!seenIdsRef.current.has(newSignal.id)) {
            seenIdsRef.current.add(newSignal.id);
            setNewSignalCount((c) => c + 1);
            setSignals((prev) => [newSignal, ...prev]);

            // Immediately generate AI insight for new signal
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const insight = await generateInsightForSignal(newSignal);
            if (insight) {
              setSignals((prev) =>
                prev.map((s) => s.id === newSignal.id ? { ...s, aiInsight: insight } : s)
              );
              supabase
                .from('signals')
                .update({ ai_insight: insight })
                .eq('id', newSignal.id)
                .then(() => {});
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'signals',
        },
        (payload) => {
          const updatedSignal = dbToSignal(payload.new as DbSignal);
          setSignals((prev) =>
            prev.map((s) => s.id === updatedSignal.id ? updatedSignal : s)
          );
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
  }, [generateInsightForSignal]);

  // Load followed signals for current user
  const loadFollowedSignals = useCallback(async () => {
    if (!user?.id) return;
    try {
      const userSigs = await fetchUserSignals(user.id);
      setFollowedIds(new Set(userSigs.map((s) => s.signal_id)));
    } catch {
      // Table may not exist yet
    }
  }, [user?.id]);

  // Follow a signal
  const handleFollowSignal = useCallback(async (signal: Signal) => {
    if (!user?.id) return;
    await followSignal(user.id, signal.id, signal.entry);
    setFollowedIds((prev) => new Set([...prev, signal.id]));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [user?.id]);

  // Unfollow a signal
  const handleUnfollowSignal = useCallback(async (signal: Signal) => {
    if (!user?.id) return;
    await unfollowSignal(user.id, signal.id);
    setFollowedIds((prev) => {
      const next = new Set(prev);
      next.delete(signal.id);
      return next;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [user?.id]);

  // Load on mount
  useEffect(() => {
    const init = async () => {
      let liveSignals = await fetchSignals();
      if (!liveSignals) {
        liveSignals = await seedSignals();
      }
      const signalsToProcess = liveSignals || mockSignals;
      await generateAIInsights(signalsToProcess);
      subscribeToSignals();
      await loadFollowedSignals();
    };

    init();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [fetchSignals, seedSignals, generateAIInsights, subscribeToSignals, loadFollowedSignals]);

  const filteredSignals = signals.filter((s) => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setNewSignalCount(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const liveSignals = await fetchSignals();
    await generateAIInsights(liveSignals || signals);
    setRefreshing(false);
  }, [fetchSignals, generateAIInsights, signals]);

  const handleSignalPress = (signal: Signal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/signal/[id]',
      params: { id: signal.id },
    });
  };

  const activeCount = signals.filter((s) => s.status === 'active').length;
  const closedSignals = signals.filter((s) => s.status !== 'pending' && s.status !== 'active');
  const winRate = closedSignals.length > 0
    ? ((signals.filter((s) => s.status === 'hit_tp').length / closedSignals.length) * 100)
    : 0;

  // Approval guard: block non-approved users from signal data
  if (!approvalLoading && !isApproved && !isAdmin) {
    return <ApprovalWall screenName="Signal Intelligence" />;
  }

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
          <View style={styles.headerLeft}>
            <View style={styles.brandRow}>
              <View style={styles.voltrixDot} />
              <Text style={styles.brandTag}>VOLTRIX</Text>
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Signals</Text>
              <NewSignalChip count={newSignalCount} />
            </View>
            <Text style={styles.subtitle}>Voltrix AI Trade Insights</Text>
          </View>
          <View style={styles.headerActions}>
            {/* Live indicator */}
            <View style={[styles.liveIndicator, { borderColor: isLive ? Colors.voltrixAccentGlow : Colors.borderDark }]}>
              <View style={[styles.liveDot, { backgroundColor: isLive ? Colors.voltrixAccent : Colors.textTertiary }]} />
              <Text style={[styles.liveText, { color: isLive ? Colors.voltrixAccent : Colors.textTertiary }]}>
                {isLive ? 'LIVE' : 'OFF'}
              </Text>
            </View>
            {loadingInsights && (
              <View style={styles.aiLoadingBadge}>
                <ActivityIndicator size="small" color={Colors.voltrixAccent} />
                <Text style={styles.aiLoadingText}>AI...</Text>
              </View>
            )}
          </View>
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
          <View style={styles.statCard}>
            <View style={styles.statIconRow}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.neonGreen} />
              <Text style={[styles.statValue, { color: Colors.neonGreen, fontSize: 16 }]}>
                {signals.filter((s) => s.status === 'hit_tp').length}
              </Text>
            </View>
            <Text style={styles.statLabel}>Verified</Text>
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
                  setNewSignalCount(0);
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
                <EnhancedSignalCard
                  signal={signal}
                  onPress={() => handleSignalPress(signal)}
                  isFollowed={followedIds.has(signal.id)}
                  onFollow={handleFollowSignal}
                  onUnfollow={handleUnfollowSignal}
                />
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
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  newSignalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.voltrixAccentDim,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.voltrixAccentGlow,
  },
  newDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.voltrixAccent,
  },
  newSignalText: {
    color: Colors.voltrixAccent,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: Fonts.mono,
  },
  subtitle: {
    color: Colors.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
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
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: Fonts.mono,
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
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    color: Colors.textTertiary,
    fontSize: 10,
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
  signalCardWrapper: {
    position: 'relative',
    marginBottom: 2,
  },
  verifiedOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.neonGreenDim,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.neonGreenGlow,
  },
  verifiedText: {
    color: Colors.neonGreen,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: Fonts.mono,
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
