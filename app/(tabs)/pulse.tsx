import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';
import { useApproval } from '@/lib/useApproval';
import ApprovalWall from '@/components/ApprovalWall';
import * as Haptics from '@/lib/haptics';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceIcon: string;
  publishedAt: string;
  url: string;
  category: 'crypto' | 'forex' | 'macro';
  thumbnail?: string;
}

type NewsCategory = 'all' | 'crypto' | 'forex' | 'macro';

const RSS_FEEDS = [
  {
    url: 'https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss',
    source: 'CoinTelegraph',
    icon: '₿',
    category: 'crypto' as const,
  },
  {
    url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.fxstreet.com/rss/news',
    source: 'FXStreet',
    icon: '₣',
    category: 'forex' as const,
  },
  {
    url: 'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.bloomberg.com/markets/news.rss',
    source: 'Bloomberg',
    icon: '📊',
    category: 'macro' as const,
  },
];

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

function getCategoryColor(category: NewsCategory | 'all'): string {
  switch (category) {
    case 'crypto': return '#F7931A';
    case 'forex': return Colors.voltrixAccent;
    case 'macro': return Colors.neonGreen;
    default: return Colors.textSecondary;
  }
}

function getCategoryLabel(category: NewsCategory | 'all'): string {
  switch (category) {
    case 'crypto': return '₿ CRYPTO';
    case 'forex': return '$ FOREX';
    case 'macro': return '📊 MACRO';
    default: return 'ALL';
  }
}

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const catColor = getCategoryColor(item.category);

  const handlePress = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (await Linking.canOpenURL(item.url)) {
      Linking.openURL(item.url);
    }
  }, [item.url]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.newsCard, pressed && styles.newsCardPressed]}
      >
        {Platform.OS !== 'web' ? (
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
            <View style={[StyleSheet.absoluteFill, styles.cardOverlay]} />
          </BlurView>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.cardOverlayWeb]} />
        )}

        <View style={styles.newsCardContent}>
          {/* Category + Time row */}
          <View style={styles.newsMeta}>
            <View style={[styles.categoryBadge, { backgroundColor: `${catColor}18`, borderColor: `${catColor}40` }]}>
              <Text style={[styles.categoryText, { color: catColor }]}>
                {getCategoryLabel(item.category)}
              </Text>
            </View>
            <View style={styles.sourceRow}>
              <Text style={styles.sourceIcon}>{item.sourceIcon}</Text>
              <Text style={styles.sourceName}>{item.source}</Text>
            </View>
            <Text style={styles.timeAgo}>{formatTimeAgo(item.publishedAt)}</Text>
          </View>

          {/* Title */}
          <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>

          {/* Summary */}
          {item.summary ? (
            <Text style={styles.newsSummary} numberOfLines={2}>{item.summary}</Text>
          ) : null}

          {/* Footer */}
          <View style={styles.newsFooter}>
            <View style={[styles.readMoreBtn, { borderColor: `${catColor}40` }]}>
              <Text style={[styles.readMoreText, { color: catColor }]}>Read More</Text>
              <Ionicons name="arrow-forward" size={11} color={catColor} />
            </View>
            <Ionicons name="open-outline" size={14} color={Colors.textTertiary} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function TickerBar({ items }: { items: NewsItem[] }) {
  if (items.length === 0) return null;
  const tickerItems = items.slice(0, 5);

  return (
    <View style={styles.tickerContainer}>
      <View style={styles.tickerLabel}>
        <View style={styles.tickerDot} />
        <Text style={styles.tickerLabelText}>LIVE</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tickerScroll}
      >
        {tickerItems.map((item, i) => (
          <Pressable
            key={item.id}
            onPress={() => Linking.openURL(item.url)}
            style={styles.tickerItem}
          >
            <Text style={styles.tickerText} numberOfLines={1}>
              {item.title}
            </Text>
            {i < tickerItems.length - 1 && (
              <Text style={styles.tickerSep}>  •  </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

async function fetchFeed(feed: typeof RSS_FEEDS[0]): Promise<NewsItem[]> {
  try {
    const response = await fetch(feed.url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.items || !Array.isArray(data.items)) return [];

    return data.items.slice(0, 6).map((item: {
      guid?: string;
      title?: string;
      description?: string;
      pubDate?: string;
      link?: string;
      thumbnail?: string;
      enclosure?: { link?: string };
    }, index: number) => ({
      id: item.guid || `${feed.source}-${index}`,
      title: item.title?.replace(/<[^>]*>/g, '').trim() || 'No title',
      summary: item.description
        ?.replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim()
        .substring(0, 150) || '',
      source: feed.source,
      sourceIcon: feed.icon,
      publishedAt: item.pubDate || new Date().toISOString(),
      url: item.link || '',
      category: feed.category,
      thumbnail: item.thumbnail || item.enclosure?.link,
    }));
  } catch {
    return [];
  }
}

const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    title: 'Bitcoin Surges Past $70K as Institutional Demand Rises',
    summary: 'BTC breaks key resistance level amid record ETF inflows and growing institutional interest from major asset managers.',
    source: 'CoinTelegraph',
    sourceIcon: '₿',
    publishedAt: new Date(Date.now() - 1800000).toISOString(),
    url: 'https://cointelegraph.com',
    category: 'crypto',
  },
  {
    id: '2',
    title: 'EUR/USD Consolidates Below 1.09 as Fed Hold Expectations Rise',
    summary: 'The euro remains under pressure as markets price in an extended pause from the Federal Reserve, with ECB also signaling caution.',
    source: 'FXStreet',
    sourceIcon: '₣',
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    url: 'https://fxstreet.com',
    category: 'forex',
  },
  {
    id: '3',
    title: 'Gold Holds Gains Above $2,300 Amid Geopolitical Tensions',
    summary: 'XAU/USD maintains bullish momentum as safe-haven demand continues with ongoing Middle East uncertainty.',
    source: 'Bloomberg',
    sourceIcon: '📊',
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    url: 'https://bloomberg.com',
    category: 'macro',
  },
  {
    id: '4',
    title: 'Ethereum ETF Sees Record $300M Inflow in Single Day',
    summary: 'Spot Ethereum ETFs saw massive institutional inflows as major pension funds begin allocating to digital assets.',
    source: 'CoinTelegraph',
    sourceIcon: '₿',
    publishedAt: new Date(Date.now() - 10800000).toISOString(),
    url: 'https://cointelegraph.com',
    category: 'crypto',
  },
  {
    id: '5',
    title: 'GBP/USD Eyes 1.28 as UK CPI Data Boosts Rate Cut Expectations',
    summary: 'Sterling weakens after lower-than-expected inflation data raises probability of Bank of England rate cuts.',
    source: 'FXStreet',
    sourceIcon: '₣',
    publishedAt: new Date(Date.now() - 14400000).toISOString(),
    url: 'https://fxstreet.com',
    category: 'forex',
  },
  {
    id: '6',
    title: 'US Dollar Index Consolidates as Markets Await Fed Minutes',
    summary: 'DXY holds key support as traders position ahead of Federal Open Market Committee meeting minutes release.',
    source: 'Bloomberg',
    sourceIcon: '📊',
    publishedAt: new Date(Date.now() - 18000000).toISOString(),
    url: 'https://bloomberg.com',
    category: 'macro',
  },
];

const categories: { key: NewsCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All News' },
  { key: 'crypto', label: '₿ Crypto' },
  { key: 'forex', label: '$ Forex' },
  { key: 'macro', label: '📊 Macro' },
];

export default function PulseScreen() {
  const insets = useSafeAreaInsets();
  const { isApproved, isAdmin, isLoading: approvalLoading } = useApproval();
  const [news, setNews] = useState<NewsItem[]>(MOCK_NEWS);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | 'all'>('all');
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadNews = useCallback(async () => {
    try {
      // Fetch all feeds in parallel
      const results = await Promise.allSettled(RSS_FEEDS.map(fetchFeed));
      const allItems: NewsItem[] = [];

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allItems.push(...result.value);
        }
      });

      if (allItems.length > 0) {
        // Sort by published date
        allItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        setNews(allItems);
      } else {
        setNews(MOCK_NEWS);
      }
    } catch {
      setNews(MOCK_NEWS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNews();

    // Auto-refresh every 5 minutes
    refreshTimerRef.current = setInterval(loadNews, 300000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [loadNews]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await loadNews();
    setRefreshing(false);
  }, [loadNews]);

  const filteredNews = selectedCategory === 'all'
    ? news
    : news.filter((n) => n.category === selectedCategory);

  if (!approvalLoading && !isApproved && !isAdmin) {
    return <ApprovalWall screenName="Market Pulse" />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 100 }]}
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
          <View>
            <View style={styles.brandRow}>
              <View style={styles.voltrixDot} />
              <Text style={styles.brandTag}>VOLTRIX</Text>
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Pulse</Text>
              <Animated.View entering={FadeInRight.delay(200).duration(400)} style={styles.liveBadge}>
                <View style={styles.liveIndicatorDot} />
                <Text style={styles.liveBadgeText}>LIVE FEED</Text>
              </Animated.View>
            </View>
            <Text style={styles.subtitle}>Market Intelligence & Breaking News</Text>
          </View>
        </Animated.View>

        {/* Ticker Bar */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <TickerBar items={news.slice(0, 5)} />
        </Animated.View>

        {/* Market Summary Row */}
        <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.marketRow}>
          {[
            { label: 'BTC/USD', value: '+2.4%', up: true },
            { label: 'EUR/USD', value: '-0.3%', up: false },
            { label: 'XAU/USD', value: '+0.8%', up: true },
            { label: 'FEAR IDX', value: '62', up: true },
          ].map((item) => (
            <View key={item.label} style={styles.marketChip}>
              <Text style={styles.marketChipLabel}>{item.label}</Text>
              <Text style={[styles.marketChipValue, { color: item.up ? Colors.neonGreen : Colors.crimsonRed }]}>
                {item.value}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* Category Filter */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {categories.map((cat) => (
              <Pressable
                key={cat.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(cat.key);
                }}
                style={[styles.filterChip, selectedCategory === cat.key && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, selectedCategory === cat.key && styles.filterTextActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        {/* News Count */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.countRow}>
          <Text style={styles.countText}>{filteredNews.length} articles</Text>
          <Pressable onPress={onRefresh} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={14} color={Colors.textTertiary} />
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </Animated.View>

        {/* News Feed */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.voltrixAccent} />
            <Text style={styles.loadingText}>Fetching latest news...</Text>
          </View>
        ) : filteredNews.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No news found</Text>
            <Text style={styles.emptySubtext}>Try another category</Text>
          </View>
        ) : (
          <View style={styles.newsList}>
            {filteredNews.map((item, index) => (
              <NewsCard key={item.id} item={item} index={index} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.pureBlack,
  },
  scrollView: {
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  voltrixDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.voltrixAccent,
    shadowColor: Colors.voltrixAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  brandTag: {
    color: Colors.voltrixAccent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 59, 92, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 92, 0.3)',
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.crimsonRed,
    shadowColor: Colors.crimsonRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  liveBadgeText: {
    color: Colors.crimsonRed,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: Fonts.mono,
  },
  subtitle: {
    color: Colors.textTertiary,
    fontSize: 13,
    marginTop: 2,
  },
  tickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    paddingVertical: 8,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  tickerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: Colors.borderDark,
    marginRight: 8,
  },
  tickerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.crimsonRed,
  },
  tickerLabelText: {
    color: Colors.crimsonRed,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: Fonts.mono,
  },
  tickerScroll: {
    flex: 1,
  },
  tickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tickerText: {
    color: Colors.textSecondary,
    fontSize: 11,
    maxWidth: 200,
  },
  tickerSep: {
    color: Colors.textTertiary,
    fontSize: 11,
  },
  marketRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  marketChip: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.sm,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  marketChipLabel: {
    color: Colors.textTertiary,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 3,
    fontFamily: Fonts.mono,
  },
  marketChipValue: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts.mono,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  filterChipActive: {
    backgroundColor: Colors.voltrixAccentDim,
    borderColor: Colors.voltrixAccent,
  },
  filterText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: Colors.voltrixAccent,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countText: {
    color: Colors.textTertiary,
    fontSize: 12,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refreshText: {
    color: Colors.textTertiary,
    fontSize: 12,
  },
  newsList: {
    gap: 2,
  },
  newsCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 130,
  },
  newsCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  cardOverlay: {
    backgroundColor: 'rgba(15,15,25,0.7)',
  },
  cardOverlayWeb: {
    backgroundColor: Colors.cardBg,
  },
  newsCardContent: {
    padding: Spacing.md,
    gap: 8,
  },
  newsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Fonts.mono,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  sourceIcon: {
    fontSize: 10,
  },
  sourceName: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '500',
  },
  timeAgo: {
    color: Colors.textTertiary,
    fontSize: 10,
    fontFamily: Fonts.mono,
  },
  newsTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  newsSummary: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  readMoreText: {
    fontSize: 11,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    color: Colors.textTertiary,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: Colors.textTertiary,
    fontSize: 13,
  },
});
