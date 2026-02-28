import React, { useMemo } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Svg, { Rect, Line, G, Text as SvgText } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/theme';
import { CandleData } from '@/constants/mockData';

interface CandlestickChartProps {
  data: CandleData[];
  width?: number;
  height?: number;
  showVolume?: boolean;
  showMA?: boolean;
  maPeriod?: number;
}

export default function CandlestickChart({
  data,
  width: propWidth,
  height = 350,
  showVolume = false,
  showMA = false,
  maPeriod = 20,
}: CandlestickChartProps) {
  const screenWidth = Dimensions.get('window').width;
  const width = propWidth || screenWidth - 32;

  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    const padding = { top: 20, right: 60, bottom: showVolume ? 60 : 30, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const volumeHeight = showVolume ? 40 : 0;
    const priceHeight = chartHeight - volumeHeight;

    const allHighs = data.map((d) => d.high);
    const allLows = data.map((d) => d.low);
    const minPrice = Math.min(...allLows);
    const maxPrice = Math.max(...allHighs);
    const priceRange = maxPrice - minPrice || 1;

    const candleWidth = Math.max(2, (chartWidth / data.length) * 0.6);
    const gap = (chartWidth / data.length) * 0.4;

    // Calculate MA
    const maValues: (number | null)[] = [];
    if (showMA) {
      for (let i = 0; i < data.length; i++) {
        if (i < maPeriod - 1) {
          maValues.push(null);
        } else {
          let sum = 0;
          for (let j = i - maPeriod + 1; j <= i; j++) {
            sum += data[j].close;
          }
          maValues.push(sum / maPeriod);
        }
      }
    }

    const candles = data.map((candle, i) => {
      const x = padding.left + i * (candleWidth + gap) + gap / 2;
      const isGreen = candle.close >= candle.open;
      const bodyTop = isGreen ? candle.close : candle.open;
      const bodyBottom = isGreen ? candle.open : candle.close;

      return {
        x,
        wickTop: padding.top + ((maxPrice - candle.high) / priceRange) * priceHeight,
        wickBottom: padding.top + ((maxPrice - candle.low) / priceRange) * priceHeight,
        bodyY: padding.top + ((maxPrice - bodyTop) / priceRange) * priceHeight,
        bodyHeight: Math.max(1, ((bodyTop - bodyBottom) / priceRange) * priceHeight),
        candleWidth,
        isGreen,
        candle,
      };
    });

    // Price grid lines
    const gridLines = 5;
    const priceLines = Array.from({ length: gridLines }, (_, i) => {
      const price = minPrice + (priceRange * i) / (gridLines - 1);
      const y = padding.top + ((maxPrice - price) / priceRange) * priceHeight;
      return { price, y };
    });

    // MA line points
    const maPoints = showMA
      ? maValues
          .map((val, i) => {
            if (val === null) return null;
            const x = padding.left + i * (candleWidth + gap) + gap / 2 + candleWidth / 2;
            const y = padding.top + ((maxPrice - val) / priceRange) * priceHeight;
            return { x, y };
          })
          .filter(Boolean) as { x: number; y: number }[]
      : [];

    return { candles, priceLines, maPoints, padding, lastPrice: data[data.length - 1] };
  }, [data, width, height, showVolume, showMA, maPeriod]);

  if (!chartData) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.noData}>No chart data</Text>
      </View>
    );
  }

  const { candles, priceLines, maPoints, lastPrice } = chartData;
  const lastIsGreen = lastPrice.close >= lastPrice.open;

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Last Price Display */}
      <View style={styles.priceHeader}>
        <Text style={[styles.lastPrice, { fontFamily: Fonts.mono }]}>
          {lastPrice.close.toFixed(lastPrice.close > 100 ? 2 : 5)}
        </Text>
        <View style={[styles.changeBadge, { backgroundColor: lastIsGreen ? Colors.neonGreenDim : Colors.crimsonRedDim }]}>
          <Text style={[styles.changeText, { color: lastIsGreen ? Colors.neonGreen : Colors.crimsonRed, fontFamily: Fonts.mono }]}>
            {lastIsGreen ? '+' : ''}{((lastPrice.close - lastPrice.open) / lastPrice.open * 100).toFixed(2)}%
          </Text>
        </View>
      </View>

      <Svg width={width} height={height - 40} viewBox={`0 0 ${width} ${height - 40}`}>
        {/* Grid lines and price labels */}
        {priceLines.map((line, i) => (
          <G key={`grid-${i}`}>
            <Line
              x1={10}
              y1={line.y}
              x2={width - 60}
              y2={line.y}
              stroke={Colors.chartGrid}
              strokeWidth={1}
            />
            <SvgText
              x={width - 55}
              y={line.y + 4}
              fill={Colors.textTertiary}
              fontSize={9}
              fontFamily={Fonts.mono}
            >
              {line.price.toFixed(line.price > 100 ? 1 : 4)}
            </SvgText>
          </G>
        ))}

        {/* MA Line */}
        {maPoints.length > 1 &&
          maPoints.map((point, i) => {
            if (i === 0) return null;
            const prev = maPoints[i - 1];
            return (
              <Line
                key={`ma-${i}`}
                x1={prev.x}
                y1={prev.y}
                x2={point.x}
                y2={point.y}
                stroke={Colors.blue}
                strokeWidth={1.5}
                opacity={0.7}
              />
            );
          })}

        {/* Candlesticks */}
        {candles.map((c, i) => (
          <G key={`candle-${i}`}>
            {/* Wick */}
            <Line
              x1={c.x + c.candleWidth / 2}
              y1={c.wickTop}
              x2={c.x + c.candleWidth / 2}
              y2={c.wickBottom}
              stroke={c.isGreen ? Colors.neonGreen : Colors.crimsonRed}
              strokeWidth={1}
              opacity={0.7}
            />
            {/* Body */}
            <Rect
              x={c.x}
              y={c.bodyY}
              width={c.candleWidth}
              height={c.bodyHeight}
              fill={c.isGreen ? Colors.neonGreen : Colors.crimsonRed}
              rx={1}
              opacity={0.9}
            />
          </G>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
    gap: 8,
  },
  lastPrice: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noData: {
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 100,
  },
});
