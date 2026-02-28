import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';
import { mockAccount, mockPositions, AccountData, Position } from '@/constants/mockData';
import GlassContainer from '@/components/GlassContainer';
import StatChip from '@/components/StatChip';
import SparklineChart from '@/components/SparklineChart';
import PulseBackground from '@/components/PulseBackground';
import { supabase, DbAccountData, DbPosition } from '@/lib/supabase';
import { useAuth } from '@fastshot/auth';

function formatCurrency(value: number, decimals = 2): string {
  const sign = value >= 0 ? '' : '-';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

// Network Status Indicator — pulsing violet dot
function NetworkStatusIndicator({ isLive }: { isLive: boolean }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isLive) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.8, { duration: 800, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        false
      );
    } else {
      scale.value = 1;
      opacity.value = 0.4;
    }
  }, [isLive, scale, opacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.networkStatusContainer}>
      <Animated.View style={[styles.networkPulseRing, pulseStyle, { borderColor: isLive ? Colors.voltrixAccent : Colors.textTertiary }]} />
      <View style={[styles.networkDot, { backgroundColor: isLive ? Colors.voltrixAccent : Colors.textTertiary }]} />
      <Text style={[styles.networkText, { color: isLive ? Colors.voltrixAccent : Colors.textTertiary }]}>
        {isLive ? 'LIVE' : 'OFF'}
      </Text>
    </View>
  );
}

function PositionRow({ position }: { position: Position }) {
  const isProfit = position.profit >= 0;

  return (
    <View style={styles.positionRow}>
      <View style={styles.positionLeft}>
        <View style={styles.positionHeader}>
          <Text style={styles.positionSymbol}>{position.symbol}</Text>
          <View style={[styles.positionTypeBadge, {
            backgroundColor: position.type === 'BUY' ? Colors.neonGreenDim : Colors.crimsonRedDim,
          }]}>
            <Text style={[styles.positionTypeText, {
              color: position.type === 'BUY' ? Colors.neonGreen : Colors.crimsonRed,
            }]}>
              {position.type}
            </Text>
          </View>
        </View>
        <Text style={styles.positionLots}>{position.lots} lots</Text>
      </View>
      <SparklineChart data={position.sparkline} width={72} height={28} />
      <View style={styles.positionRight}>
        <Text style={[styles.positionProfit, {
          color: isProfit ? Colors.neonGreen : Colors.crimsonRed,
          fontFamily: Fonts.mono,
        }]}>
          {isProfit ? '+' : ''}{formatCurrency(position.profit)}
        </Text>
        <Text style={[styles.positionPrice, { fontFamily: Fonts.mono }]}>
          {position.currentPrice.toFixed(position.currentPrice > 100 ? 2 : 4)}
        </Text>
      </View>
    </View>
  );
}

// Convert DB account data to AccountData format
function dbToAccountData(db: DbAccountData): AccountData {
  return {
    balance: Number(db.balance),
    equity: Number(db.equity),
    floatingPL: Number(db.floating_pl),
    marginLevel: Number(db.margin_level),
    usedMargin: Number(db.used_margin),
    freeMargin: Number(db.free_margin),
    dailyDrawdown: Number(db.daily_drawdown),
    maxDailyDrawdown: Number(db.max_daily_drawdown),
    maxAccountDrawdown: Number(db.max_account_drawdown),
    currentAccountDrawdown: Number(db.current_account_drawdown),
  };
}

// Convert DB position to Position format
function dbToPosition(db: DbPosition): Position {
  const sparkline = Array.isArray(db.sparkline) && db.sparkline.length > 0
    ? db.sparkline.map(Number)
    : generateFallbackSparkline(db.current_price);
  return {
    id: db.id,
    symbol: db.symbol,
    type: db.type,
    lots: Number(db.lots),
    openPrice: Number(db.open_price),
    currentPrice: Number(db.current_price),
    profit: Number(db.profit),
    sparkline,
  };
}

function generateFallbackSparkline(base: number): number[] {
  const data: number[] = [];
  let current = base;
  for (let i = 0; i < 24; i++) {
    current += (Math.random() - 0.48) * base * 0.0008;
    data.push(current);
  }
  return data;
}

export default function CommandScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [account, setAccount] = useState<AccountData>(mockAccount);
  const [positions, setPositions] = useState<Position[]>(mockPositions);
  const [refreshing, setRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [useSupabase, setUseSupabase] = useState(false);
  const accountIdRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Initialize account data in Supabase for new users
  const initializeAccountData = useCallback(async (userId: string) => {
    try {
      const { data: existing } = await supabase
        .from('account_data')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        const { data: created } = await supabase
          .from('account_data')
          .insert({
            user_id: userId,
            balance: mockAccount.balance,
            equity: mockAccount.equity,
            floating_pl: mockAccount.floatingPL,
            margin_level: mockAccount.marginLevel,
            used_margin: mockAccount.usedMargin,
            free_margin: mockAccount.freeMargin,
            daily_drawdown: mockAccount.dailyDrawdown,
            max_daily_drawdown: mockAccount.maxDailyDrawdown,
            max_account_drawdown: mockAccount.maxAccountDrawdown,
            current_account_drawdown: mockAccount.currentAccountDrawdown,
          })
          .select()
          .single();
        if (created) {
          accountIdRef.current = created.id;
          setAccount(dbToAccountData(created as DbAccountData));
        }
      } else {
        accountIdRef.current = existing.id;
      }
    } catch {
      // Table may not exist yet, use mock data
    }
  }, []);

  // Fetch live account data
  const fetchAccountData = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('account_data')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        accountIdRef.current = data.id;
        setAccount(dbToAccountData(data as DbAccountData));
        setUseSupabase(true);
        return true;
      }
    } catch {
      // Use mock data as fallback
    }
    return false;
  }, []);

  // Fetch live positions
  const fetchPositions = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('opened_at', { ascending: false });

      if (data && data.length > 0) {
        setPositions(data.map(dbToPosition));
        return true;
      }
    } catch {
      // Use mock positions as fallback
    }
    return false;
  }, []);

  // Initialize positions for new users
  const initializePositions = useCallback(async (userId: string) => {
    try {
      const { data: existing } = await supabase
        .from('positions')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (!existing || existing.length === 0) {
        const positionsToInsert = mockPositions.map((p) => ({
          user_id: userId,
          symbol: p.symbol,
          type: p.type,
          lots: p.lots,
          open_price: p.openPrice,
          current_price: p.currentPrice,
          profit: p.profit,
          sparkline: p.sparkline,
          is_active: true,
        }));
        await supabase.from('positions').insert(positionsToInsert);
      }
    } catch {
      // Table may not exist yet
    }
  }, []);

  // Subscribe to real-time account data updates
  const subscribeToAccountData = useCallback((userId: string) => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    const channel = supabase
      .channel(`account-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'account_data',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setAccount(dbToAccountData(payload.new as DbAccountData));
          setIsLive(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'positions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setPositions((prev) =>
            prev.map((p) =>
              p.id === payload.new.id ? dbToPosition(payload.new as DbPosition) : p
            )
          );
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
  }, []);

  // Simulate live P/L updates to Supabase (or locally if no DB)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      if (useSupabase && accountIdRef.current) {
        // Update Supabase with new live data
        const plChange = (Math.random() - 0.48) * 50;
        const newPL = account.floatingPL + plChange;
        const newEquity = account.balance + newPL;

        await supabase
          .from('account_data')
          .update({
            floating_pl: Number(newPL.toFixed(2)),
            equity: Number(newEquity.toFixed(2)),
            updated_at: new Date().toISOString(),
          })
          .eq('id', accountIdRef.current);
      } else {
        // Local simulation fallback
        setAccount((prev) => {
          const plChange = (Math.random() - 0.48) * 50;
          const newPL = prev.floatingPL + plChange;
          return {
            ...prev,
            floatingPL: Number(newPL.toFixed(2)),
            equity: Number((prev.balance + newPL).toFixed(2)),
          };
        });

        setPositions((prev) =>
          prev.map((pos) => {
            const change = (Math.random() - 0.48) * (pos.currentPrice * 0.0002);
            const newPrice = pos.currentPrice + change;
            const newProfit = pos.type === 'BUY'
              ? (newPrice - pos.openPrice) * pos.lots * 100000
              : (pos.openPrice - newPrice) * pos.lots * 100000;
            return {
              ...pos,
              currentPrice: Number(newPrice.toFixed(5)),
              profit: Number(newProfit.toFixed(2)),
              sparkline: [...pos.sparkline.slice(1), newPrice],
            };
          })
        );
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [user, useSupabase, account.floatingPL, account.balance]);

  // Load live data on mount
  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      const hasAccount = await fetchAccountData(user.id);
      if (!hasAccount) {
        await initializeAccountData(user.id);
      }
      const hasPositions = await fetchPositions(user.id);
      if (!hasPositions) {
        await initializePositions(user.id);
        await fetchPositions(user.id);
      }
      subscribeToAccountData(user.id);
    };

    load();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [user?.id, fetchAccountData, fetchPositions, initializeAccountData, initializePositions, subscribeToAccountData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (user?.id) {
      await Promise.all([fetchAccountData(user.id), fetchPositions(user.id)]);
    }
    setRefreshing(false);
  }, [user?.id, fetchAccountData, fetchPositions]);

  const isPositivePL = account.floatingPL >= 0;
  const totalProfit = positions.reduce((sum, p) => sum + p.profit, 0);

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
            <Text style={styles.greeting}>Command</Text>
            <Text style={styles.headerSubtitle}>Live Portfolio Monitor</Text>
          </View>
          <View style={styles.headerRight}>
            <NetworkStatusIndicator isLive={isLive} />
            <Pressable
              style={styles.notificationBtn}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} />
              <View style={styles.notifDot} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Balance & Equity */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <GlassContainer style={styles.balanceCard}>
            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>BALANCE</Text>
                <Text style={[styles.balanceValue, { fontFamily: Fonts.mono }]}>
                  {formatCurrency(account.balance)}
                </Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>EQUITY</Text>
                <Text style={[styles.balanceValue, { fontFamily: Fonts.mono, color: isPositivePL ? Colors.neonGreen : Colors.crimsonRed }]}>
                  {formatCurrency(account.equity)}
                </Text>
              </View>
            </View>
          </GlassContainer>
        </Animated.View>

        {/* Floating P/L */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <PulseBackground isPositive={isPositivePL} style={styles.plCard}>
            <View style={styles.plContent}>
              <View style={styles.plHeader}>
                <Ionicons
                  name={isPositivePL ? 'trending-up' : 'trending-down'}
                  size={20}
                  color={isPositivePL ? Colors.neonGreen : Colors.crimsonRed}
                />
                <Text style={styles.plLabel}>Floating P/L</Text>
                {isLive && (
                  <View style={styles.liveTag}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.plValue, {
                color: isPositivePL ? Colors.neonGreen : Colors.crimsonRed,
                fontFamily: Fonts.mono,
              }]}>
                {isPositivePL ? '+' : ''}{formatCurrency(account.floatingPL)}
              </Text>
              <Text style={[styles.plPercent, {
                color: isPositivePL ? Colors.neonGreen : Colors.crimsonRed,
                fontFamily: Fonts.mono,
              }]}>
                {isPositivePL ? '+' : ''}{((account.floatingPL / account.balance) * 100).toFixed(2)}%
              </Text>
            </View>
          </PulseBackground>
        </Animated.View>

        {/* Quick Stats */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsRow}>
            <StatChip
              label="Margin Lvl"
              value={`${account.marginLevel.toFixed(0)}%`}
              color={account.marginLevel > 500 ? Colors.neonGreen : Colors.orange}
              icon={<Ionicons name="layers-outline" size={12} color={Colors.textTertiary} />}
            />
            <StatChip
              label="Used Margin"
              value={formatCurrency(account.usedMargin)}
              icon={<Ionicons name="lock-closed-outline" size={12} color={Colors.textTertiary} />}
            />
            <StatChip
              label="Free Margin"
              value={formatCurrency(account.freeMargin)}
              color={Colors.voltrixAccent}
              icon={<Ionicons name="wallet-outline" size={12} color={Colors.textTertiary} />}
            />
          </View>
        </Animated.View>

        {/* Active Positions */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Positions</Text>
            <View style={[styles.totalBadge, {
              backgroundColor: totalProfit >= 0 ? Colors.neonGreenDim : Colors.crimsonRedDim,
            }]}>
              <Text style={[styles.totalText, {
                color: totalProfit >= 0 ? Colors.neonGreen : Colors.crimsonRed,
                fontFamily: Fonts.mono,
              }]}>
                {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
              </Text>
            </View>
          </View>
          <View style={styles.positionsContainer}>
            {positions.map((position) => (
              <PositionRow key={position.id} position={position} />
            ))}
          </View>
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
  greeting: {
    color: Colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    color: Colors.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  networkStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.cardBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    position: 'relative',
  },
  networkPulseRing: {
    position: 'absolute',
    left: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  networkDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  networkText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: Fonts.mono,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.voltrixAccent,
    shadowColor: Colors.voltrixAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  balanceCard: {
    marginTop: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.borderDark,
  },
  balanceLabel: {
    color: Colors.textTertiary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
  },
  balanceValue: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  plCard: {
    padding: 0,
  },
  plContent: {
    padding: 20,
    alignItems: 'center',
  },
  plHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  plLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.voltrixAccentDim,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.voltrixAccentGlow,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.voltrixAccent,
  },
  liveText: {
    color: Colors.voltrixAccent,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: Fonts.mono,
  },
  plValue: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  plPercent: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  totalText: {
    fontSize: 12,
    fontWeight: '700',
  },
  positionsContainer: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    overflow: 'hidden',
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDark,
  },
  positionLeft: {
    flex: 1,
  },
  positionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  positionSymbol: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  positionTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  positionTypeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  positionLots: {
    color: Colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  positionRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  positionProfit: {
    fontSize: 14,
    fontWeight: '700',
  },
  positionPrice: {
    color: Colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
});
