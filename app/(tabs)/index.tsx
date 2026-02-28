import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native-reanimated';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';
import { mockAccount, mockPositions, AccountData, Position } from '@/constants/mockData';
import GlassContainer from '@/components/GlassContainer';
import StatChip from '@/components/StatChip';
import SparklineChart from '@/components/SparklineChart';
import PulseBackground from '@/components/PulseBackground';

function formatCurrency(value: number, decimals = 2): string {
  const sign = value >= 0 ? '' : '-';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
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

export default function HealthScreen() {
  const insets = useSafeAreaInsets();
  const [account, setAccount] = useState<AccountData>(mockAccount);
  const [positions, setPositions] = useState<Position[]>(mockPositions);
  const [refreshing, setRefreshing] = useState(false);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
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
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

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
            tintColor={Colors.neonGreen}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <View>
            <Text style={styles.greeting}>Health Center</Text>
            <Text style={styles.headerSubtitle}>Live Portfolio Monitor</Text>
          </View>
          <Pressable
            style={styles.notificationBtn}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} />
            <View style={styles.notifDot} />
          </Pressable>
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
              color={Colors.neonGreen}
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
    alignItems: 'center',
  },
  greeting: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: Colors.textTertiary,
    fontSize: 13,
    marginTop: 2,
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
    backgroundColor: Colors.neonGreen,
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
