import React, { useState, useEffect, useRef } from 'react';
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
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
  FadeInDown,
  FadeInUp,
  Easing,
} from 'react-native-reanimated';
import { Colors, Fonts, BorderRadius, Spacing } from '@/constants/theme';

// Security Pulse animation component
function SecurityPulse({ active }: { active: boolean }) {
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);
  const opacity1 = useSharedValue(0.6);
  const opacity2 = useSharedValue(0.4);
  const opacity3 = useSharedValue(0.2);

  useEffect(() => {
    if (active) {
      scale1.value = withRepeat(
        withSequence(
          withTiming(1.6, { duration: 1200, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 0 })
        ),
        -1,
        false
      );
      scale2.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(2.0, { duration: 1200, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 0 })
        ),
        -1,
        false
      );
      scale3.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(2.4, { duration: 1200, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 0 })
        ),
        -1,
        false
      );
      opacity1.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 600 }),
          withTiming(0, { duration: 600 })
        ),
        -1,
        false
      );
      opacity2.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.35, { duration: 600 }),
          withTiming(0, { duration: 600 })
        ),
        -1,
        false
      );
      opacity3.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.18, { duration: 600 }),
          withTiming(0, { duration: 600 })
        ),
        -1,
        false
      );
    }
  }, [active, scale1, scale2, scale3, opacity1, opacity2, opacity3]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
    opacity: opacity1.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
    opacity: opacity2.value,
  }));
  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale3.value }],
    opacity: opacity3.value,
  }));

  return (
    <View style={styles.pulseContainer}>
      <Animated.View style={[styles.pulseRing, styles.pulseRing3, ring3Style]} />
      <Animated.View style={[styles.pulseRing, styles.pulseRing2, ring2Style]} />
      <Animated.View style={[styles.pulseRing, styles.pulseRing1, ring1Style]} />
    </View>
  );
}

// Glowing Logo component
function VoltrixLogo() {
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.6);

  useEffect(() => {
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [glowScale, glowOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.logoContainer}>
      <Animated.View style={[styles.logoGlow, glowStyle]} />
      <View style={styles.logoIconWrapper}>
        <View style={styles.logoHexagon}>
          <Ionicons name="flash" size={40} color={Colors.voltrixAccent} />
        </View>
      </View>
      <Text style={styles.logoText}>VOLTRIX</Text>
      <Text style={styles.logoSubtext}>THE VAULT</Text>
    </View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithEmail, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    clearError?.();
    await signInWithEmail(email.trim(), password);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Background gradient layers */}
      <View style={styles.bgGradient1} />
      <View style={styles.bgGradient2} />
      <View style={styles.bgGrid} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <Animated.View entering={FadeIn.duration(800)} style={styles.logoSection}>
            <VoltrixLogo />
          </Animated.View>

          {/* Title */}
          <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.titleSection}>
            <Text style={styles.title}>Secure Access</Text>
            <Text style={styles.subtitle}>Enter your credentials to unlock the Vault</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.formSection}>
            {/* Error */}
            {error && (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={Colors.crimsonRed} />
                <Text style={styles.errorText}>{error.message}</Text>
              </Animated.View>
            )}

            {/* Email Field */}
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
                onChangeText={(t) => { setEmail(t); clearError?.(); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            {/* Password Field */}
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
                placeholder="Password"
                placeholderTextColor={Colors.textTertiary}
                value={password}
                onChangeText={(t) => { setPassword(t); clearError?.(); }}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={Colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <View style={styles.forgotRow}>
              <Link href="/(auth)/forgot-password" asChild>
                <TouchableOpacity>
                  <Text style={styles.forgotText}>Forgot access key?</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Login Button with Security Pulse */}
            <View style={styles.loginBtnWrapper}>
              <SecurityPulse active={isPressing || isLoading} />
              <Pressable
                style={[styles.loginBtn, isLoading && styles.loginBtnLoading]}
                onPress={handleLogin}
                onPressIn={() => setIsPressing(true)}
                onPressOut={() => setIsPressing(false)}
                disabled={isLoading || !email || !password}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={18} color="#000" />
                    <Text style={styles.loginBtnText}>UNLOCK VAULT</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Animated.View>

          {/* Sign Up Link */}
          <Animated.View entering={FadeInUp.delay(700).duration(600)} style={styles.signupRow}>
            <Text style={styles.signupText}>New to Voltrix? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.signupLink}>Create Vault Account</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>

          {/* Security badge */}
          <Animated.View entering={FadeInUp.delay(900).duration(600)} style={styles.securityBadge}>
            <Ionicons name="lock-closed" size={12} color={Colors.textTertiary} />
            <Text style={styles.securityText}>256-bit encrypted · Supabase Auth</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const PULSE_SIZE = 80;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.pureBlack,
  },
  bgGradient1: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(168, 85, 247, 0.06)',
  },
  bgGradient2: {
    position: 'absolute',
    bottom: 0,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(168, 85, 247, 0.04)',
  },
  bgGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.03,
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 20,
    alignItems: 'center',
    gap: Spacing.xl,
    minHeight: '100%',
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 20,
  },
  logoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(168, 85, 247, 0.18)',
    shadowColor: Colors.voltrixAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
  },
  logoIconWrapper: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHexagon: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: Colors.voltrixAccentDim,
    borderWidth: 1.5,
    borderColor: Colors.voltrixAccentGlow,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.voltrixAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  logoText: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 6,
    fontFamily: Fonts.mono,
  },
  logoSubtext: {
    color: Colors.voltrixAccent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 5,
    opacity: 0.8,
  },
  titleSection: {
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
  forgotRow: {
    alignItems: 'flex-end',
  },
  forgotText: {
    color: Colors.voltrixAccent,
    fontSize: 13,
    fontWeight: '500',
  },
  loginBtnWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginTop: 8,
  },
  pulseContainer: {
    position: 'absolute',
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: 60,
    borderWidth: 1.5,
  },
  pulseRing1: {
    width: PULSE_SIZE * 1.2,
    height: PULSE_SIZE * 0.7,
    borderColor: 'rgba(168, 85, 247, 0.6)',
    borderRadius: 40,
  },
  pulseRing2: {
    width: PULSE_SIZE * 1.5,
    height: PULSE_SIZE * 0.85,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    borderRadius: 50,
  },
  pulseRing3: {
    width: PULSE_SIZE * 1.8,
    height: PULSE_SIZE,
    borderColor: 'rgba(168, 85, 247, 0.18)',
    borderRadius: 60,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.voltrixAccent,
    borderRadius: BorderRadius.lg,
    height: 54,
    width: '100%',
    shadowColor: Colors.voltrixAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginBtnLoading: {
    opacity: 0.8,
  },
  loginBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: Fonts.mono,
  },
  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signupText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  signupLink: {
    color: Colors.voltrixAccent,
    fontSize: 14,
    fontWeight: '600',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  securityText: {
    color: Colors.textTertiary,
    fontSize: 11,
  },
});
