import { Platform } from 'react-native';

export const Colors = {
  // Core backgrounds — ultra-dark Voltrix premium palette
  deepCharcoal: '#0A0B0F',
  pureBlack: '#000000',
  cardBg: '#0F1117',
  cardBgLight: '#151820',
  surfaceBg: '#181C26',
  borderDark: '#1C2035',
  borderLight: '#252A3C',

  // Voltrix Brand Accent — Electric Violet
  voltrixAccent: '#A855F7',
  voltrixAccentDim: 'rgba(168, 85, 247, 0.14)',
  voltrixAccentGlow: 'rgba(168, 85, 247, 0.32)',
  voltrixAccentBright: '#C084FC',

  // Trading: Positive/Buy
  neonGreen: '#00E676',
  neonGreenDim: 'rgba(0, 230, 118, 0.13)',
  neonGreenGlow: 'rgba(0, 230, 118, 0.28)',

  // Trading: Negative/Sell
  crimsonRed: '#FF3B5C',
  crimsonRedDim: 'rgba(255, 59, 92, 0.14)',
  crimsonRedGlow: 'rgba(255, 59, 92, 0.28)',

  // Warnings
  orange: '#FF9F0A',
  orangeDim: 'rgba(255, 159, 10, 0.14)',
  yellow: '#FFD60A',

  // Text
  textPrimary: '#F0F2FF',
  textSecondary: '#8A91A8',
  textTertiary: '#525870',

  // Glassmorphism
  glassWhite: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(168, 85, 247, 0.12)',
  glassOverlay: 'rgba(10, 11, 15, 0.88)',

  // Chart
  chartGrid: 'rgba(255, 255, 255, 0.03)',
  chartLine: '#00E676',

  // AI / Info accent — Electric Indigo
  blue: '#818CF8',
  blueDim: 'rgba(129, 140, 248, 0.13)',
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
