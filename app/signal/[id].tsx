import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/lib/haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTextGeneration } from '@fastshot/ai';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';
import { mockSignals, generateCandlestickData, Signal } from '@/constants/mockData';
import CandlestickChart from '@/components/CandlestickChart';
import GlassContainer from '@/components/GlassContainer';

function getStatusConfig(status: Signal['status']) {
  switch (status) {
    case 'active':
      return { color: Colors.neonGreen, text: 'ACTIVE', bg: Colors.neonGreenDim };
    case 'hit_tp':
      return { color: Colors.neonGreen, text: 'TP HIT', bg: Colors.neonGreenDim };
    case 'hit_sl':
      return { color: Colors.crimsonRed, text: 'SL HIT', bg: Colors.crimsonRedDim };
    case 'pending':
      return { color: Colors.orange, text: 'PENDING', bg: Colors.orangeDim };
  }
}

export default function SignalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const { generateText } = useTextGeneration();

  const signal = mockSignals.find((s) => s.id === id);

  const chartData = useMemo(() => {
    if (!signal) return [];
    const basePrice = signal.entry;
    const volatility = basePrice > 100 ? 15 : 0.003;
    return generateCandlestickData(basePrice, volatility, 60);
  }, [signal]);

  useEffect(() => {
    if (!signal) return;
    const fetchAI = async () => {
      setLoadingAI(true);
      try {
        const prompt = `You are Voltrix AI, a senior forex trading analyst for the Voltrix platform. Analyze this trade signal in detail:
- Pair: ${signal.symbol}
- Direction: ${signal.type}
- Entry: ${signal.entry}
- Stop Loss: ${signal.sl}
- Take Profit: ${signal.tp}
- Technical Pattern: ${signal.technicalReason}
- Status: ${signal.status}

Provide a detailed 3-4 sentence professional analysis covering:
1. The technical setup and why this entry point was chosen
2. Risk/reward assessment
3. Key support/resistance levels to monitor
Keep it concise and actionable.`;

        const result = await generateText(prompt);
        if (result) {
          setAiAnalysis(result);
        }
      } catch {
        setAiAnalysis('AI analysis temporarily unavailable. Please try again later.');
      } finally {
        setLoadingAI(false);
      }
    };

    fetchAI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal?.id]);

  if (!signal) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={Colors.textTertiary} />
          <Text style={styles.errorText}>Signal not found</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const statusConfig = getStatusConfig(signal.status);
  const isBuy = signal.type === 'BUY';
  const riskPips = Math.abs(signal.entry - signal.sl);
  const rewardPips = Math.abs(signal.tp - signal.entry);
  const rrRatio = riskPips > 0 ? (rewardPips / riskPips).toFixed(1) : 'N/A';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Custom Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={styles.headerBackBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Signal Detail</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Signal Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.signalHeader}>
          <View style={styles.signalHeaderLeft}>
            <View style={styles.symbolRow}>
              <View style={[styles.typeBadge, {
                backgroundColor: isBuy ? Colors.neonGreenDim : Colors.crimsonRedDim,
              }]}>
                <Ionicons
                  name={isBuy ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={isBuy ? Colors.neonGreen : Colors.crimsonRed}
                />
                <Text style={[styles.typeText, { color: isBuy ? Colors.neonGreen : Colors.crimsonRed }]}>
                  {signal.type}
                </Text>
              </View>
              <Text style={styles.symbolText}>{signal.symbol}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.text}</Text>
            </View>
          </View>
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceLabel}>Confidence</Text>
            <Text style={[styles.confidenceValue, {
              color: signal.confidence >= 80 ? Colors.neonGreen : signal.confidence >= 65 ? Colors.orange : Colors.textSecondary,
              fontFamily: Fonts.mono,
            }]}>
              {signal.confidence}%
            </Text>
          </View>
        </Animated.View>

        {/* Price Levels */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <GlassContainer>
            <Text style={styles.sectionLabel}>PRICE LEVELS</Text>
            <View style={styles.priceGrid}>
              <View style={styles.priceBox}>
                <Text style={styles.priceBoxLabel}>ENTRY</Text>
                <Text style={[styles.priceBoxValue, { fontFamily: Fonts.mono }]}>
                  {signal.entry.toFixed(signal.entry > 100 ? 2 : 5)}
                </Text>
              </View>
              <View style={[styles.priceBox, { borderColor: Colors.crimsonRedDim }]}>
                <Text style={[styles.priceBoxLabel, { color: Colors.crimsonRed }]}>STOP LOSS</Text>
                <Text style={[styles.priceBoxValue, { color: Colors.crimsonRed, fontFamily: Fonts.mono }]}>
                  {signal.sl.toFixed(signal.sl > 100 ? 2 : 5)}
                </Text>
              </View>
              <View style={[styles.priceBox, { borderColor: Colors.neonGreenDim }]}>
                <Text style={[styles.priceBoxLabel, { color: Colors.neonGreen }]}>TAKE PROFIT</Text>
                <Text style={[styles.priceBoxValue, { color: Colors.neonGreen, fontFamily: Fonts.mono }]}>
                  {signal.tp.toFixed(signal.tp > 100 ? 2 : 5)}
                </Text>
              </View>
            </View>

            <View style={styles.rrRow}>
              <View style={styles.rrItem}>
                <Text style={styles.rrLabel}>Risk</Text>
                <Text style={[styles.rrValue, { color: Colors.crimsonRed, fontFamily: Fonts.mono }]}>
                  {(riskPips * (signal.entry > 100 ? 1 : 10000)).toFixed(1)} pips
                </Text>
              </View>
              <View style={styles.rrDivider} />
              <View style={styles.rrItem}>
                <Text style={styles.rrLabel}>Reward</Text>
                <Text style={[styles.rrValue, { color: Colors.neonGreen, fontFamily: Fonts.mono }]}>
                  {(rewardPips * (signal.entry > 100 ? 1 : 10000)).toFixed(1)} pips
                </Text>
              </View>
              <View style={styles.rrDivider} />
              <View style={styles.rrItem}>
                <Text style={styles.rrLabel}>R:R Ratio</Text>
                <Text style={[styles.rrValue, { color: Colors.blue, fontFamily: Fonts.mono }]}>
                  1:{rrRatio}
                </Text>
              </View>
            </View>
          </GlassContainer>
        </Animated.View>

        {/* Chart Snapshot */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={styles.sectionTitle}>Chart Snapshot</Text>
          <View style={styles.chartCard}>
            <CandlestickChart data={chartData} height={300} showMA />
          </View>
        </Animated.View>

        {/* Technical Reason */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <View style={styles.techCard}>
            <View style={styles.techHeader}>
              <Ionicons name="analytics" size={16} color={Colors.orange} />
              <Text style={styles.techTitle}>Technical Pattern</Text>
            </View>
            <Text style={styles.techText}>{signal.technicalReason}</Text>
          </View>
        </Animated.View>

        {/* AI Analysis */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <View style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={14} color={Colors.voltrixAccent} />
                <Text style={styles.aiBadgeText}>Voltrix AI</Text>
              </View>
              {loadingAI && <ActivityIndicator size="small" color={Colors.voltrixAccent} />}
            </View>
            {loadingAI ? (
              <View style={styles.aiLoading}>
                <Text style={styles.aiLoadingText}>Generating analysis...</Text>
              </View>
            ) : aiAnalysis ? (
              <Text style={styles.aiText}>{aiAnalysis}</Text>
            ) : (
              <Text style={styles.aiPlaceholder}>AI analysis unavailable</Text>
            )}
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDark,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    marginTop: 8,
  },
  backBtnText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  signalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signalHeaderLeft: {
    gap: 8,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  symbolText: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confidenceContainer: {
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    padding: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  confidenceLabel: {
    color: Colors.textTertiary,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  confidenceValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  sectionLabel: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
  priceGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  priceBox: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    padding: 12,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    alignItems: 'center',
  },
  priceBoxLabel: {
    color: Colors.textTertiary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  priceBoxValue: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  rrRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rrItem: {
    flex: 1,
    alignItems: 'center',
  },
  rrDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.borderDark,
  },
  rrLabel: {
    color: Colors.textTertiary,
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 4,
  },
  rrValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  chartCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  techCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    borderLeftWidth: 3,
    borderLeftColor: Colors.orange,
  },
  techHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  techTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  techText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  aiCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.voltrixAccent,
    borderLeftWidth: 3,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.voltrixAccentDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.voltrixAccentGlow,
  },
  aiBadgeText: {
    color: Colors.voltrixAccent,
    fontSize: 12,
    fontWeight: '700',
  },
  aiLoading: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  aiLoadingText: {
    color: Colors.textTertiary,
    fontSize: 13,
  },
  aiText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  aiPlaceholder: {
    color: Colors.textTertiary,
    fontSize: 13,
    fontStyle: 'italic',
  },
});
