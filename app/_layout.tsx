import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useBiometricAuth } from '@/lib/useBiometricAuth';
import BiometricScreen from '@/components/BiometricScreen';
import { registerForPushNotifications, subscribeToSignalsForNotifications } from '@/lib/notifications';
import { useApproval } from '@/lib/useApproval';

SplashScreen.preventAutoHideAsync();

function AuthRouteGuard({
  isApproved,
  isAdmin,
  approvalLoading,
}: {
  isApproved: boolean;
  isAdmin: boolean;
  approvalLoading: boolean;
}) {
  const router = useRouter();
  const segments = useSegments();
  const { user, isInitialized } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;

    const root = segments[0];

    const inAuth =
      root === '(auth)' ||
      root === 'auth' ||
      root === 'login' ||
      root === 'signup' ||
      root === 'forgot-password';

    const isPendingRoute = root === 'pending';

    // Onboarding and auth routes are always reachable.
    const isProtected = root === '(tabs)' || root === 'signal' || root === 'admin' || isPendingRoute;

    if (!user && isProtected) {
      router.replace('/(auth)/login');
      return;
    }

    if (user && inAuth) {
      router.replace('/');
      return;
    }

    // Signed-in but not approved → block all app content until admin approves.
    if (user && !isAdmin && !approvalLoading && !isApproved && !inAuth && root !== 'onboarding' && !isPendingRoute) {
      router.replace('/pending');
      return;
    }

    // Approved users should never stay on the pending screen.
    if (user && !approvalLoading && (isApproved || isAdmin) && isPendingRoute) {
      router.replace('/(tabs)');
    }
  }, [segments, router, user, isInitialized, isApproved, isAdmin, approvalLoading]);

  return null;
}

function AppWithBiometric() {
  const { isAuthenticated, isAuthenticating, isSupported, error, authenticate } = useBiometricAuth();
  const { user } = useAuth();
  const { isApproved, isAdmin, isLoading: approvalLoading } = useApproval();

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

  return (
    <>
      <AuthRouteGuard isApproved={isApproved} isAdmin={isAdmin} approvalLoading={approvalLoading} />
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
        <Stack.Screen name="pending" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="signal/[id]"
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="auth/reset" />
        <Stack.Screen name="auth/ctrader" />
        <Stack.Screen
          name="admin"
          options={{
            gestureEnabled: false,
            animation: 'fade',
          }}
        />
      </Stack>
      {/* Render BiometricScreen as an overlay so the Stack stays mounted. */}
      {isSupported && !isAuthenticated && (
        <BiometricScreen
          onAuthenticate={authenticate}
          isAuthenticating={isAuthenticating}
          error={error}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    'SpaceMono-Regular': require('@/assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [loaded, fontError]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Prevent the red error overlay from showing "Error [object Object]".
      event.preventDefault();

      const reason = event.reason;
      let message = 'Unhandled promise rejection';

      if (reason instanceof Error) {
        message = reason.message;
      } else if (typeof reason === 'string') {
        message = reason;
      } else {
        try {
          message = JSON.stringify(reason);
        } catch {
          message = String(reason);
        }
      }

      // eslint-disable-next-line no-console
      console.error('Unhandled promise rejection:', message, reason);
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  if (!loaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppWithBiometric />
    </AuthProvider>
  );
}