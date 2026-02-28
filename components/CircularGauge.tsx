import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/theme';

interface CircularGaugeProps {
  value: number;
  maxValue: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  unit?: string;
}

function getGaugeColor(percentage: number): string {
  if (percentage < 0.4) return Colors.neonGreen;
  if (percentage < 0.7) return Colors.orange;
  return Colors.crimsonRed;
}

export default function CircularGauge({
  value,
  maxValue,
  size = 180,
  strokeWidth = 12,
  label = 'Drawdown',
  unit = '%',
}: CircularGaugeProps) {
  const percentage = Math.min(value / maxValue, 1);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage);
  const color = getGaugeColor(percentage);
  const gradId = 'gaugeGrad';

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.6" />
          </LinearGradient>
        </Defs>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.borderDark}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.5}
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {/* Glow circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth + 6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          opacity={0.15}
        />
      </Svg>
      <View style={styles.centerContent}>
        <Text style={[styles.value, { color, fontFamily: Fonts.mono }]}>
          {value.toFixed(1)}{unit}
        </Text>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.maxLabel}>
          / {maxValue.toFixed(1)}{unit}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  maxLabel: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontFamily: Fonts.mono,
    marginTop: 2,
  },
});
