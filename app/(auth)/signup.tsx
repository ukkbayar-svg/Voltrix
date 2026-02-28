import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@fastshot/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { signUpWithEmail, isLoading, error, clearError, pendingEmailVerification } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [localError, setLocalError] = useState('');
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleSignUp = async () => {
    setLocalError('');
    if (!email.trim() || !password || !confirmPassword) {
      setLocalError('All fields are required');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }
    clearError?.();
    await signUpWithEmail(email.trim(), password);
  };

  if (pendingEmailVerification) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={styles.verificationContainer}>
          <View style={styles.verificationIcon}>
            <Ionicons name="mail" size={48} color={Colors.voltrixAccent} />
          </View>
          <Text style={styles.verificationTitle}>Check Your Email</Text>
          <Text style={styles.verificationText}>
            We sent a verification link to{'\n'}
            <Text style={styles.verificationEmail}>{email}</Text>
          </Text>
          <Text style={styles.verificationSub}>
            Click the link in your email to activate your Vault account and start trading.
          </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.backBtn}>
              <Ionicons name="arrow-back" size={16} color={Colors.voltrixAccent} />
              <Text style={styles.backBtnText}>Return to Vault</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    );
  }

  const displayError = localError || error?.message;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.bgGradient1} />
      <View style={styles.bgGradient2} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <Animated.View entering={FadeIn.duration(400)}>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.backNav}>
                <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
                <Text style={styles.backNavText}>Back to Vault</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>

          {/* Icon */}
          <Animated.View entering={FadeIn.delay(200).duration(600)} style={styles.iconSection}>
            <View style={styles.iconContainer}>
              <View style={styles.iconGlow} />
              <View style={styles.iconWrapper}>
                <Ionicons name="person-add" size={36} color={Colors.voltrixAccent} />
              </View>
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.titleSection}>
            <Text style={styles.title}>Create Vault</Text>
            <Text style={styles.subtitle}>Set up your secure trading account</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.formSection}>
            {displayError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={Colors.crimsonRed} />
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            )}

            {/* Email */}
            <View style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused]}>
              <View style={styles.inputIcon}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={emailFocused ? Colors.voltrixAccent : Colors.textTertiary}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={Colors.textTertiary}
                value={email}
                onChangeText={(t) => { setEmail(t); setLocalError(''); clearError?.(); }}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            {/* Password */}
            <View style={[styles.inputWrapper, passwordFocused && styles.inputWrapperFocused]}>
              <View style={styles.inputIcon}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={passwordFocused ? Colors.voltrixAccent : Colors.textTertiary}
                />
              </View>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="Create password"
                placeholderTextColor={Colors.textTertiary}
                value={password}
                onChangeText={(t) => { setPassword(t); setLocalError(''); clearError?.(); }}
                secureTextEntry={!showPassword}
                returnKeyType="next"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <View style={[styles.inputWrapper, confirmFocused && styles.inputWrapperFocused]}>
              <View style={styles.inputIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={confirmFocused ? Colors.voltrixAccent : Colors.textTertiary}
                />
              </View>
              <TextInput
                ref={confirmRef}
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={Colors.textTertiary}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setLocalError(''); clearError?.(); }}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
                onSubmitEditing={handleSignUp}
              />
            </View>

            {/* Create Vault Button */}
            <Pressable
              style={[styles.createBtn, isLoading && styles.createBtnLoading]}
              onPress={handleSignUp}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Ionicons name="flash" size={18} color="#000" />
                  <Text style={styles.createBtnText}>INITIALIZE VAULT</Text>
                </>
              )}
            </Pressable>
          </Animated.View>

          {/* Sign In Link */}
          <Animated.View entering={FadeInUp.delay(800).duration(600)} style={styles.loginRow}>
            <Text style={styles.loginText}>Already have a Vault? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>
        </ScrollView>
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
  bgGradient1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(168, 85, 247, 0.06)',
  },
  bgGradient2: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(168, 85, 247, 0.04)',
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 16,
    gap: Spacing.xl,
    minHeight: '100%',
    justifyContent: 'center',
  },
  backNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    padding: 4,
  },
  backNavText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  iconSection: {
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    shadowColor: Colors.voltrixAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
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
    gap: 6,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  formSection: {
    width: '100%',
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
    paddingHorizontal: 14,
    height: 54,
    gap: 10,
  },
  inputWrapperFocused: {
    borderColor: Colors.voltrixAccent,
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
    shadowColor: Colors.voltrixAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  inputIcon: {
    width: 22,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
    height: '100%',
  },
  eyeBtn: {
    padding: 4,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.voltrixAccent,
    borderRadius: BorderRadius.lg,
    height: 54,
    marginTop: 8,
    shadowColor: Colors.voltrixAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  createBtnLoading: {
    opacity: 0.8,
  },
  createBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: Fonts.mono,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  loginText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  loginLink: {
    color: Colors.voltrixAccent,
    fontSize: 14,
    fontWeight: '600',
  },
  verificationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  verificationIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: Colors.voltrixAccentDim,
    borderWidth: 1.5,
    borderColor: Colors.voltrixAccentGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  verificationTitle: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  verificationText: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  verificationEmail: {
    color: Colors.voltrixAccent,
    fontWeight: '600',
  },
  verificationSub: {
    color: Colors.textTertiary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.voltrixAccentDim,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.voltrixAccentGlow,
  },
  backBtnText: {
    color: Colors.voltrixAccent,
    fontSize: 14,
    fontWeight: '600',
  },
});
