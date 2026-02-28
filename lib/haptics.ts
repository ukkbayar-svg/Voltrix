import { Platform } from 'react-native';

// Safe haptics wrapper - gracefully handles missing/corrupted expo-haptics package
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ExpoHaptics: any = null;

try {
  // Dynamic require to prevent Metro bundler crash if package is corrupted
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ExpoHaptics = require('expo-haptics');
} catch {
  // expo-haptics unavailable - silently degrade
}

export const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
} as const;

export type ImpactFeedbackStyleType = (typeof ImpactFeedbackStyle)[keyof typeof ImpactFeedbackStyle];

export const NotificationFeedbackType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
} as const;

export type NotificationFeedbackTypeValue = (typeof NotificationFeedbackType)[keyof typeof NotificationFeedbackType];

export const impactAsync = async (style: ImpactFeedbackStyleType = ImpactFeedbackStyle.Light): Promise<void> => {
  if (Platform.OS === 'web') return;
  try {
    if (ExpoHaptics?.impactAsync) {
      const key = (style.charAt(0).toUpperCase() + style.slice(1)) as 'Light' | 'Medium' | 'Heavy';
      const nativeStyle = ExpoHaptics?.ImpactFeedbackStyle?.[key] ?? style;
      await ExpoHaptics.impactAsync(nativeStyle);
    }
  } catch {
    // Silently fail - haptics are non-critical
  }
};

export const notificationAsync = async (type?: NotificationFeedbackTypeValue): Promise<void> => {
  if (Platform.OS === 'web') return;
  try {
    if (ExpoHaptics?.notificationAsync) {
      if (type) {
        const key = (type.charAt(0).toUpperCase() + type.slice(1)) as 'Success' | 'Warning' | 'Error';
        const nativeType = ExpoHaptics?.NotificationFeedbackType?.[key] ?? type;
        await ExpoHaptics.notificationAsync(nativeType);
      } else {
        await ExpoHaptics.notificationAsync();
      }
    }
  } catch {
    // Silently fail
  }
};

export const selectionAsync = async (): Promise<void> => {
  if (Platform.OS === 'web') return;
  try {
    if (ExpoHaptics?.selectionAsync) {
      await ExpoHaptics.selectionAsync();
    }
  } catch {
    // Silently fail
  }
};

export default { impactAsync, notificationAsync, selectionAsync, ImpactFeedbackStyle };
