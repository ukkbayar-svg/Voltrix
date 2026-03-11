import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
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
import * as Linking from 'expo-linking';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

const WHATSAPP_NUMBER = '447300088849';

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
  const { user } = useAuth();

  const waLink = useMemo(() => {
    const email = user?.email ?? '';
    const uid = user?.id ?? '';
    const msg = `Hi, I signed up for Voltrix and need approval. Email: ${email} UID: ${uid}`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  }, [user?.email, user?.id]);

  return (
    <Animated.View
      entering={FadeIn.duration(600)}
      style={[
        styles.container,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 90 },
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
          <Text style={styles.headlineTitle}>Awaiting{'\n'}Approval</Text>
          <Text style={styles.subheadline}>
            Your account is pending administrator approval. Access to {screenName} will be granted once payment is confirmed.
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
            <Text style={styles.statusItemText}>Signup completed</Text>
            <Ionicons name="checkmark" size={14} color="#00E676" />
          </View>
          <View style={styles.statusItem}>
            <PendingPip />
            <Text style={styles.statusItemText}>Payment / admin review</Text>
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

        <View style={styles.contactCard}>
          <View style={styles.contactRow}>
            <Ionicons name="logo-whatsapp" size={16} color={Colors.neonGreen} />
            <Text style={styles.contactTitle}>Contact to activate</Text>
          </View>
          <Text style={styles.contactText}>Message us on WhatsApp to confirm payment and activate your account.</Text>

          {user?.email ? (
            <View style={styles.identityBox}>
              <Text style={styles.identityLabel}>Your Email</Text>
              <Text style={[styles.identityValue, { fontFamily: Fonts.mono }]}>{user.email}</Text>
              <Text style={styles.identityLabel}>Your User ID</Text>
              <Text style={[styles.identityValue, { fontFamily: Fonts.mono }]} numberOfLines={1}>
                {user.id}
              </Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.whatsAppBtn, pressed && { opacity: 0.85 }]}
            onPress={() => {
              if (Platform.OS === 'web') {
                window.open(waLink, '_blank', 'noopener,noreferrer');
                return;
              }
              void Linking.openURL(waLink);
            }}
          >
            <Ionicons name="chatbubble-ellipses" size={16} color="#000" />
            <Text style={styles.whatsAppBtnText}>OPEN WHATSAPP</Text>
          </Pressable>
        </View>

        <Text style={styles.footerNote}>You will be automatically redirected once approved.</Text>
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
  return <Animated.View style={[style, styles.statusPip, { backgroundColor: '#F59E0B' }]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  securityTag: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.22)',
  },
  securityDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: Colors.voltrixAccent,
  },
  securityTagText: {
    color: Colors.voltrixAccent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 18,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 260,
    width: 260,
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 1,
  },
  lockIconBg: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.28)',
  },
  textBlock: {
    alignItems: 'center',
    gap: 8,
  },
  statusCode: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontFamily: Fonts.mono,
    letterSpacing: 2,
  },
  headlineTitle: {
    color: Colors.textPrimary,
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: 38,
  },
  subheadline: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 330,
  },
  statusCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    borderRadius: BorderRadius.xl,
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
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  statusDivider: {
    height: 1,
    backgroundColor: Colors.borderDark,
    opacity: 0.8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusPip: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  statusItemText: {
    color: Colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  pendingTag: {
    color: Colors.orange,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  lockedTag: {
    width: 18,
    height: 18,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  contactCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.xl,
    padding: 16,
    gap: 10,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  contactText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  identityBox: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: BorderRadius.lg,
    padding: 12,
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  identityLabel: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  identityValue: {
    color: Colors.textPrimary,
    fontSize: 12,
  },
  whatsAppBtn: {
    height: 50,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.neonGreen,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  whatsAppBtnText: {
    color: '#000',
    fontWeight: '900',
    letterSpacing: 1.2,
    fontSize: 12,
  },
  footerNote: {
    color: Colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
  },
});