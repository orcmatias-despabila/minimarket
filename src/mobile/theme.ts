import { Platform } from 'react-native'

export const mobileTheme = {
  appName: 'Vendeapp',
  colors: {
    primary: '#22C55E',
    primaryDark: '#166534',
    primarySoft: '#ECFDF3',
    background: '#FFFFFF',
    surface: '#F3F4F6',
    card: '#FFFFFF',
    text: '#111827',
    muted: '#6B7280',
    border: '#E5E7EB',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#EF4444',
    white: '#FFFFFF',
    dark: '#0B1220',
    black: '#000000',
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
    full: 999,
  },
  fonts: {
    regular: 'Inter_400Regular',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
  shadows: {
    card: Platform.select({
      ios: {
        shadowColor: '#111827',
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 4,
      },
      default: {
        shadowColor: '#111827',
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
    }),
    button: Platform.select({
      ios: {
        shadowColor: '#166534',
        shadowOpacity: 0.16,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 3,
      },
      default: {
        shadowColor: '#166534',
        shadowOpacity: 0.16,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      },
    }),
  },
} as const

export const appFonts = {
  regular: {
    fontFamily: mobileTheme.fonts.regular,
  },
  semibold: {
    fontFamily: mobileTheme.fonts.semibold,
  },
  bold: {
    fontFamily: mobileTheme.fonts.bold,
  },
} as const
