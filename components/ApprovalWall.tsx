import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/theme';

// Slow-pulsing ring
function PulseRing({
  delay,
  size,
  color,
}: {
  delay: number;
  size: number;
  color: string;
}) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 2800,
          easing: Easing.out(Easing.ease),
        }),
        withTiming(0, { duration: 0 })
      ),
      -1,
      false
    );
    // Stagger start
    setTimeout(() => {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, {
            duration: 2800,
            easing: Easing.out(Easing.ease),
          }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      );
    }, delay);
  }, [pulse, delay]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(pulse.value, [0, 1], [0.6, 1.3]),
      },
    ],
    opacity: interpolate(pulse.value, [0, 0.4, 1], [0, 0.6, 0]),
  }));

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        ringStyle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
        },
      ]}
    />
  );
}

// Lock icon with soft pulse
function LockIcon() {
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [glow]);

  const iconGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(glow.value, [0, 1], [0.3, 0.9]),
    shadowRadius: interpolate(glow.value, [0, 1], [8, 24]),
    opacity: interpolate(glow.value, [0, 1], [0.75, 1]),
  }));

  return (
    <View style={styles.iconContainer}>
      <PulseRing delay={0} size={160} color="rgba(168, 85, 247, 0.5)" />
      <PulseRing delay={900} size={200} color="rgba(168, 85, 247, 0.25)" />
      <PulseRing delay={1800} size={240} color="rgba(168, 85, 247, 0.12)" />
      <Animated.View
        style={[
          styles.lockIconBg,
          iconGlowStyle,
          {
            shadowColor: Colors.voltrixAccent,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
      >
        <Ionicons name="lock-closed" size={38} color={Colors.voltrixAccent} />
      </Animated.View>
    </View>
  );
}

interface ApprovalWallProps {
  screenName?: string;
}

export default function ApprovalWall({ screenName = 'this feature' }: ApprovalWallProps) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      entering={FadeIn.duration(600)}
      style={[
        styles.container,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
      ]}
    >
      {/* Subtle grid background */}
      <View style={styles.gridOverlay} />

      {/* Top security tag */}
      <View style={styles.securityTag}>
        <View style={styles.securityDot} />
        <Text style={styles.securityTagText}>RESTRICTED ACCESS</Text>
      </View>

      {/* Lock animation center */}
      <View style={styles.centerContent}>
        <LockIcon />

        <View style={styles.textBlock}>
          <Text style={styles.statusCode}>SEC-AUTH-403</Text>
          <Text style={styles.headlineTitle}>Awaiting{'\n'}Verification</Text>
          <Text style={styles.subheadline}>
            Your account is pending administrator approval. Access to {screenName} will be granted
            once your identity is verified by the Voltrix security team.
          </Text>
        </View>

        {/* Status card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons name="shield-checkmark-outline" size={15} color={Colors.voltrixAccent} />
            <Text style={styles.statusCardTitle}>Verification Status</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <View style={[styles.statusPip, { backgroundColor: '#00E676' }]} />
            <Text style={styles.statusItemText}>Identity submitted</Text>
            <Ionicons name="checkmark" size={14} color="#00E676" />
          </View>
          <View style={styles.statusItem}>
            <PendingPip />
            <Text style={styles.statusItemText}>Admin review</Text>
            <Text style={styles.pendingTag}>PENDING</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusPip, { backgroundColor: Colors.borderLight }]} />
            <Text style={[styles.statusItemText, { color: Colors.textTertiary }]}>
              Access granted
            </Text>
            <View style={styles.lockedTag}>
              <Ionicons name="lock-closed" size={9} color={Colors.textTertiary} />
            </View>
          </View>
        </View>

        <Text style={styles.footerNote}>
          You will be automatically redirected once approved.
        </Text>
      </View>
    </Animated.View>
  );
}

// Small pulsing pip for the pending status row
function PendingPip() {
  const blink = useSharedValue(1);
  useEffect(() => {
    blink.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 700 }),
        withTiming(1, { duration: 700 })
      ),
      -1,
      false
    );
  }, [blink]);
  const style = useAnimatedStyle(() => ({ opacity: blink.value }));
  return (
    <Animated.View
      style={[style, styles.statusPip, { backgroundColor: '#F59E0B' }]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.pureBlack,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
    opacity: 0.03,
    backgroundColor: Colors.pureBlack,
  },
  securityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,59,92,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,92,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    marginBottom: 20,
  },
  securityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.crimsonRed,
    shadowColor: Colors.crimsonRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  securityTagText: {
    color: Colors.crimsonRed,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: Fonts.mono,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    width: '100%',
  },
  iconContainer: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 1,
  },
  lockIconBg: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: Colors.voltrixAccentDim,
    borderWidth: 1.5,
    borderColor: Colors.voltrixAccentGlow,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 20,
  },
  textBlock: {
    alignItems: 'center',
    gap: 8,
  },
  statusCode: {
    color: Colors.textTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    fontFamily: Fonts.mono,
  },
  headlineTitle: {
    color: Colors.textPrimary,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    textAlign: 'center',
    lineHeight: 42,
  },
  subheadline: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
    marginTop: 4,
  },
  statusCard: {
    width: '100%',
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    padding: 16,
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusCardTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  statusDivider: {
    height: 1,
    backgroundColor: Colors.borderDark,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusPip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    elevation: 2,
  },
  statusItemText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  pendingTag: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: Fonts.mono,
    backgroundColor: 'rgba(245,158,11,0.14)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  lockedTag: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerNote: {
    color: Colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
