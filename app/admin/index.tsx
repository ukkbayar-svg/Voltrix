import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { useAuth } from '@fastshot/auth';
import { useRouter } from 'expo-router';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';
import { supabase, DbProfile, fetchAllProfiles, setUserApproval } from '@/lib/supabase';
import { ADMIN_EMAIL } from '@/lib/useApproval';
import * as Haptics from '@/lib/haptics';

// Status definitions
const STATUS_CONFIG = {
  active: {
    label: 'ACTIVE',
    color: '#00E676',
    dimColor: 'rgba(0, 230, 118, 0.14)',
    glowColor: 'rgba(0, 230, 118, 0.5)',
    icon: 'checkmark-circle' as const,
  },
  pending: {
    label: 'PENDING',
    color: '#F59E0B',
    dimColor: 'rgba(245, 158, 11, 0.14)',
    glowColor: 'rgba(245, 158, 11, 0.5)',
    icon: 'time' as const,
  },
  blocked: {
    label: 'BLOCKED',
    color: '#FF3B5C',
    dimColor: 'rgba(255, 59, 92, 0.14)',
    glowColor: 'rgba(255, 59, 92, 0.5)',
    icon: 'ban' as const,
  },
};

function getProfileStatus(profile: DbProfile): keyof typeof STATUS_CONFIG {
  // We use a `blocked` field stored via is_approved=false + explicit block flag
  // For now: is_approved=true → active, is_approved=false → pending
  // We differentiate pending vs blocked via an extra in-memory flag handled by the admin actions
  return profile.is_approved ? 'active' : 'pending';
}

// Pulsing dot component
function StatusPip({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const config = STATUS_CONFIG[status];
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900 }),
        withTiming(0, { duration: 900 })
      ),
      -1,
      false
    );
  }, [pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(pulse.value, [0, 1], [0.3, 0.9]),
    shadowRadius: interpolate(pulse.value, [0, 1], [3, 8]),
    opacity: interpolate(pulse.value, [0, 1], [0.7, 1]),
  }));

  return (
    <View style={styles.pipContainer}>
      <Animated.View
        style={[
          styles.pipDot,
          { backgroundColor: config.color, shadowColor: config.glowColor },
          glowStyle,
        ]}
      />
    </View>
  );
}

// Stat card with glow effect
function StatCard({
  value,
  label,
  color,
  delay = 0,
}: {
  value: number;
  label: string;
  color: string;
  delay?: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.statCard}>
      <View style={[styles.statGlowBar, { backgroundColor: color }]} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

// User row card
function UserRow({
  profile,
  blockedIds,
  onGrant,
  onBlock,
  loading,
}: {
  profile: DbProfile;
  blockedIds: Set<string>;
  onGrant: (id: string) => void;
  onBlock: (id: string) => void;
  loading: string | null;
}) {
  const isBlocked = blockedIds.has(profile.id);
  const rawStatus = getProfileStatus(profile);
  const status = isBlocked ? 'blocked' : rawStatus;
  const config = STATUS_CONFIG[status];
  const isLoading = loading === profile.id;

  const emailDisplay = profile.email
    ? profile.email.length > 26
      ? profile.email.slice(0, 24) + '…'
      : profile.email
    : 'Unknown';

  const joined = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
      })
    : '—';

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.userRow}>
      <BlurView
        intensity={Platform.OS === 'web' ? 0 : 20}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.userRowInner}>
        {/* Avatar circle */}
        <View style={[styles.avatarCircle, { borderColor: config.color + '44' }]}>
          <Text style={[styles.avatarText, { color: config.color }]}>
            {(profile.email ?? 'U')[0].toUpperCase()}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.userInfo}>
          <Text style={styles.userEmail}>{emailDisplay}</Text>
          <View style={styles.userMeta}>
            <StatusPip status={status} />
            <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.joinedText}>Joined {joined}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionButtons}>
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.voltrixAccent} />
          ) : status !== 'active' ? (
            <Pressable
              style={[styles.actionBtn, styles.grantBtn]}
              onPress={() => onGrant(profile.id)}
            >
              <Ionicons name="checkmark" size={13} color="#00E676" />
              <Text style={styles.grantBtnText}>Grant</Text>
            </Pressable>
          ) : null}

          {!isLoading && status !== 'blocked' && (
            <Pressable
              style={[styles.actionBtn, styles.blockBtn]}
              onPress={() => onBlock(profile.id)}
            >
              <Ionicons name="ban" size={13} color="#FF3B5C" />
              <Text style={styles.blockBtnText}>Block</Text>
            </Pressable>
          )}

          {!isLoading && status === 'blocked' && (
            <Pressable
              style={[styles.actionBtn, styles.unblockBtn]}
              onPress={() => onGrant(profile.id)}
            >
              <Ionicons name="refresh" size={13} color={Colors.voltrixAccent} />
              <Text style={styles.unblockBtnText}>Restore</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Security: redirect non-admins
  useEffect(() => {
    if (user && user.email !== ADMIN_EMAIL) {
      router.replace('/(tabs)');
    }
  }, [user, router]);

  const loadProfiles = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchAllProfiles();
      // Filter out admin's own profile
      setProfiles(data.filter((p) => p.email !== ADMIN_EMAIL));
    } catch {
      setError('Failed to load users. Ensure the profiles table exists in Supabase.');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Real-time subscription to profile changes
  const subscribeToProfiles = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
    const channel = supabase
      .channel('admin-profiles-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          loadProfiles();
        }
      )
      .subscribe();
    channelRef.current = channel;
  }, [loadProfiles]);

  useEffect(() => {
    loadProfiles();
    subscribeToProfiles();
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [loadProfiles, subscribeToProfiles]);

  const handleGrant = useCallback(
    async (userId: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoadingAction(userId);
      try {
        await setUserApproval(userId, true);
        setBlockedIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        setProfiles((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, is_approved: true } : p))
        );
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoadingAction(null);
      }
    },
    []
  );

  const handleBlock = useCallback(
    async (userId: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setLoadingAction(userId);
      try {
        await setUserApproval(userId, false);
        setBlockedIds((prev) => new Set([...prev, userId]));
        setProfiles((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, is_approved: false } : p))
        );
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoadingAction(null);
      }
    },
    []
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadProfiles();
  }, [loadProfiles]);

  const handleSignOut = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut?.();
    router.replace('/(auth)/login');
  }, [signOut, router]);

  const activeCount = profiles.filter((p) => p.is_approved && !blockedIds.has(p.id)).length;
  const pendingCount = profiles.filter((p) => !p.is_approved && !blockedIds.has(p.id)).length;
  const blockedCount = blockedIds.size;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.voltrixAccent}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.brandRow}>
              <View style={styles.voltrixHex}>
                <Ionicons name="shield" size={14} color={Colors.voltrixAccent} />
              </View>
              <Text style={styles.brandTag}>VOLTRIX ADMIN</Text>
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>COMMAND HQ</Text>
              </View>
            </View>
            <Text style={styles.title}>User Management</Text>
            <Text style={styles.subtitle}>Invitation-Only Access Control</Text>
          </View>
          <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color={Colors.textTertiary} />
          </Pressable>
        </Animated.View>

        {/* Admin identity chip */}
        <Animated.View entering={FadeInRight.delay(150).duration(400)} style={styles.adminChip}>
          <View style={styles.adminChipDot} />
          <Text style={styles.adminChipText}>Authenticated as {user?.email}</Text>
        </Animated.View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard value={activeCount} label="Active" color="#00E676" delay={200} />
          <StatCard value={pendingCount} label="Pending" color="#F59E0B" delay={280} />
          <StatCard value={blockedCount} label="Blocked" color="#FF3B5C" delay={360} />
          <StatCard value={profiles.length} label="Total" color={Colors.voltrixAccent} delay={440} />
        </View>

        {/* Section header */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="people" size={16} color={Colors.voltrixAccent} />
            <Text style={styles.sectionTitle}>Registered Users</Text>
          </View>
          <Text style={styles.sectionCount}>{profiles.length} users</Text>
        </Animated.View>

        {/* Divider line */}
        <View style={styles.divider} />

        {/* Loading state */}
        {initialLoading && (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={Colors.voltrixAccent} />
            <Text style={styles.centerText}>Loading users…</Text>
          </View>
        )}

        {/* Error state */}
        {error && !initialLoading && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.errorCard}>
            <Ionicons name="warning" size={20} color={Colors.orange} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={loadProfiles}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Empty state */}
        {!initialLoading && !error && profiles.length === 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Users Yet</Text>
            <Text style={styles.emptySubtitle}>
              When users sign up, they&apos;ll appear here for review.
            </Text>
          </Animated.View>
        )}

        {/* User rows */}
        {!initialLoading &&
          profiles.map((profile) => (
            <UserRow
              key={profile.id}
              profile={profile}
              blockedIds={blockedIds}
              onGrant={handleGrant}
              onBlock={handleBlock}
              loading={loadingAction}
            />
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.pureBlack,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  voltrixHex: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: Colors.voltrixAccentDim,
    borderWidth: 1,
    borderColor: Colors.voltrixAccentGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTag: {
    color: Colors.voltrixAccent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  adminBadge: {
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderWidth: 1,
    borderColor: Colors.voltrixAccentGlow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadgeText: {
    color: Colors.voltrixAccentBright,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: Fonts.mono,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: Colors.textTertiary,
    fontSize: 13,
    marginTop: 1,
  },
  signOutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  adminChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  adminChipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.voltrixAccent,
    shadowColor: Colors.voltrixAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  adminChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.md,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderDark,
    overflow: 'hidden',
    gap: 2,
  },
  statGlowBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Fonts.mono,
    marginTop: 4,
  },
  statLabel: {
    color: Colors.textTertiary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionCount: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontFamily: Fonts.mono,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderDark,
    marginVertical: -4,
  },
  centerState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  centerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  errorCard: {
    backgroundColor: 'rgba(255,159,10,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,159,10,0.3)',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: Colors.orange,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryBtn: {
    backgroundColor: 'rgba(255,159,10,0.18)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,159,10,0.4)',
  },
  retryBtnText: {
    color: Colors.orange,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    color: Colors.textSecondary,
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: Colors.textTertiary,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 240,
  },
  // User row
  userRow: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderDark,
    backgroundColor: Colors.cardBg,
  },
  userRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.cardBgLight,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  userEmail: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Fonts.mono,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pipContainer: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: Fonts.mono,
  },
  metaDot: {
    color: Colors.textTertiary,
    fontSize: 11,
  },
  joinedText: {
    color: Colors.textTertiary,
    fontSize: 10,
    fontFamily: Fonts.mono,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    minWidth: 90,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  grantBtn: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: 'rgba(0, 230, 118, 0.35)',
  },
  grantBtnText: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.mono,
  },
  blockBtn: {
    backgroundColor: 'rgba(255, 59, 92, 0.1)',
    borderColor: 'rgba(255, 59, 92, 0.3)',
  },
  blockBtnText: {
    color: '#FF3B5C',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.mono,
  },
  unblockBtn: {
    backgroundColor: Colors.voltrixAccentDim,
    borderColor: Colors.voltrixAccentGlow,
  },
  unblockBtnText: {
    color: Colors.voltrixAccent,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.mono,
  },
});
