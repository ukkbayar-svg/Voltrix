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
    if (!isSupported || isAuthenticating) return;

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
        setIsAuthenticated(true);
        setError(null);
        hasAuthenticatedOnce.current = true;
      } else {
        switch (result.error) {
          case 'user_cancel':
            setError('Authentication cancelled');
            break;
          case 'lockout':
            setError('Too many attempts. Try again later.');
            break;
          case 'user_fallback':
            // User chose passcode - attempt again with passcode
            setIsAuthenticated(true);
            hasAuthenticatedOnce.current = true;
            break;
          default:
            setError('Authentication failed. Try again.');
        }
      }
    } catch {
      setError('Authentication failed. Try again.');
    } finally {
      setIsAuthenticating(false);
    }
  }, [isSupported, isAuthenticating]);

  // Re-authenticate when app comes to foreground
  useEffect(() => {
    if (!isSupported) return;

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      // App moved from background to foreground
      if (
        (prevState === 'background' || prevState === 'inactive') &&
        nextState === 'active' &&
        hasAuthenticatedOnce.current
      ) {
        // Lock the screen and require re-authentication
        setIsAuthenticated(false);
        setError(null);
        // Auto-trigger auth after brief delay
        setTimeout(() => {
          authenticate();
        }, 500);
      }
    });

    return () => subscription.remove();
  }, [isSupported, authenticate]);

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
