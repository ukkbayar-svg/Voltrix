import { Platform } from 'react-native';

export const Colors = {
  // Core backgrounds
  deepCharcoal: '#0B0E11',
  pureBlack: '#000000',
  cardBg: '#111419',
  cardBgLight: '#181C23',
  surfaceBg: '#1A1E26',
  borderDark: '#1E2330',
  borderLight: '#2A2F3C',

  // Accents
  neonGreen: '#00FF41',
  neonGreenDim: 'rgba(0, 255, 65, 0.15)',
  neonGreenGlow: 'rgba(0, 255, 65, 0.3)',
  crimsonRed: '#FF3B3B',
  crimsonRedDim: 'rgba(255, 59, 59, 0.15)',
  crimsonRedGlow: 'rgba(255, 59, 59, 0.3)',

  // Warnings
  orange: '#FF9500',
  orangeDim: 'rgba(255, 149, 0, 0.15)',
  yellow: '#FFD60A',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8A919E',
  textTertiary: '#5A6170',

  // Glassmorphism
  glassWhite: 'rgba(255, 255, 255, 0.06)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassOverlay: 'rgba(11, 14, 17, 0.85)',

  // Chart
  chartGrid: 'rgba(255, 255, 255, 0.04)',
  chartLine: '#00FF41',

  // Blue accent
  blue: '#007AFF',
  blueDim: 'rgba(0, 122, 255, 0.15)',
};

export const Fonts = {
  mono: Platform.select({
    ios: 'SpaceMono-Regular',
    android: 'SpaceMono-Regular',
    web: 'SpaceMono-Regular',
    default: 'SpaceMono-Regular',
  }),
  regular: Platform.select({
    ios: 'System',
    android: 'Roboto',
    web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'System',
  }),
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};
