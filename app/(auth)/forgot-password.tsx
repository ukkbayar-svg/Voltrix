import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@fastshot/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { resetPassword, isLoading, error, clearError, pendingPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) return;
    clearError?.();
    await resetPassword(email.trim());
  };

  if (pendingPasswordReset) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={48} color={Colors.voltrixAccent} />
        </View>
        <Text style={styles.successTitle}>Reset Link Sent</Text>
        <Text style={styles.successText}>
          Check your email for instructions to reset your vault access key.
        </Text>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.returnBtn}>
            <Text style={styles.returnBtnText}>Return to Vault</Text>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.bgGlow} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.backNav}>
              <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
              <Text style={styles.backNavText}>Back</Text>
            </TouchableOpacity>
          </Link>

          <Animated.View entering={FadeInDown.duration(500)} style={styles.iconSection}>
            <View style={styles.iconWrapper}>
              <Ionicons name="key-outline" size={40} color={Colors.voltrixAccent} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.titleSection}>
            <Text style={styles.title}>Reset Access Key</Text>
            <Text style={styles.subtitle}>Enter your email to receive a reset link for your vault</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.formSection}>
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={Colors.crimsonRed} />
                <Text style={styles.errorText}>{error.message}</Text>
              </View>
            )}

            <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={focused ? Colors.voltrixAccent : Colors.textTertiary}
              />
              <TextInput
                style={styles.input}
                placeholder="Your vault email"
                placeholderTextColor={Colors.textTertiary}
                value={email}
                onChangeText={(t) => { setEmail(t); clearError?.(); }}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="send"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={handleReset}
              />
            </View>

            <Pressable
              style={[styles.resetBtn, (isLoading || !email) && styles.resetBtnDisabled]}
              onPress={handleReset}
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.resetBtnText}>SEND RESET LINK</Text>
              )}
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.pureBlack,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  bgGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 16,
    gap: Spacing.xl,
    justifyContent: 'center',
  },
  backNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    padding: 4,
    position: 'absolute',
    top: 20,
    left: 28,
  },
  backNavText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  iconSection: {
    alignItems: 'center',
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.voltrixAccentDim,
    borderWidth: 1.5,
    borderColor: Colors.voltrixAccentGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  formSection: {
    gap: Spacing.md,
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
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    paddingHorizontal: 16,
    height: 54,
    gap: 12,
  },
  inputWrapperFocused: {
    borderColor: Colors.voltrixAccent,
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
    height: '100%',
  },
  resetBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.voltrixAccent,
    borderRadius: BorderRadius.lg,
    height: 54,
    shadowColor: Colors.voltrixAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  resetBtnDisabled: {
    opacity: 0.5,
  },
  resetBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: Fonts.mono,
  },
  successIcon: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: Colors.voltrixAccentDim,
    borderWidth: 1.5,
    borderColor: Colors.voltrixAccentGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  successText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  returnBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.voltrixAccentDim,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.voltrixAccentGlow,
    marginTop: 8,
  },
  returnBtnText: {
    color: Colors.voltrixAccent,
    fontSize: 14,
    fontWeight: '600',
  },
});
