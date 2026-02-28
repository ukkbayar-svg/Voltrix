import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';
import { Signal } from '@/constants/mockData';

interface SignalCardProps {
  signal: Signal;
  onPress?: () => void;
}

function getStatusConfig(status: Signal['status']) {
  switch (status) {
    case 'active':
      return { color: Colors.neonGreen, text: 'ACTIVE', icon: 'radio-button-on' as const };
    case 'hit_tp':
      return { color: Colors.neonGreen, text: 'TP HIT', icon: 'checkmark-circle' as const };
    case 'hit_sl':
      return { color: Colors.crimsonRed, text: 'SL HIT', icon: 'close-circle' as const };
    case 'pending':
      return { color: Colors.orange, text: 'PENDING', icon: 'time' as const };
  }
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (hours > 24) {
    return `${Math.floor(hours / 24)}d ago`;
  }
  if (hours > 0) {
    return `${hours}h ago`;
  }
  return `${minutes}m ago`;
}

export default function SignalCard({ signal, onPress }: SignalCardProps) {
  const statusConfig = getStatusConfig(signal.status);
  const isBuy = signal.type === 'BUY';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.topRow}>
        <View style={styles.symbolRow}>
          <View style={[styles.typeBadge, { backgroundColor: isBuy ? Colors.neonGreenDim : Colors.crimsonRedDim }]}>
            <Ionicons
              name={isBuy ? 'trending-up' : 'trending-down'}
              size={12}
              color={isBuy ? Colors.neonGreen : Colors.crimsonRed}
            />
            <Text style={[styles.typeText, { color: isBuy ? Colors.neonGreen : Colors.crimsonRed }]}>
              {signal.type}
            </Text>
          </View>
          <Text style={styles.symbol}>{signal.symbol}</Text>
        </View>
        <View style={styles.statusRow}>
          <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.text}</Text>
        </View>
      </View>

      <View style={styles.priceRow}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>ENTRY</Text>
          <Text style={[styles.priceValue, { fontFamily: Fonts.mono }]}>
            {signal.entry.toFixed(signal.entry > 100 ? 2 : 4)}
          </Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>SL</Text>
          <Text style={[styles.priceValue, { color: Colors.crimsonRed, fontFamily: Fonts.mono }]}>
            {signal.sl.toFixed(signal.sl > 100 ? 2 : 4)}
          </Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>TP</Text>
          <Text style={[styles.priceValue, { color: Colors.neonGreen, fontFamily: Fonts.mono }]}>
            {signal.tp.toFixed(signal.tp > 100 ? 2 : 4)}
          </Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>CONF</Text>
          <Text style={[styles.priceValue, { color: signal.confidence >= 80 ? Colors.neonGreen : signal.confidence >= 65 ? Colors.orange : Colors.textSecondary, fontFamily: Fonts.mono }]}>
            {signal.confidence}%
          </Text>
        </View>
      </View>

      {signal.technicalReason && (
        <View style={styles.reasonRow}>
          <Ionicons name="analytics" size={12} color={Colors.textTertiary} />
          <Text style={styles.reasonText}>{signal.technicalReason}</Text>
        </View>
      )}

      {signal.aiInsight && (
        <View style={styles.aiRow}>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={10} color={Colors.voltrixAccent} />
            <Text style={styles.aiBadgeText}>VOLTRIX AI</Text>
          </View>
          <Text style={styles.aiText} numberOfLines={2}>
            {signal.aiInsight}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.timeText}>{formatTime(signal.timestamp)}</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    marginBottom: Spacing.md,
  },
  cardPressed: {
    backgroundColor: Colors.cardBgLight,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  symbol: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    color: Colors.textTertiary,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  priceValue: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDark,
  },
  reasonText: {
    color: Colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: Spacing.sm,
    backgroundColor: Colors.voltrixAccentDim,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.voltrixAccentGlow,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(168, 85, 247, 0.22)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiBadgeText: {
    color: Colors.voltrixAccent,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  aiText: {
    color: Colors.textSecondary,
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  timeText: {
    color: Colors.textTertiary,
    fontSize: 11,
  },
});
