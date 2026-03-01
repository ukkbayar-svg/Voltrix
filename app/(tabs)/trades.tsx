import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useAuth } from '@fastshot/auth';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';
import { supabase, DbUserSignal, DbSignal, fetchUserSignals, unfollowSignal } from '@/lib/supabase';
import { useApproval } from '@/lib/useApproval';
import ApprovalWall from '@/components/ApprovalWall';
import * as Haptics from '@/lib/haptics';

interface FollowedTrade {
  id: string;
  signalId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  sl: number;
  tp: number;
  status: string;
  followedAt: string;
  virtualPL: number;
  plPercent: number;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${minutes}m ago`;
}

function PLBadge({ pl, plPercent }: { pl: number; plPercent: number }) {
  const isPositive = pl >= 0;
  const color = isPositive ? Colors.neonGreen : Colors.crimsonRed;
  const bg = isPositive ? Colors.neonGreenDim : Colors.crimsonRedDim;
  const border = isPositive ? Colors.neonGreenGlow : 'rgba(255,59,92,0.3)';

  return (
    <View style={[styles.plBadge, { backgroundColor: bg, borderColor: border }]}>
      <Ionicons
        name={isPositive ? 'trending-up' : 'trending-down'}
        size={13}
        color={color}
      />
      <View>
        <Text style={[styles.plValue, { color, fontFamily: Fonts.mono }]}>
          {isPositive ? '+' : ''}{pl.toFixed(2)}
        </Text>
        <Text style={[styles.plPercent, { color }]}>
          {isPositive ? '+' : ''}{plPercent.toFixed(2)}%
        </Text>
      </View>
    </View>
  );
}

function TradeCard({
  trade,
  onUnfollow,
}: {
  trade: FollowedTrade;
  onUnfollow: (trade: FollowedTrade) => void;
}) {
  const isBuy = trade.type === 'BUY';
  const isPositive = trade.virtualPL >= 0;

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={[
      styles.tradeCard,
      { borderLeftColor: isPositive ? Colors.neonGreen : Colors.crimsonRed, borderLeftWidth: 3 },
    ]}>
      <View style={styles.tradeHeader}>
        <View style={styles.tradeSymbolRow}>
          <View style={[styles.typeBadge, { backgroundColor: isBuy ? Colors.neonGreenDim : Colors.crimsonRedDim }]}>
            <Ionicons
              name={isBuy ? 'trending-up' : 'trending-down'}
              size={11}
              color={isBuy ? Colors.neonGreen : Colors.crimsonRed}
            />
            <Text style={[styles.typeText, { color: isBuy ? Colors.neonGreen : Colors.crimsonRed }]}>
              {trade.type}
            </Text>
          </View>
          <Text style={styles.tradeSymbol}>{trade.symbol}</Text>
        </View>
        <PLBadge pl={trade.virtualPL} plPercent={trade.plPercent} />
      </View>

      <View style={styles.tradePriceRow}>
        <View style={styles.tradePriceItem}>
          <Text style={styles.tradePriceLabel}>ENTRY</Text>
          <Text style={[styles.tradePriceValue, { fontFamily: Fonts.mono }]}>
            {trade.entryPrice.toFixed(trade.entryPrice > 100 ? 2 : 4)}
          </Text>
        </View>
        <View style={[styles.tradePriceItem, styles.tradePriceCurrent]}>
          <Text style={styles.tradePriceLabel}>CURRENT</Text>
          <Text style={[styles.tradePriceValue, { fontFamily: Fonts.mono, color: isPositive ? Colors.neonGreen : Colors.crimsonRed }]}>
            {trade.currentPrice.toFixed(trade.currentPrice > 100 ? 2 : 4)}
          </Text>
        </View>
        <View style={styles.tradePriceItem}>
          <Text style={styles.tradePriceLabel}>SL</Text>
          <Text style={[styles.tradePriceValue, { fontFamily: Fonts.mono, color: Colors.crimsonRed, fontSize: 12 }]}>
            {trade.sl.toFixed(trade.sl > 100 ? 2 : 4)}
          </Text>
        </View>
        <View style={styles.tradePriceItem}>
          <Text style={styles.tradePriceLabel}>TP</Text>
          <Text style={[styles.tradePriceValue, { fontFamily: Fonts.mono, color: Colors.neonGreen, fontSize: 12 }]}>
            {trade.tp.toFixed(trade.tp > 100 ? 2 : 4)}
          </Text>
        </View>
      </View>

      <View style={styles.tradeFooter}>
        <Text style={styles.tradeTime}>{formatTime(trade.followedAt)}</Text>
        <Pressable
          onPress={() => onUnfollow(trade)}
          style={({ pressed }) => [styles.unfollowBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="close-circle-outline" size={13} color={Colors.crimsonRed} />
          <Text style={styles.unfollowText}>UNFOLLOW</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function TradesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isApproved, isAdmin, isLoading: approvalLoading } = useApproval();
  const [trades, setTrades] = useState<FollowedTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const priceSimRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulate live price movements
  const simulatePriceUpdates = useCallback((tradeList: FollowedTrade[]) => {
    if (priceSimRef.current) clearInterval(priceSimRef.current);

    priceSimRef.current = setInterval(() => {
      setTrades((prev) =>
        prev.map((t) => {
          const volatility = t.entryPrice > 100 ? t.entryPrice * 0.0003 : t.entryPrice * 0.0004;
          const delta = (Math.random() - 0.48) * volatility;
          const newPrice = Math.max(0.0001, t.currentPrice + delta);
          const priceDiff = newPrice - t.entryPrice;
          const virtualPL = t.type === 'BUY' ? priceDiff * 10000 : -priceDiff * 10000;
          const plPercent = (priceDiff / t.entryPrice) * 100 * (t.type === 'BUY' ? 1 : -1);

          return {
            ...t,
            currentPrice: newPrice,
            virtualPL,
            plPercent,
          };
        })
      );
    }, 2000);
  }, []);

  const loadTrades = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const userSigs = await fetchUserSignals(user.id);
      if (userSigs.length === 0) {
        setTrades([]);
        setIsLoading(false);
        return;
      }

      // Fetch the actual signal details
      const signalIds = userSigs.map((s) => s.signal_id);
      const { data: signalData } = await supabase
        .from('signals')
        .select('*')
        .in('id', signalIds);

      if (!signalData) {
        setTrades([]);
        setIsLoading(false);
        return;
      }

      const signalMap = new Map<string, DbSignal>(
        signalData.map((s: DbSignal) => [s.id, s])
      );

      const tradeList: FollowedTrade[] = userSigs
        .filter((us) => signalMap.has(us.signal_id))
        .map((us: DbUserSignal) => {
          const sig = signalMap.get(us.signal_id)!;
          const entryPrice = Number(us.entry_price);
          const currentPrice = Number(sig.entry); // Start at signal entry, sim will vary
          const priceDiff = currentPrice - entryPrice;
          const virtualPL = sig.type === 'BUY' ? priceDiff * 10000 : -priceDiff * 10000;
          const plPercent = (priceDiff / entryPrice) * 100 * (sig.type === 'BUY' ? 1 : -1);

          return {
            id: us.id,
            signalId: us.signal_id,
            symbol: sig.symbol,
            type: sig.type,
            entryPrice,
            currentPrice,
            sl: Number(sig.sl),
            tp: Number(sig.tp),
            status: sig.status,
            followedAt: us.followed_at,
            virtualPL,
            plPercent,
          };
        });

      setTrades(tradeList);
      simulatePriceUpdates(tradeList);
    } catch {
      setTrades([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, simulatePriceUpdates]);

  useEffect(() => {
    loadTrades();
    return () => {
      if (priceSimRef.current) clearInterval(priceSimRef.current);
    };
  }, [loadTrades]);

  const handleUnfollow = useCallback(async (trade: FollowedTrade) => {
    if (!user?.id) return;
    try {
      await unfollowSignal(user.id, trade.signalId);
      setTrades((prev) => prev.filter((t) => t.signalId !== trade.signalId));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Silently fail
    }
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await loadTrades();
    setRefreshing(false);
  }, [loadTrades]);

  if (!approvalLoading && !isApproved && !isAdmin) {
    return <ApprovalWall screenName="My Trades" />;
  }

  // Summary stats
  const totalPL = trades.reduce((sum, t) => sum + t.virtualPL, 0);
  const winners = trades.filter((t) => t.virtualPL > 0).length;
  const totalTrades = trades.length;

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
            <Text style={styles.title}>My Trades</Text>
            <Text style={styles.subtitle}>Paper Trading Portfolio</Text>
          </View>
          <View style={styles.liveBadge}>
            <Animated.View entering={FadeInRight.duration(400)} style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE P/L</Text>
          </View>
        </Animated.View>

        {/* Summary Cards */}
        {totalTrades > 0 && (
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.summaryRow}>
            <View style={[styles.summaryCard, { borderColor: totalPL >= 0 ? Colors.neonGreenGlow : 'rgba(255,59,92,0.3)' }]}>
              <Text style={styles.summaryLabel}>TOTAL P/L</Text>
              <Text style={[styles.summaryValue, { color: totalPL >= 0 ? Colors.neonGreen : Colors.crimsonRed, fontFamily: Fonts.mono }]}>
                {totalPL >= 0 ? '+' : ''}{totalPL.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>POSITIONS</Text>
              <Text style={[styles.summaryValue, { color: Colors.voltrixAccent }]}>{totalTrades}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>WIN RATE</Text>
              <Text style={[styles.summaryValue, { color: Colors.neonGreen, fontFamily: Fonts.mono }]}>
                {totalTrades > 0 ? Math.round((winners / totalTrades) * 100) : 0}%
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Trades List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.voltrixAccent} />
            <Text style={styles.loadingText}>Loading trades...</Text>
          </View>
        ) : trades.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="wallet-outline" size={52} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Active Trades</Text>
            <Text style={styles.emptySubtext}>
              Go to the Signals tab and press{'\n'}
              <Text style={{ color: Colors.voltrixAccent }}>FOLLOW</Text> on any signal to start paper trading
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.tradesList}>
            {trades.map((trade, index) => (
              <Animated.View key={trade.id} entering={FadeInDown.delay(200 + index * 60).duration(400)}>
                <TradeCard trade={trade} onUnfollow={handleUnfollow} />
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
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.neonGreenDim,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.neonGreenGlow,
    marginTop: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.neonGreen,
    shadowColor: Colors.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  liveText: {
    color: Colors.neonGreen,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: Fonts.mono,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  summaryLabel: {
    color: Colors.textTertiary,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: Fonts.mono,
  },
  summaryValue: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  tradesList: {
    gap: 2,
  },
  tradeCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tradeSymbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tradeSymbol: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  plBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  plValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  plPercent: {
    fontSize: 10,
    fontWeight: '500',
  },
  tradePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDark,
  },
  tradePriceItem: {
    alignItems: 'center',
  },
  tradePriceCurrent: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  tradePriceLabel: {
    color: Colors.textTertiary,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 3,
    fontFamily: Fonts.mono,
  },
  tradePriceValue: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  tradeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tradeTime: {
    color: Colors.textTertiary,
    fontSize: 11,
  },
  unfollowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255,59,92,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,92,0.2)',
  },
  unfollowText: {
    color: Colors.crimsonRed,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Fonts.mono,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    color: Colors.textTertiary,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderDark,
    marginBottom: 8,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtext: {
    color: Colors.textTertiary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
});
