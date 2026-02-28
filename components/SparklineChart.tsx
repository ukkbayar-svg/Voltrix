import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Colors } from '@/constants/theme';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showGradient?: boolean;
}

export default function SparklineChart({
  data,
  width = 80,
  height = 32,
  color,
  showGradient = false,
}: SparklineChartProps) {
  if (data.length < 2) return null;

  const isPositive = data[data.length - 1] >= data[0];
  const lineColor = color || (isPositive ? Colors.neonGreen : Colors.crimsonRed);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padding = 2;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const points = data
    .map((value, index) => {
      const x = padding + (index / (data.length - 1)) * plotWidth;
      const y = padding + plotHeight - ((value - min) / range) * plotHeight;
      return `${x},${y}`;
    })
    .join(' ');

  const gradientId = `sparkGrad_${Math.random().toString(36).substr(2, 9)}`;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {showGradient && (
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={lineColor} stopOpacity="0.3" />
              <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
            </LinearGradient>
          </Defs>
        )}
        {showGradient && (
          <Rect x={padding} y={padding} width={plotWidth} height={plotHeight} fill={`url(#${gradientId})`} rx={4} />
        )}
        <Polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
