import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

interface PulseBackgroundProps {
  children: React.ReactNode;
  isPositive: boolean;
  style?: ViewStyle;
  intensity?: number;
}

export default function PulseBackground({ children, isPositive, style, intensity = 0.15 }: PulseBackgroundProps) {
  const opacity = useSharedValue(intensity);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(intensity * 0.3, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [isPositive, intensity, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: isPositive
      ? `rgba(0, 255, 65, ${opacity.value})`
      : `rgba(255, 59, 59, ${opacity.value})`,
  }));

  return (
    <Animated.View style={[styles.container, style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
});
