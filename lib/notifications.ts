import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase, updatePushToken } from './supabase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Request push notification permission and return token
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    const token = tokenData.data;

    // Store token in Supabase profiles table
    if (token && userId) {
      await updatePushToken(userId, token);
    }

    // Android-specific channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('voltrix-signals', {
        name: 'Voltrix Signals',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#A855F7',
        sound: 'default',
      });
    }

    return token;
  } catch {
    return null;
  }
}

// Send a local push notification for a new signal
export async function sendNewSignalNotification(
  symbol: string,
  type: string,
  entry: number
): Promise<void> {
  try {
    const decimalPlaces = entry > 100 ? 2 : 4;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🟣 New Voltrix Signal',
        body: `${symbol} ${type} at ${entry.toFixed(decimalPlaces)}!`,
        sound: 'default',
        data: { type: 'new_signal', symbol, tradeType: type, entry },
        color: '#A855F7',
      },
      trigger: null, // Fire immediately
    });
  } catch {
    // Silently fail if notification can't be sent
  }
}

// Subscribe to signals table and send notification on new INSERT
export function subscribeToSignalsForNotifications(
  isApproved: boolean,
  onNewSignal?: (symbol: string, type: string, entry: number) => void
): () => void {
  if (!isApproved) return () => {};

  const channel = supabase
    .channel('signals-notifications')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'signals' },
      async (payload) => {
        const signal = payload.new as {
          symbol: string;
          type: string;
          entry: number;
        };
        if (signal.symbol && signal.type && signal.entry) {
          await sendNewSignalNotification(signal.symbol, signal.type, signal.entry);
          onNewSignal?.(signal.symbol, signal.type, signal.entry);
        }
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}
