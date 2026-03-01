import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

interface BiometricAuthState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  isSupported: boolean;
  error: string | null;
  authenticate: () => Promise<void>;
}

export function useBiometricAuth(): BiometricAuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const hasAuthenticatedOnce = useRef(false);
  // True only when the app genuinely entered background (Home button / app switcher),
  // NOT when a system modal (biometric prompt, passcode sheet) briefly makes it inactive.
  const wasInTrueBackground = useRef(false);
  // Timestamp of when the app entered background, used to distinguish genuine
  // backgrounding (long) from keyboard-triggered false AppState flickers (< 2s).
  const backgroundTimestampRef = useRef<number | null>(null);
  // Minimum time (ms) the app must be in background before we re-lock.
  // Keyboard-triggered background events on Android resolve in milliseconds;
  // genuine backgrounding always exceeds this threshold.
  const MIN_BACKGROUND_MS = 3000;
  // Keeps a stable reference to `isAuthenticating` so the AppState listener never
  // needs to be re-created when that flag flips, avoiding stale-closure issues.
  const isAuthenticatingRef = useRef(false);
  const authenticateRef = useRef<(() => Promise<void>) | null>(null);

  // Check if biometric auth is available
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Skip biometric on web
      setIsAuthenticated(true);
      setIsSupported(false);
      return;
    }

    const checkSupport = async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsSupported(compatible && enrolled);

      if (!compatible || !enrolled) {
        // No biometric support — auto-pass
        setIsAuthenticated(true);
      }
    };

    checkSupport();
  }, []);

  const authenticate = useCallback(async () => {
    if (!isSupported || isAuthenticatingRef.current) return;

    isAuthenticatingRef.current = true;
    setIsAuthenticating(true);
    setError(null);

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Voltrix',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        hasAuthenticatedOnce.current = true;
        setIsAuthenticated(true);
        setError(null);
      } else {
        switch (result.error) {
          case 'user_cancel':
            setError('Authentication cancelled');
            break;
          case 'lockout':
            setError('Too many attempts. Try again later.');
            break;
          case 'user_fallback':
            // User chose passcode fallback — still counts as authenticated
            hasAuthenticatedOnce.current = true;
            setIsAuthenticated(true);
            break;
          default:
            setError('Authentication failed. Try again.');
        }
      }
    } catch {
      setError('Authentication failed. Try again.');
    } finally {
      isAuthenticatingRef.current = false;
      setIsAuthenticating(false);
    }
  }, [isSupported]);

  // Keep authenticateRef in sync so the AppState listener can always call the
  // latest version without needing to re-subscribe.
  useEffect(() => {
    authenticateRef.current = authenticate;
  }, [authenticate]);

  // Re-authenticate ONLY when the app returns from true background.
  //
  // Key insight: iOS sends active → inactive when ANY system overlay appears
  // (biometric prompt, passcode sheet, notifications, control centre, etc.).
  // Only when the user presses the Home button / switches apps does the state
  // continue from inactive → background.
  //
  // Strategy:
  //   • Set wasInTrueBackground = true when we observe the 'background' state.
  //   • Only re-lock & prompt when: wasInTrueBackground is true AND we just
  //     became 'active' again.
  //   • This prevents the biometric modal's own close event (inactive → active,
  //     never touching 'background') from triggering another prompt.
  useEffect(() => {
    if (!isSupported) return;

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      // Mark that the app truly backgrounded (not just a transient system overlay).
      if (nextState === 'background') {
        wasInTrueBackground.current = true;
        backgroundTimestampRef.current = Date.now();
      }

      // App returned to foreground from GENUINE background → re-lock and prompt.
      // Guard: only re-lock if the app was backgrounded for long enough to rule out
      // keyboard-triggered false AppState flickers (which resolve in < 500 ms).
      if (
        nextState === 'active' &&
        wasInTrueBackground.current &&
        hasAuthenticatedOnce.current &&
        !isAuthenticatingRef.current
      ) {
        const elapsed = backgroundTimestampRef.current
          ? Date.now() - backgroundTimestampRef.current
          : MIN_BACKGROUND_MS;

        wasInTrueBackground.current = false;
        backgroundTimestampRef.current = null;

        if (elapsed >= MIN_BACKGROUND_MS) {
          setIsAuthenticated(false);
          setError(null);
          setTimeout(() => {
            authenticateRef.current?.();
          }, 500);
        }
      }

      // If we went inactive → active without ever hitting background (i.e. a
      // system modal dismissed), clear the background flag just in case and do
      // NOT re-lock.
      if (prevState === 'inactive' && nextState === 'active') {
        wasInTrueBackground.current = false;
        backgroundTimestampRef.current = null;
      }
    });

    return () => subscription.remove();
  }, [isSupported]); // stable — no longer depends on `authenticate`

  // Auto-trigger on initial mount when supported
  useEffect(() => {
    if (isSupported && !isAuthenticated && !hasAuthenticatedOnce.current) {
      const timer = setTimeout(() => {
        authenticate();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isSupported, isAuthenticated, authenticate]);

  return {
    isAuthenticated,
    isAuthenticating,
    isSupported,
    error,
    authenticate,
  };
}
