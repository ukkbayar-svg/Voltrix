import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  interpolate,
} from 'react-native-reanimated';
import { Colors, Fonts } from '@/constants/theme';

interface SentimentGaugeProps {
  sentiment: number; // 0 = full bearish, 100 = full bullish
  size?: 'sm' | 'md';
}

export default function SentimentGauge({ sentiment, size = 'md' }: SentimentGaugeProps) {
  const progress = useSharedValue(0.5);
  const isSm = size === 'sm';

  const gaugeWidth = isSm ? 100 : 130;
  const gaugeHeight = isSm ? 50 : 66;
  const needleLength = isSm ? 32 : 42;
  const labelSize = isSm ? 9 : 10;

  useEffect(() => {
    progress.value = withSpring(sentiment / 100, {
      damping: 14,
      stiffness: 90,
    });
  }, [sentiment, progress]);

  // Needle rotates from -90deg (bearish) to +90deg (bullish)
  const needleStyle = useAnimatedStyle(() => {
    const angle = interpolate(progress.value, [0, 1], [-88, 88]);
    return {
      transform: [{ rotate: `${angle}deg` }],
    };
  });

  // Needle color animates between red and green
  const needleColorStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      progress.value,
      [0, 0.5, 1],
      [Colors.crimsonRed, Colors.orange, Colors.neonGreen]
    );
    return { backgroundColor: color };
  });

  const label = sentiment >= 60 ? 'BULLISH' : sentiment <= 40 ? 'BEARISH' : 'NEUTRAL';
  const labelColor = sentiment >= 60 ? Colors.neonGreen : sentiment <= 40 ? Colors.crimsonRed : Colors.orange;

  // Draw the arc segments as colored sections
  const segments = [
    { color: Colors.crimsonRed, opacity: 0.85 },
    { color: '#FF6B2C', opacity: 0.75 },
    { color: Colors.orange, opacity: 0.75 },
    { color: '#C4E000', opacity: 0.75 },
    { color: Colors.neonGreen, opacity: 0.85 },
  ];

  return (
    <View style={[styles.container, { width: gaugeWidth }]}>
      {/* Semi-circle gauge */}
      <View style={[styles.gauge, { width: gaugeWidth, height: gaugeHeight }]}>
        {/* Background arc segments */}
        <View style={[styles.arcContainer, { width: gaugeWidth, height: gaugeHeight }]}>
          {segments.map((seg, i) => {
            const segWidth = gaugeWidth * 0.92;
            const borderR = segWidth / 2;
            return (
              <View
                key={i}
                style={[
                  styles.arcSegment,
                  {
                    width: segWidth,
                    height: borderR,
                    borderTopLeftRadius: i === 0 ? borderR : 0,
                    borderTopRightRadius: i === segments.length - 1 ? borderR : 0,
                    backgroundColor: seg.color,
                    opacity: seg.opacity * 0.3,
                    transform: [
                      { translateX: -(segWidth / 2) + (gaugeWidth / 2) },
                      { translateY: 0 },
                    ],
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  },
                ]}
              />
            );
          })}

          {/* Better: draw as colored half-circle sections using a row */}
          <View style={styles.arcRow}>
            {segments.map((seg, i) => (
              <View
                key={i}
                style={[
                  styles.arcSection,
                  {
                    backgroundColor: seg.color,
                    opacity: 0.25 + (sentiment / 100) * 0.1,
                    borderTopLeftRadius: i === 0 ? gaugeWidth / 2 : 0,
                    borderTopRightRadius: i === segments.length - 1 ? gaugeWidth / 2 : 0,
                    width: gaugeWidth / segments.length - 2,
                    height: gaugeHeight - 12,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Active portion highlight */}
        <View
          style={[
            styles.activeArc,
            {
              width: gaugeWidth * (sentiment / 100),
              maxWidth: gaugeWidth,
              backgroundColor: labelColor,
              opacity: 0.15,
            },
          ]}
        />

        {/* Needle pivot */}
        <View style={[styles.pivot, { bottom: 6, left: gaugeWidth / 2 - 5 }]}>
          <Animated.View
            style={[
              styles.needle,
              needleStyle,
              { height: needleLength, bottom: 5, left: 2 },
            ]}
          >
            <Animated.View style={[styles.needleFill, needleColorStyle]} />
          </Animated.View>
          <View style={styles.pivotCircle} />
        </View>
      </View>

      {/* Labels */}
      <View style={styles.labelRow}>
        <Text style={[styles.extremeLabel, { color: Colors.crimsonRed, fontSize: labelSize }]}>
          BEAR
        </Text>
        <Text style={[styles.sentimentLabel, { color: labelColor, fontSize: labelSize + 1 }]}>
          {sentiment}% {label}
        </Text>
        <Text style={[styles.extremeLabel, { color: Colors.neonGreen, fontSize: labelSize }]}>
          BULL
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  gauge: {
    position: 'relative',
    overflow: 'hidden',
  },
  arcContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  arcRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  arcSection: {
    borderRadius: 2,
  },
  arcSegment: {
    position: 'absolute',
  },
  activeArc: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: '100%',
    borderTopLeftRadius: 999,
  },
  pivot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 10,
    zIndex: 10,
  },
  needle: {
    position: 'absolute',
    width: 3,
    transformOrigin: 'bottom center',
    borderRadius: 2,
    overflow: 'hidden',
    bottom: 5,
  },
  needleFill: {
    flex: 1,
    borderRadius: 2,
  },
  pivotCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.textSecondary,
    borderWidth: 2,
    borderColor: '#1a1a1a',
    zIndex: 11,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  extremeLabel: {
    fontFamily: Fonts.mono,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sentimentLabel: {
    fontFamily: Fonts.mono,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
