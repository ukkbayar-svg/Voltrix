import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';
import { mockAccount, AccountData } from '@/constants/mockData';
import GlassContainer from '@/components/GlassContainer';
import CircularGauge from '@/components/CircularGauge';
import { supabase, DbAccountData, DbRiskAlert } from '@/lib/supabase';
import { useAuth } from '@fastshot/auth';

interface RiskAlertItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  timestamp: string;
}

function getRiskLevel(percentage: number): { level: string; color: string; icon: keyof typeof Ionicons.glyphMap } {
  if (percentage < 0.4) return { level: 'LOW', color: Colors.neonGreen, icon: 'shield-checkmark' };
  if (percentage < 0.7) return { level: 'MODERATE', color: Colors.orange, icon: 'warning' };
  return { level: 'HIGH', color: Colors.crimsonRed, icon: 'alert-circle' };
}

function ProgressBar({ value, maxValue, label, color }: {
  value: number;
  maxValue: number;
  label: string;
  color: string;
}) {
  const percentage = Math.min(value / maxValue, 1);

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={[styles.progressValue, { color, fontFamily: Fonts.mono }]}>
          {value.toFixed(1)}% / {maxValue.toFixed(1)}%
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${percentage * 100}%`,
              backgroundColor: color,
            },
          ]}
        />
        <View style={[styles.progressGlow, {
          width: `${percentage * 100}%`,
          backgroundColor: color,
        }]} />
      </View>
    </View>
  );
}

function RiskAlertCard({ icon, title, description, color, timestamp }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  timestamp: string;
}) {
  return (
    <View style={[styles.alertCard, { borderLeftColor: color }]}>
      <View style={[styles.alertIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.alertContent}>
        <Text style={styles.alertTitle}>{title}</Text>
        <Text style={styles.alertDesc}>{description}</Text>
        <Text style={styles.alertTime}>{timestamp}</Text>
      </View>
    </View>
  );
}

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function dbToRiskAlert(db: DbRiskAlert): RiskAlertItem {
  return {
    id: db.id,
    icon: db.icon as keyof typeof Ionicons.glyphMap,
    title: db.title,
    description: db.description,
    color: db.color,
    timestamp: timeAgo(db.created_at),
  };
}

const DEFAULT_ALERTS: RiskAlertItem[] = [
  {
    id: '1',
    icon: 'warning',
    title: 'Approaching Daily Limit',
    description: 'Drawdown at 46% of daily maximum. Consider reducing exposure.',
    color: Colors.orange,
    timestamp: '12 min ago',
  },
  {
    id: '2',
    icon: 'trending-down',
    title: 'Drawdown Spike Detected',
    description: 'USD/JPY position contributing -$306 to floating loss.',
    color: Colors.crimsonRed,
    timestamp: '24 min ago',
  },
  {
    id: '3',
    icon: 'shield-checkmark',
    title: 'Risk Parameters Updated',
    description: 'Daily drawdown limit set to 5.0%. Account drawdown limit set to 10.0%.',
    color: Colors.neonGreen,
    timestamp: '2h ago',
  },
];

export default function RiskScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [account, setAccount] = useState<AccountData>(mockAccount);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlertItem[]>(DEFAULT_ALERTS);
  const [refreshing, setRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const flashOpacity = useSharedValue(1);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const accountIdRef = useRef<string | null>(null);

  const dailyRisk = getRiskLevel(account.dailyDrawdown / account.maxDailyDrawdown);
  const accountRisk = getRiskLevel(account.currentAccountDrawdown / account.maxAccountDrawdown);
  const isHighRisk = dailyRisk.level === 'HIGH' || accountRisk.level === 'HIGH';

  useEffect(() => {
    if (isHighRisk) {
      flashOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      flashOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [isHighRisk, flashOpacity]);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: isHighRisk ? flashOpacity.value : 1,
  }));

  // Fetch live account data including risk metrics
  const fetchAccountData = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('account_data')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        accountIdRef.current = data.id;
        const dbData = data as DbAccountData;
        setAccount({
          balance: Number(dbData.balance),
          equity: Number(dbData.equity),
          floatingPL: Number(dbData.floating_pl),
          marginLevel: Number(dbData.margin_level),
          usedMargin: Number(dbData.used_margin),
          freeMargin: Number(dbData.free_margin),
          dailyDrawdown: Number(dbData.daily_drawdown),
          maxDailyDrawdown: Number(dbData.max_daily_drawdown),
          maxAccountDrawdown: Number(dbData.max_account_drawdown),
          currentAccountDrawdown: Number(dbData.current_account_drawdown),
        });
        setIsLive(true);
        return true;
      }
    } catch {
      // Use mock data fallback
    }
    return false;
  }, []);

  // Fetch risk alerts
  const fetchRiskAlerts = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('risk_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data && data.length > 0) {
        setRiskAlerts(data.map(dbToRiskAlert));
        return true;
      }
    } catch {
      // Use default alerts
    }
    return false;
  }, []);

  // Seed initial risk alerts for new users
  const seedRiskAlerts = useCallback(async (userId: string) => {
    try {
      const alertsToInsert = [
        {
          user_id: userId,
          icon: 'warning',
          title: 'Approaching Daily Limit',
          description: 'Drawdown at 46% of daily maximum. Consider reducing exposure.',
          color: Colors.orange,
        },
        {
          user_id: userId,
          icon: 'trending-down',
          title: 'Drawdown Spike Detected',
          description: 'USD/JPY position contributing -$306 to floating loss.',
          color: Colors.crimsonRed,
        },
        {
          user_id: userId,
          icon: 'shield-checkmark',
          title: 'Risk Parameters Updated',
          description: 'Daily drawdown limit set to 5.0%. Account drawdown limit set to 10.0%.',
          color: Colors.neonGreen,
        },
      ];
      await supabase.from('risk_alerts').insert(alertsToInsert);
    } catch {
      // Table may not exist
    }
  }, []);

  // Subscribe to real-time account_data changes
  const subscribeToAccountData = useCallback((userId: string) => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    const channel = supabase
      .channel(`risk-account-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'account_data',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const dbData = payload.new as DbAccountData;
          setAccount({
            balance: Number(dbData.balance),
            equity: Number(dbData.equity),
            floatingPL: Number(dbData.floating_pl),
            marginLevel: Number(dbData.margin_level),
            usedMargin: Number(dbData.used_margin),
            freeMargin: Number(dbData.free_margin),
            dailyDrawdown: Number(dbData.daily_drawdown),
            maxDailyDrawdown: Number(dbData.max_daily_drawdown),
            maxAccountDrawdown: Number(dbData.max_account_drawdown),
            currentAccountDrawdown: Number(dbData.current_account_drawdown),
          });
          setIsLive(true);

          // Auto-add risk alert if approaching limit
          const newDailyDD = Number(dbData.daily_drawdown);
          const maxDailyDD = Number(dbData.max_daily_drawdown);
          if (newDailyDD / maxDailyDD > 0.7) {
            const newAlert: RiskAlertItem = {
              id: Date.now().toString(),
              icon: 'alert-circle',
              title: 'High Risk Detected',
              description: `Daily drawdown at ${((newDailyDD / maxDailyDD) * 100).toFixed(0)}% of limit. Take action immediately.`,
              color: Colors.crimsonRed,
              timestamp: 'just now',
            };
            setRiskAlerts((prev) => [newAlert, ...prev.slice(0, 4)]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'risk_alerts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newAlert = dbToRiskAlert(payload.new as DbRiskAlert);
          setRiskAlerts((prev) => [newAlert, ...prev.slice(0, 4)]);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsLive(true);
      });

    channelRef.current = channel;
  }, []);

  // Simulate daily drawdown updates to Supabase
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      if (isLive && accountIdRef.current) {
        const ddChange = (Math.random() - 0.45) * 0.1;
        const newDD = Math.max(0, Math.min(account.maxDailyDrawdown, account.dailyDrawdown + ddChange));

        await supabase
          .from('account_data')
          .update({
            daily_drawdown: Number(newDD.toFixed(2)),
            updated_at: new Date().toISOString(),
          })
          .eq('id', accountIdRef.current);
      } else {
        // Local fallback
        setAccount((prev) => {
          const ddChange = (Math.random() - 0.45) * 0.1;
          const newDD = Math.max(0, Math.min(prev.maxDailyDrawdown, prev.dailyDrawdown + ddChange));
          return { ...prev, dailyDrawdown: Number(newDD.toFixed(2)) };
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user, isLive, account.dailyDrawdown, account.maxDailyDrawdown]);

  // Load live data on mount
  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      const hasAccount = await fetchAccountData(user.id);
      if (hasAccount) {
        const hasAlerts = await fetchRiskAlerts(user.id);
        if (!hasAlerts) {
          await seedRiskAlerts(user.id);
          await fetchRiskAlerts(user.id);
        }
      }
      subscribeToAccountData(user.id);
    };

    load();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [user?.id, fetchAccountData, fetchRiskAlerts, seedRiskAlerts, subscribeToAccountData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user?.id) {
      await Promise.all([fetchAccountData(user.id), fetchRiskAlerts(user.id)]);
    }
    setRefreshing(false);
  }, [user?.id, fetchAccountData, fetchRiskAlerts]);

  // Compute live daily loss as absolute dollar value
  const liveDailyLossUSD = (account.balance * account.dailyDrawdown) / 100;
  const maxDailyLossUSD = (account.balance * account.maxDailyDrawdown) / 100;

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
            <Text style={styles.title}>Risk Guard</Text>
            <Text style={styles.subtitle}>Voltrix Risk Monitor</Text>
          </View>
          <View style={styles.headerRight}>
            {/* Live indicator */}
            <View style={[styles.liveIndicator, { borderColor: isLive ? Colors.voltrixAccentGlow : Colors.borderDark }]}>
              <View style={[styles.liveDot, { backgroundColor: isLive ? Colors.voltrixAccent : Colors.textTertiary }]} />
              <Text style={[styles.liveText, { color: isLive ? Colors.voltrixAccent : Colors.textTertiary }]}>
                {isLive ? 'LIVE' : 'OFF'}
              </Text>
            </View>
            <Animated.View style={flashStyle}>
              <View style={[styles.riskBadge, { backgroundColor: `${dailyRisk.color}15`, borderColor: `${dailyRisk.color}30` }]}>
                <Ionicons name={dailyRisk.icon} size={14} color={dailyRisk.color} />
                <Text style={[styles.riskBadgeText, { color: dailyRisk.color }]}>
                  {dailyRisk.level}
                </Text>
              </View>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Daily Drawdown Gauge */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <GlassContainer style={styles.gaugeCard}>
            <Text style={styles.gaugeTitle}>Daily Drawdown</Text>
            <View style={styles.gaugeCenter}>
              <CircularGauge
                value={account.dailyDrawdown}
                maxValue={account.maxDailyDrawdown}
                size={200}
                strokeWidth={14}
                label="Daily DD"
              />
            </View>
            <View style={styles.gaugeStats}>
              <View style={styles.gaugeStat}>
                <Text style={styles.gaugeStatLabel}>Current</Text>
                <Text style={[styles.gaugeStatValue, { color: dailyRisk.color, fontFamily: Fonts.mono }]}>
                  {account.dailyDrawdown.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.gaugeStatDivider} />
              <View style={styles.gaugeStat}>
                <Text style={styles.gaugeStatLabel}>Loss Today</Text>
                <Text style={[styles.gaugeStatValue, { color: dailyRisk.color, fontFamily: Fonts.mono }]}>
                  ${liveDailyLossUSD.toFixed(0)}
                </Text>
              </View>
              <View style={styles.gaugeStatDivider} />
              <View style={styles.gaugeStat}>
                <Text style={styles.gaugeStatLabel}>Max Limit</Text>
                <Text style={[styles.gaugeStatValue, { fontFamily: Fonts.mono }]}>
                  {account.maxDailyDrawdown.toFixed(1)}%
                </Text>
              </View>
            </View>
          </GlassContainer>
        </Animated.View>

        {/* Progress Bars */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <GlassContainer style={styles.progressCard}>
            <ProgressBar
              value={account.dailyDrawdown}
              maxValue={account.maxDailyDrawdown}
              label="Max Daily Loss"
              color={dailyRisk.color}
            />
            <View style={styles.progressSpacer} />
            <ProgressBar
              value={account.currentAccountDrawdown}
              maxValue={account.maxAccountDrawdown}
              label="Max Account Drawdown"
              color={accountRisk.color}
            />
          </GlassContainer>
        </Animated.View>

        {/* Risk Metrics */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={styles.sectionTitle}>Risk Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: Colors.neonGreenDim }]}>
                <Ionicons name="cash-outline" size={18} color={Colors.neonGreen} />
              </View>
              <Text style={styles.metricLabel}>Max Daily Loss</Text>
              <Text style={[styles.metricValue, { fontFamily: Fonts.mono }]}>
                ${maxDailyLossUSD.toFixed(0)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: Colors.orangeDim }]}>
                <Ionicons name="trending-down" size={18} color={Colors.orange} />
              </View>
              <Text style={styles.metricLabel}>Max Acct DD</Text>
              <Text style={[styles.metricValue, { fontFamily: Fonts.mono }]}>
                ${((account.balance * account.maxAccountDrawdown) / 100).toFixed(0)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: Colors.blueDim }]}>
                <Ionicons name="shield-half-outline" size={18} color={Colors.blue} />
              </View>
              <Text style={styles.metricLabel}>Margin Level</Text>
              <Text style={[styles.metricValue, { color: Colors.neonGreen, fontFamily: Fonts.mono }]}>
                {account.marginLevel.toFixed(0)}%
              </Text>
            </View>
            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: Colors.crimsonRedDim }]}>
                <Ionicons name="alert-circle-outline" size={18} color={Colors.crimsonRed} />
              </View>
              <Text style={styles.metricLabel}>Current Loss</Text>
              <Text style={[styles.metricValue, { color: dailyRisk.color, fontFamily: Fonts.mono }]}>
                {account.dailyDrawdown.toFixed(2)}%
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Risk Alerts */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <Text style={styles.sectionTitle}>Recent Alerts</Text>
          <View style={styles.alertsContainer}>
            {riskAlerts.map((alert) => (
              <RiskAlertCard
                key={alert.id}
                icon={alert.icon}
                title={alert.title}
                description={alert.description}
                color={alert.color}
                timestamp={alert.timestamp}
              />
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
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
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  gaugeCard: {
    alignItems: 'center',
  },
  gaugeTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  gaugeCenter: {
    marginBottom: 20,
  },
  gaugeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  gaugeStat: {
    flex: 1,
    alignItems: 'center',
  },
  gaugeStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.borderDark,
  },
  gaugeStatLabel: {
    color: Colors.textTertiary,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  gaugeStatValue: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  progressCard: {},
  progressContainer: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.borderDark,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 4,
    opacity: 0.3,
  },
  progressSpacer: {
    height: 16,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricLabel: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  metricValue: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  alertsContainer: {
    gap: Spacing.sm,
  },
  alertCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    borderLeftWidth: 3,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
  },
  alertDesc: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  alertTime: {
    color: Colors.textTertiary,
    fontSize: 10,
  },
  orangeDim: {
    backgroundColor: Colors.orangeDim,
  },
});
