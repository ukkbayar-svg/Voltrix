import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

function getRedirectUri() {
  if (Platform.OS === 'web') return 'https://voltrix-g0jzb0ci4-ukkbayar-2168s-projects.vercel.app/auth/ctrader';
  return Linking.createURL('auth/ctrader', { scheme: 'fastshot' });
}

export default function CTraderCallback() {
  const router = useRouter();
  const url = Linking.useURL();

  const [error, setError] = useState<string | null>(null);

  const link = useMemo(() => {
    if (Platform.OS === 'web') return window.location.href;
    return url ?? '';
  }, [url]);

  useEffect(() => {
    const run = async () => {
      setError(null);

      try {
        const u = new URL(link);
        const code = u.searchParams.get('code');
        if (!code) {
          setError('Missing authorization code.');
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setError('Please sign in to link cTrader.');
          return;
        }

        const redirectUri = getRedirectUri();

        const { data, error: fnErr } = await supabase.functions.invoke('ctrader-exchange', {
          body: {
            code,
            redirectUri,
            scope: 'trading',
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (fnErr) {
          setError(fnErr.message);
          return;
        }

        if (!data?.ok) {
          setError('Failed to connect cTrader.');
          return;
        }

        router.replace('/(tabs)/bot');
      } catch {
        setError('Failed to connect cTrader. Try again.');
      }
    };

    run();
  }, [link, router]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="link" size={22} color={Colors.voltrixAccent} />
        </View>
        <Text style={styles.title}>Connecting cTrader…</Text>
        <Text style={styles.subtitle}>Finalizing secure connection</Text>

        {error ? (
          <>
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={Colors.crimsonRed} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <Pressable style={styles.btn} onPress={() => router.replace('/(tabs)/bot')}>
              <Text style={styles.btnText}>BACK</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.voltrixAccent} />
            <Text style={styles.loadingText}>Please wait…</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.pureBlack,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    padding: 20,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.voltrixAccentDim,
    borderWidth: 1,
    borderColor: Colors.voltrixAccentGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, fontSize: 13 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  loadingText: { color: Colors.textSecondary },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 59, 92, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 92, 0.25)',
    borderRadius: BorderRadius.md,
    padding: 12,
  },
  errorText: { color: Colors.crimsonRed, fontSize: 13, flex: 1 },
  btn: {
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.voltrixAccent,
    borderRadius: BorderRadius.lg,
    height: 52,
  },
  btnText: { color: '#000', fontSize: 14, fontWeight: '800', letterSpacing: 1.2 },
});
