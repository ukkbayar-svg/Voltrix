import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const url = Linking.useURL();

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const link = useMemo(() => {
    if (Platform.OS === 'web') return window.location.href;
    return url ?? '';
  }, [url]);

  useEffect(() => {
    const run = async () => {
      setError(null);

      try {
        // Support both PKCE (?code=...) and implicit (#access_token=...)
        if (link.includes('code=')) {
          const code = new URL(link).searchParams.get('code');
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              setError(exchangeError.message);
              return;
            }
          }
        } else {
          // supabase-js can parse the URL hash for recovery links on web
          const authAny = supabase.auth as unknown as {
            getSessionFromUrl?: (options: { storeSession: boolean }) => Promise<{ error?: { message: string } }>;
          };

          if (authAny.getSessionFromUrl) {
            const { error: fromUrlError } = await authAny.getSessionFromUrl({ storeSession: true });
            if (fromUrlError) {
              setError(fromUrlError.message);
              return;
            }
          }
        }

        setIsReady(true);
      } catch {
        setError('Invalid or expired reset link. Please request a new one.');
      }
    };

    run();
  }, [link]);

  const saveNewPassword = async () => {
    setError(null);

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.bgGlow} />

      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <Ionicons name="lock-closed" size={22} color={Colors.voltrixAccent} />
        </View>

        <Text style={styles.title}>Set New Access Key</Text>
        <Text style={styles.subtitle}>
          Choose a new password for your vault.
        </Text>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={Colors.crimsonRed} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!isReady ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.voltrixAccent} />
            <Text style={styles.loadingText}>Verifying reset link…</Text>
          </View>
        ) : (
          <>
            <View style={styles.inputWrapper}>
              <Ionicons name="key-outline" size={18} color={Colors.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="New password"
                placeholderTextColor={Colors.textTertiary}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError(null);
                }}
                secureTextEntry
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="shield-checkmark-outline" size={18} color={Colors.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={Colors.textTertiary}
                value={confirm}
                onChangeText={(t) => {
                  setConfirm(t);
                  setError(null);
                }}
                secureTextEntry
              />
            </View>

            <Pressable
              onPress={saveNewPassword}
              disabled={saving}
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.saveBtnText}>UPDATE PASSWORD</Text>
              )}
            </Pressable>
          </>
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
  bgGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(168, 85, 247, 0.06)',
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
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.voltrixAccentDim,
    borderWidth: 1,
    borderColor: Colors.voltrixAccentGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  loadingText: {
    color: Colors.textSecondary,
  },
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
  errorText: {
    color: Colors.crimsonRed,
    fontSize: 13,
    flex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.pureBlack,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  saveBtn: {
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.voltrixAccent,
    borderRadius: BorderRadius.lg,
    height: 52,
  },
  saveBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: Fonts.mono,
  },
});
