import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@fastshot/auth';
import { supabase } from '@/lib/supabase';
import { useBiometricAuth } from '@/lib/useBiometricAuth';
import BiometricScreen from '@/components/BiometricScreen';
import { registerForPushNotifications, subscribeToSignalsForNotifications } from '@/lib/notifications';
import { useApproval } from '@/lib/useApproval';

SplashScreen.preventAutoHideAsync();

function AppWithBiometric() {
  const { isAuthenticated, isAuthenticating, isSupported, error, authenticate } = useBiometricAuth();
  const { user } = useAuth();
  const { isApproved, isAdmin } = useApproval();

  // Register push notifications when user logs in
  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications(user.id);
    }
  }, [user?.id]);

  // Subscribe to new signals for push notifications (only approved users)
  useEffect(() => {
    if (!user?.id || (!isApproved && !isAdmin)) return;

    const unsubscribe = subscribeToSignalsForNotifications(true);
    return unsubscribe;
  }, [user?.id, isApproved, isAdmin]);

  // Show biometric screen if not authenticated yet
  if (isSupported && !isAuthenticated) {
    return (
      <BiometricScreen
        onAuthenticate={authenticate}
        isAuthenticating={isAuthenticating}
        error={error}
      />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      <Stack.Screen
        name="signal/[id]"
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen name="auth/callback" />
      <Stack.Screen
        name="admin"
        options={{
          gestureEnabled: false,
          animation: 'fade',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'SpaceMono-Regular': require('@/assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <AuthProvider
      supabaseClient={supabase}
      routes={{
        login: '/(auth)/login',
        afterLogin: '/(tabs)',
        protected: ['tabs', 'app', 'admin'],
        guest: ['auth'],
      }}
    >
      <StatusBar style="light" />
      <AppWithBiometric />
    </AuthProvider>
  );
}
