import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

interface BiometricScreenProps {
  onAuthenticate: () => void;
  isAuthenticating: boolean;
  error?: string | null;
}

function PulseRing({ delay, scale, opacity: opacityEnd }: { delay: number; scale: number; opacity: number }) {
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2200, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
  }, [anim, delay]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(anim.value, [0, 1], [1, scale]) }],
    opacity: interpolate(anim.value, [0, 0.6, 1], [opacityEnd, opacityEnd * 0.5, 0]),
  }));

  return <Animated.View style={[styles.pulseRing, style]} />;
}

function ScanLine() {
  const pos = useSharedValue(0);

  useEffect(() => {
    pos.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [pos]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(pos.value, [0, 1], [-50, 50]) }],
    opacity: interpolate(pos.value, [0, 0.15, 0.85, 1], [0, 0.9, 0.9, 0]),
  }));

  return <Animated.View style={[styles.scanLine, style]} />;
}

function GridLines() {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.15, { duration: 1000 }),
        withTiming(0.06, { duration: 1000 })
      ),
      -1,
      false
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      {[...Array(8)].map((_, i) => (
        <View
          key={`h-${i}`}
          style={[styles.gridLine, styles.gridLineH, { top: (height / 8) * i }]}
        />
      ))}
      {[...Array(6)].map((_, i) => (
        <View
          key={`v-${i}`}
          style={[styles.gridLine, styles.gridLineV, { left: (width / 6) * i }]}
        />
      ))}
    </Animated.View>
  );
}

function BiometricIcon({ isAuthenticating }: { isAuthenticating: boolean }) {
  const glow = useSharedValue(0.4);
  const rotate = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [glow]);

  useEffect(() => {
    if (isAuthenticating) {
      rotate.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      rotate.value = withTiming(0, { duration: 300 });
    }
  }, [isAuthenticating, rotate]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(glow.value, [0, 1], [0.3, 0.9]),
    shadowRadius: interpolate(glow.value, [0, 1], [10, 30]),
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
    opacity: isAuthenticating ? 1 : 0,
  }));

  return (
    <View style={styles.iconContainer}>
      {/* Pulse rings */}
      <PulseRing delay={0} scale={2.4} opacity={0.25} />
      <PulseRing delay={600} scale={2.0} opacity={0.35} />
      <PulseRing delay={1200} scale={1.6} opacity={0.5} />

      {/* Spinning arc (shown during authentication) */}
      <Animated.View style={[styles.spinner, spinnerStyle]}>
        <View style={styles.spinnerArc} />
      </Animated.View>

      {/* Main icon circle */}
      <Animated.View style={[styles.iconCircle, glowStyle]}>
        <View style={styles.scanArea}>
          <ScanLine />
          <Ionicons
            name="finger-print"
            size={52}
            color={Colors.voltrixAccent}
          />
        </View>
      </Animated.View>
    </View>
  );
}

function DataReadout() {
  const opacity = useSharedValue(0);
  const blink = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      blink.current = !blink.current;
      opacity.value = withTiming(blink.current ? 1 : 0.3, { duration: 300 });
    }, 800);
    return () => clearInterval(interval);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.dataReadout, style]}>
      <Text style={styles.dataText}>SYS: VOLTRIX_VAULT_v2.1</Text>
      <Text style={styles.dataText}>ENC: AES-256 ▮▮▮▮▮▮▮▮</Text>
      <Text style={styles.dataText}>AUTH: BIOMETRIC_REQUIRED</Text>
    </Animated.View>
  );
}

export default function BiometricScreen({
  onAuthenticate,
  isAuthenticating,
  error,
}: BiometricScreenProps) {
  const headerOpacity = useSharedValue(0);

  useEffect(() => {
    headerOpacity.value = withDelay(300, withTiming(1, { duration: 800 }));
  }, [headerOpacity]);

  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }));

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={styles.container}>
      {/* Background grid */}
      <GridLines />

      {/* Top gradient overlay */}
      <View style={styles.topGradient} />
      <View style={styles.bottomGradient} />

      {/* Header */}
      <Animated.View style={[styles.header, headerStyle]}>
        <View style={styles.brandRow}>
          <View style={styles.voltrixDot} />
          <Text style={styles.brandText}>VOLTRIX</Text>
        </View>
        <Text style={styles.vaultText}>SECURE VAULT</Text>
      </Animated.View>

      {/* Main content */}
      <View style={styles.content}>
        <BiometricIcon isAuthenticating={isAuthenticating} />

        <Animated.View entering={FadeIn.delay(400).duration(600)} style={styles.textSection}>
          <Text style={styles.title}>
            {isAuthenticating ? 'Scanning...' : 'Biometric Authentication'}
          </Text>
          <Text style={styles.subtitle}>
            {isAuthenticating
              ? 'Hold still while we verify your identity'
              : 'Place your finger on the sensor or look at the camera'}
          </Text>
        </Animated.View>

        {/* Error message */}
        {error && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.errorBadge}>
            <Ionicons name="warning" size={14} color={Colors.crimsonRed} />
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}

        {/* Authenticate button */}
        {!isAuthenticating && (
          <Animated.View entering={FadeIn.delay(600).duration(500)}>
            <Pressable
              onPress={onAuthenticate}
              style={({ pressed }) => [styles.authButton, pressed && styles.authButtonPressed]}
            >
              <View style={styles.authButtonInner}>
                <Ionicons name="lock-open" size={18} color={Colors.voltrixAccent} />
                <Text style={styles.authButtonText}>
                  {error ? 'RETRY SCAN' : 'AUTHENTICATE'}
                </Text>
              </View>
              <View style={styles.authButtonGlow} />
            </Pressable>
          </Animated.View>
        )}

        {/* Data readout */}
        <DataReadout />
      </View>

      {/* Corner decorations */}
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(168, 85, 247, 0.04)',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(168, 85, 247, 0.04)',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: Colors.voltrixAccent,
  },
  gridLineH: {
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  gridLineV: {
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
  },
  header: {
    position: 'absolute',
    top: 70,
    alignItems: 'center',
    gap: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voltrixDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.voltrixAccent,
    shadowColor: Colors.voltrixAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  brandText: {
    color: Colors.voltrixAccent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 4,
    fontFamily: Fonts.mono,
  },
  vaultText: {
    color: 'rgba(168, 85, 247, 0.5)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3,
    fontFamily: Fonts.mono,
  },
  content: {
    alignItems: 'center',
    gap: 32,
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: Colors.voltrixAccent,
  },
  spinner: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: Colors.voltrixAccent,
  },
  spinnerArc: {
    position: 'absolute',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.voltrixAccent,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
    overflow: 'hidden',
  },
  scanArea: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: Colors.voltrixAccent,
    borderRadius: 1,
    shadowColor: Colors.voltrixAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 6,
  },
  textSection: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 59, 92, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 92, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  errorText: {
    color: Colors.crimsonRed,
    fontSize: 13,
    fontWeight: '500',
  },
  authButton: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
  },
  authButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  authButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.5)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  authButtonGlow: {
    position: 'absolute',
    inset: 0,
    borderRadius: 16,
    backgroundColor: Colors.voltrixAccent,
    opacity: 0,
  },
  authButtonText: {
    color: Colors.voltrixAccent,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: Fonts.mono,
  },
  dataReadout: {
    gap: 4,
    alignItems: 'center',
  },
  dataText: {
    color: 'rgba(168, 85, 247, 0.4)',
    fontSize: 10,
    fontFamily: Fonts.mono,
    letterSpacing: 0.5,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  cornerTL: {
    top: 50,
    left: 20,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
  },
  cornerTR: {
    top: 50,
    right: 20,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
  },
  cornerBL: {
    bottom: 40,
    left: 20,
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
  },
  cornerBR: {
    bottom: 40,
    right: 20,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
  },
});
