import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';
import { generateCandlestickData, assetPairs, timeframes, Timeframe } from '@/constants/mockData';
import CandlestickChart from '@/components/CandlestickChart';
import LineChart from '@/components/LineChart';

type ChartType = 'candlestick' | 'line';

export default function ChartsScreen() {
  const insets = useSafeAreaInsets();
  const [selectedPair, setSelectedPair] = useState('EUR/USD');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1h');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [showMA, setShowMA] = useState(true);

  const chartData = useMemo(() => {
    const basePrice = selectedPair === 'XAU/USD' ? 2350 : selectedPair === 'USD/JPY' ? 150 : 1.08;
    const volatility = selectedPair === 'XAU/USD' ? 15 : selectedPair === 'USD/JPY' ? 0.8 : 0.003;
    // Count varies by timeframe to simulate different data density
    const count = selectedTimeframe === '1m' ? 80 : selectedTimeframe === '5m' ? 70 : 60;
    return generateCandlestickData(basePrice, volatility, count);
  }, [selectedPair, selectedTimeframe]);

  const lineData = useMemo(() => chartData.map((d) => d.close), [chartData]);

  const handlePairPress = useCallback((pair: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPair(pair);
  }, []);

  const handleTimeframePress = useCallback((tf: Timeframe) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTimeframe(tf);
  }, []);

  const lastCandle = chartData[chartData.length - 1];
  const prevCandle = chartData[chartData.length - 2];
  const priceChange = lastCandle.close - prevCandle.close;
  const priceChangePercent = (priceChange / prevCandle.close) * 100;
  const isPositive = priceChange >= 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <View>
            <Text style={styles.title}>Charts</Text>
            <Text style={styles.subtitle}>Advanced Technical Analysis</Text>
          </View>
          <View style={styles.chartToggle}>
            <Pressable
              style={[styles.toggleBtn, chartType === 'candlestick' && styles.toggleBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setChartType('candlestick');
              }}
            >
              <Ionicons name="bar-chart" size={16} color={chartType === 'candlestick' ? Colors.neonGreen : Colors.textTertiary} />
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, chartType === 'line' && styles.toggleBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setChartType('line');
              }}
            >
              <Ionicons name="analytics" size={16} color={chartType === 'line' ? Colors.neonGreen : Colors.textTertiary} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Pair Selector */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pairRow}>
            {assetPairs.map((pair) => (
              <Pressable
                key={pair}
                style={[styles.pairChip, selectedPair === pair && styles.pairChipActive]}
                onPress={() => handlePairPress(pair)}
              >
                <Text style={[styles.pairText, selectedPair === pair && styles.pairTextActive]}>
                  {pair}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Price Info */}
        <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.priceInfo}>
          <View>
            <Text style={styles.pairTitle}>{selectedPair}</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { fontFamily: Fonts.mono }]}>
                {lastCandle.close.toFixed(lastCandle.close > 100 ? 2 : 5)}
              </Text>
              <View style={[styles.changeBadge, {
                backgroundColor: isPositive ? Colors.neonGreenDim : Colors.crimsonRedDim,
              }]}>
                <Ionicons
                  name={isPositive ? 'caret-up' : 'caret-down'}
                  size={12}
                  color={isPositive ? Colors.neonGreen : Colors.crimsonRed}
                />
                <Text style={[styles.changeText, {
                  color: isPositive ? Colors.neonGreen : Colors.crimsonRed,
                  fontFamily: Fonts.mono,
                }]}>
                  {isPositive ? '+' : ''}{priceChangePercent.toFixed(3)}%
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.ohlcRow}>
            <View style={styles.ohlcItem}>
              <Text style={styles.ohlcLabel}>O</Text>
              <Text style={[styles.ohlcValue, { fontFamily: Fonts.mono }]}>
                {lastCandle.open.toFixed(lastCandle.open > 100 ? 2 : 5)}
              </Text>
            </View>
            <View style={styles.ohlcItem}>
              <Text style={styles.ohlcLabel}>H</Text>
              <Text style={[styles.ohlcValue, { color: Colors.neonGreen, fontFamily: Fonts.mono }]}>
                {lastCandle.high.toFixed(lastCandle.high > 100 ? 2 : 5)}
              </Text>
            </View>
            <View style={styles.ohlcItem}>
              <Text style={styles.ohlcLabel}>L</Text>
              <Text style={[styles.ohlcValue, { color: Colors.crimsonRed, fontFamily: Fonts.mono }]}>
                {lastCandle.low.toFixed(lastCandle.low > 100 ? 2 : 5)}
              </Text>
            </View>
            <View style={styles.ohlcItem}>
              <Text style={styles.ohlcLabel}>C</Text>
              <Text style={[styles.ohlcValue, { fontFamily: Fonts.mono }]}>
                {lastCandle.close.toFixed(lastCandle.close > 100 ? 2 : 5)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Timeframe Selector */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.timeframeRow}>
          {timeframes.map((tf) => (
            <Pressable
              key={tf}
              style={[styles.tfBtn, selectedTimeframe === tf && styles.tfBtnActive]}
              onPress={() => handleTimeframePress(tf)}
            >
              <Text style={[styles.tfText, selectedTimeframe === tf && styles.tfTextActive]}>
                {tf}
              </Text>
            </Pressable>
          ))}
          <View style={styles.tfSpacer} />
          <Pressable
            style={[styles.indicatorBtn, showMA && styles.indicatorBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowMA(!showMA);
            }}
          >
            <Text style={[styles.indicatorText, showMA && styles.indicatorTextActive]}>MA</Text>
          </Pressable>
        </Animated.View>

        {/* Chart */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.chartContainer}>
          {chartType === 'candlestick' ? (
            <CandlestickChart data={chartData} height={380} showMA={showMA} />
          ) : (
            <LineChart data={lineData} height={380} showGrid showLabels />
          )}
        </Animated.View>

        {/* Volume Info */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.volumeRow}>
          <View style={styles.volumeItem}>
            <Text style={styles.volumeLabel}>Volume</Text>
            <Text style={[styles.volumeValue, { fontFamily: Fonts.mono }]}>
              {lastCandle.volume.toLocaleString()}
            </Text>
          </View>
          <View style={styles.volumeItem}>
            <Text style={styles.volumeLabel}>24h High</Text>
            <Text style={[styles.volumeValue, { color: Colors.neonGreen, fontFamily: Fonts.mono }]}>
              {(lastCandle.high * 1.002).toFixed(lastCandle.high > 100 ? 2 : 5)}
            </Text>
          </View>
          <View style={styles.volumeItem}>
            <Text style={styles.volumeLabel}>24h Low</Text>
            <Text style={[styles.volumeValue, { color: Colors.crimsonRed, fontFamily: Fonts.mono }]}>
              {(lastCandle.low * 0.998).toFixed(lastCandle.low > 100 ? 2 : 5)}
            </Text>
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
  title: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Colors.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
  chartToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    overflow: 'hidden',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toggleBtnActive: {
    backgroundColor: Colors.neonGreenDim,
  },
  pairRow: {
    gap: 8,
    paddingVertical: 2,
  },
  pairChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  pairChipActive: {
    backgroundColor: Colors.neonGreenDim,
    borderColor: Colors.neonGreen,
  },
  pairText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  pairTextActive: {
    color: Colors.neonGreen,
  },
  priceInfo: {
    gap: 12,
  },
  pairTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  price: {
    color: Colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  ohlcRow: {
    flexDirection: 'row',
    gap: 16,
  },
  ohlcItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ohlcLabel: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
  },
  ohlcValue: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  timeframeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tfBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tfBtnActive: {
    backgroundColor: Colors.neonGreenDim,
  },
  tfText: {
    color: Colors.textTertiary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Fonts.mono,
  },
  tfTextActive: {
    color: Colors.neonGreen,
  },
  tfSpacer: {
    flex: 1,
  },
  indicatorBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  indicatorBtnActive: {
    backgroundColor: Colors.blueDim,
    borderColor: Colors.blue,
  },
  indicatorText: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '700',
  },
  indicatorTextActive: {
    color: Colors.blue,
  },
  chartContainer: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  volumeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  volumeItem: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  volumeLabel: {
    color: Colors.textTertiary,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  volumeValue: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
