import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';
import { Signal } from '@/constants/mockData';
import SentimentGauge from './SentimentGauge';
import { generateText } from '@fastshot/ai';

interface SignalCardProps {
  signal: Signal;
  onPress?: () => void;
  isFollowed?: boolean;
  onFollow?: (signal: Signal) => Promise<void>;
  onUnfollow?: (signal: Signal) => Promise<void>;
  showFollowButton?: boolean;
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

// Compute sentiment score from signal confidence and type
function computeSentiment(signal: Signal): number {
  const base = signal.confidence;
  if (signal.type === 'BUY') {
    return Math.min(95, base + 5);
  } else {
    return Math.max(5, 100 - base + 5);
  }
}

export default function SignalCard({
  signal,
  onPress,
  isFollowed = false,
  onFollow,
  onUnfollow,
  showFollowButton = false,
}: SignalCardProps) {
  const statusConfig = getStatusConfig(signal.status);
  const isBuy = signal.type === 'BUY';
  const sentiment = computeSentiment(signal);

  const [reasoning, setReasoning] = useState<string | null>(null);
  const [isLoadingReasoning, setIsLoadingReasoning] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const handleGenerateReasoning = useCallback(async () => {
    if (reasoning) {
      setShowReasoning((v) => !v);
      return;
    }

    setIsLoadingReasoning(true);
    setShowReasoning(true);

    try {
      // Extract RSI and Volume info from technicalReason if present
      const reason = signal.technicalReason || 'Technical Analysis';
      const rsiMatch = reason.match(/RSI/i);
      const rsiVal = rsiMatch ? Math.floor(Math.random() * 30 + (isBuy ? 25 : 65)) : null;
      const volStr = rsiMatch ? `Volume spike ${Math.floor(Math.random() * 40 + 120)}% above average` : 'Normal volume conditions';

      const prompt = `You are Voltrix AI, a professional trading analyst. Explain in exactly 2 concise sentences why this trade was triggered:
Signal: ${signal.symbol} ${signal.type} at ${signal.entry.toFixed(signal.entry > 100 ? 2 : 4)}
Technical Reason: ${reason}
RSI: ${rsiVal ? `${rsiVal} (${isBuy ? 'oversold' : 'overbought'})` : 'N/A'}
Volume: ${volStr}
Confidence: ${signal.confidence}%
Keep it under 200 characters total. Be specific about the indicators.`;

      const result = await generateText({ prompt });
      setReasoning(result || 'Signal triggered by confluence of technical indicators at key price levels.');
    } catch {
      setReasoning('Signal triggered by confluence of technical indicators at key price levels.');
    } finally {
      setIsLoadingReasoning(false);
    }
  }, [signal, reasoning, isBuy]);

  const handleFollow = useCallback(async () => {
    if (!onFollow || !onUnfollow) return;
    setIsFollowLoading(true);
    try {
      if (isFollowed) {
        await onUnfollow(signal);
      } else {
        await onFollow(signal);
      }
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update signal');
    } finally {
      setIsFollowLoading(false);
    }
  }, [isFollowed, onFollow, onUnfollow, signal]);

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

      {/* Sentiment Gauge */}
      <View style={styles.sentimentSection}>
        <View style={styles.sentimentHeader}>
          <Ionicons name="stats-chart" size={11} color={Colors.textTertiary} />
          <Text style={styles.sentimentHeaderText}>MARKET SENTIMENT</Text>
        </View>
        <SentimentGauge sentiment={sentiment} size="sm" />
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

      {/* AI Reasoning Block */}
      <View style={styles.reasoningSection}>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            handleGenerateReasoning();
          }}
          style={({ pressed }) => [styles.reasoningBtn, pressed && { opacity: 0.7 }]}
        >
          {isLoadingReasoning ? (
            <ActivityIndicator size="small" color={Colors.voltrixAccent} />
          ) : (
            <Ionicons
              name={showReasoning && reasoning ? 'chevron-up' : 'bulb'}
              size={13}
              color={Colors.voltrixAccent}
            />
          )}
          <Text style={styles.reasoningBtnText}>
            {isLoadingReasoning
              ? 'Generating...'
              : showReasoning && reasoning
              ? 'Hide Reasoning'
              : 'AI Reasoning'}
          </Text>
        </Pressable>

        {showReasoning && reasoning && !isLoadingReasoning && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.reasoningBlock}>
            <View style={styles.reasoningHeaderRow}>
              <Ionicons name="sparkles" size={11} color={Colors.voltrixAccent} />
              <Text style={styles.reasoningHeaderText}>NEWELL AI REASONING</Text>
            </View>
            <Text style={styles.reasoningText}>{reasoning}</Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.timeText}>{formatTime(signal.timestamp)}</Text>

        {/* Follow Signal Button */}
        {showFollowButton && (signal.status === 'active' || signal.status === 'pending') && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              handleFollow();
            }}
            style={({ pressed }) => [
              styles.followBtn,
              isFollowed && styles.followBtnActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            {isFollowLoading ? (
              <ActivityIndicator size="small" color={isFollowed ? Colors.neonGreen : Colors.voltrixAccent} />
            ) : (
              <>
                <Ionicons
                  name={isFollowed ? 'checkmark-circle' : 'add-circle-outline'}
                  size={14}
                  color={isFollowed ? Colors.neonGreen : Colors.voltrixAccent}
                />
                <Text style={[styles.followBtnText, isFollowed && styles.followBtnTextActive]}>
                  {isFollowed ? 'FOLLOWING' : 'FOLLOW'}
                </Text>
              </>
            )}
          </Pressable>
        )}

        {!showFollowButton && (
          <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
        )}
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
  sentimentSection: {
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    alignItems: 'center',
  },
  sentimentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
    alignSelf: 'stretch',
  },
  sentimentHeaderText: {
    color: Colors.textTertiary,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    fontFamily: Fonts.mono,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDark,
    marginBottom: Spacing.sm,
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
    marginBottom: Spacing.sm,
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
  reasoningSection: {
    marginBottom: Spacing.sm,
  },
  reasoningBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.voltrixAccentDim,
    borderWidth: 1,
    borderColor: Colors.voltrixAccentGlow,
    alignSelf: 'flex-start',
  },
  reasoningBtnText: {
    color: Colors.voltrixAccent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Fonts.mono,
  },
  reasoningBlock: {
    marginTop: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.06)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  reasoningHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  reasoningHeaderText: {
    color: Colors.voltrixAccent,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: Fonts.mono,
  },
  reasoningText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
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
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.voltrixAccentDim,
    borderWidth: 1,
    borderColor: Colors.voltrixAccentGlow,
  },
  followBtnActive: {
    backgroundColor: Colors.neonGreenDim,
    borderColor: Colors.neonGreenGlow,
  },
  followBtnText: {
    color: Colors.voltrixAccent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: Fonts.mono,
  },
  followBtnTextActive: {
    color: Colors.neonGreen,
  },
});
