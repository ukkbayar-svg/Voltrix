import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { Signal } from '@/constants/mockData';
import SignalCard from '@/components/SignalCard';
import { supabase, DbSignal, followSignal, unfollowSignal, fetchUserSignals } from '@/lib/supabase';
import { useApproval } from '@/lib/useApproval';
import ApprovalWall from '@/components/ApprovalWall';
import { useAuth } from '@/lib/auth';

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
  const [signals, setSignals] = useState<Signal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [newSignalCount, setNewSignalCount] = useState(0);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const { generateText } = useTextGeneration();

  const canAccess = isAdmin || isApproved;

  // Generate AI insights for a single signal
  const generateInsightForSignal = useCallback(
    async (signal: Signal): Promise<string> => {
      try {
        const prompt = `You are Voltrix AI, a professional forex trading analyst. Given this trade signal for ${signal.symbol} (${signal.type} at ${signal.entry}, SL: ${signal.sl}, TP: ${signal.tp}), with the technical reason "${signal.technicalReason || 'Technical Analysis'}", provide a concise 1-2 sentence AI insight explaining the technical logic and market context. Be specific about indicators and price action. Keep it under 150 characters.`;
        const result = await generateText(prompt);
        return result || '';
      } catch {
        return '';
      }
    },
    [generateText]
  );

  // Generate AI insights for signals that don't have them
  const generateAIInsights = useCallback(
    async (signalList: Signal[]) => {
      if (!isAdmin) return signalList;

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
              // Only admin is allowed to update signals in Supabase.
              supabase
                .from('signals')
                .update({ ai_insight: insight })
                .eq('id', signal.id)
                .then(
                  () => {},
                  () => {}
                );
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
    },
    [generateInsightForSignal, isAdmin]
  );

  // Fetch signals from Supabase
  const fetchSignals = useCallback(async () => {
    if (!canAccess) return;

    const { data, error } = await supabase
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const e = new Error(error.message || 'Failed to fetch signals') as Error & { code?: string };
      e.code = (error as { code?: string }).code;
      throw e;
    }

    const converted = (data ?? []).map(dbToSignal);
    converted.forEach((s) => seenIdsRef.current.add(s.id));
    setSignals(converted);
    setIsLive(converted.length > 0);

    await generateAIInsights(converted);
  }, [canAccess, generateAIInsights]);

  // Subscribe to real-time signal changes
  const subscribeToSignals = useCallback(() => {
    if (!canAccess) return;

    if (channelRef.current) {
      void channelRef.current.unsubscribe().catch(() => {});
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

          if (!seenIdsRef.current.has(newSignal.id)) {
            seenIdsRef.current.add(newSignal.id);
            setNewSignalCount((c) => c + 1);
            setSignals((prev) => [newSignal, ...prev]);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [canAccess]);

  // Load followed IDs
  const loadFollowed = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await fetchUserSignals(user.id);
      setFollowedIds(new Set(data.map((x) => x.signal_id)));
    } catch {
      setFollowedIds(new Set());
    }
  }, [user?.id]);

  useEffect(() => {
    if (approvalLoading) return;
    if (!canAccess) return;

    void fetchSignals().catch(() => {
      setSignals([]);
      setIsLive(false);
    });
    subscribeToSignals();
    void loadFollowed();

    return () => {
      if (channelRef.current) {
        void channelRef.current.unsubscribe().catch(() => {});
      }
    };
  }, [fetchSignals, subscribeToSignals, loadFollowed, canAccess, approvalLoading]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchSignals().catch(() => {
        setSignals([]);
        setIsLive(false);
      }),
      loadFollowed(),
    ]);
    setRefreshing(false);
  };

  const filteredSignals = useMemo(() => {
    if (filter === 'all') return signals;
    return signals.filter((s) => s.status === filter);
  }, [signals, filter]);

  const handlePressSignal = (signal: Signal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/signal/${signal.id}`);
  };

  const handleFollow = async (signal: Signal) => {
    if (!user?.id) return;
    await followSignal(user.id, signal.id, signal.entry);
    setFollowedIds((prev) => new Set(prev).add(signal.id));
  };

  const handleUnfollow = async (signal: Signal) => {
    if (!user?.id) return;
    await unfollowSignal(user.id, signal.id);
    setFollowedIds((prev) => {
      const next = new Set(prev);
      next.delete(signal.id);
      return next;
    });
  };

  if (approvalLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.voltrixAccent} />
          <Text style={styles.loadingText}>Checking access…</Text>
        </View>
      </View>
    );
  }

  if (!canAccess) {
    return <ApprovalWall screenName="Signals" />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.voltrixAccent} />}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <View>
            <Text style={styles.title}>Signals</Text>
            <Text style={styles.subtitle}>Premium trade alerts (approved users only)</Text>
          </View>
          <View style={styles.headerRight}>
            <NewSignalChip count={newSignalCount} />
            <View style={[styles.liveIndicator, { borderColor: isLive ? Colors.voltrixAccentGlow : Colors.borderDark }]}>
              <View style={[styles.liveDot, { backgroundColor: isLive ? Colors.voltrixAccent : Colors.textTertiary }]} />
              <Text style={[styles.liveText, { color: isLive ? Colors.voltrixAccent : Colors.textTertiary }]}>
                {isLive ? 'LIVE' : 'OFF'}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            {filterOptions.map((opt) => {
              const active = opt.key === filter;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setFilter(opt.key)}
                  style={[styles.filterBtn, active && styles.filterBtnActive]}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {filteredSignals.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(140).duration(500)} style={styles.emptyState}>
            <Ionicons name="sparkles-outline" size={22} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No signals yet</Text>
            <Text style={styles.emptyText}>When the admin publishes signals, they'll appear here.</Text>
          </Animated.View>
        ) : (
          <View style={styles.list}>
            {filteredSignals.map((signal, idx) => (
              <Animated.View key={signal.id} entering={FadeInDown.delay(140 + idx * 35).duration(450)}>
                <EnhancedSignalCard
                  signal={signal}
                  onPress={() => handlePressSignal(signal)}
                  isFollowed={followedIds.has(signal.id)}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                />
              </Animated.View>
            ))}
          </View>
        )}
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
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 10,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  filterRow: {
    marginBottom: 10,
  },
  filterContent: {
    gap: 8,
    paddingVertical: 6,
  },
  filterBtn: {
    borderWidth: 1,
    borderColor: Colors.borderDark,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  filterBtnActive: {
    borderColor: Colors.voltrixAccentGlow,
    backgroundColor: Colors.voltrixAccentDim,
  },
  filterText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  filterTextActive: {
    color: Colors.voltrixAccent,
  },
  list: {
    gap: 12,
    paddingTop: 10,
  },
  signalCardWrapper: {
    position: 'relative',
  },
  verifiedOverlay: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 10,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.neonGreenDim,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  verifiedText: {
    color: Colors.neonGreen,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  newSignalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  newDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: Colors.voltrixAccent,
  },
  newSignalText: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  emptyState: {
    paddingTop: 70,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
});