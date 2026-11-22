// mobile/constants/theme.ts
// Design tokens — single source of truth for all styling.
// Every component must import from here; no raw hex values in components.

import { StyleSheet } from 'react-native';

const surface = '#FFFFFF';
const textPrimary = '#241710';
const errorText = '#A8422B';

export const Colors = {
  background: '#FAF6F1',
  surface,
  surfaceMuted: '#F2EAE1',
  input: '#EFE6DC',
  border: '#E6DDD3',
  primary: '#4A2E1B',
  primarySoft: '#EADFD5',
  accent: '#C47B48',
  accentSoft: '#F4DECB',
  textPrimary,
  textSecondary: '#78655A',
  successBg: '#EBF2EB',
  successText: '#2D5236',
  errorBg: '#FCEEE9',
  errorText,
  warningBg: '#F8EBD7',
  warningText: '#774C23',
  shadowColor: '#4A2E1B',
  overlay: 'rgba(36,23,16,0.46)',
  // Stable token names used by existing screens and component props.
  text: textPrimary,
  white: surface,
  error: errorText,
} as const;

export const ClayGradients = {
  oat: [Colors.surface, Colors.background, '#F5EDE4'],
  muted: ['#FFFCF8', Colors.surfaceMuted, '#E9DCD0'],
  espresso: ['#69462E', Colors.primary, '#3E2414'],
  caramel: ['#F8DCCA', '#E7B38E', '#C98A60'],
  sage: ['#F9FCF9', Colors.successBg, '#DDE8DE'],
  terracotta: [Colors.errorText, '#983D29', '#7D301F'],
  blush: ['#FFFCFB', Colors.errorBg, '#F1DCD4'],
} as const;

export type ClayTone = keyof typeof ClayGradients;

export const ClayEdges = {
  light: {
    borderTopColor: 'rgba(255,255,255,0.85)',
    borderLeftColor: 'rgba(255,255,255,0.70)',
    borderBottomColor: 'rgba(74,46,27,0.16)',
    borderRightColor: 'rgba(74,46,27,0.10)',
  },
  dark: {
    borderTopColor: 'rgba(255,235,215,0.30)',
    borderLeftColor: 'rgba(255,235,215,0.22)',
    borderBottomColor: 'rgba(36,23,16,0.48)',
    borderRightColor: 'rgba(36,23,16,0.34)',
  },
  inset: {
    borderTopColor: 'rgba(74,46,27,0.12)',
    borderLeftColor: 'rgba(74,46,27,0.12)',
    borderBottomColor: 'rgba(255,255,255,0.85)',
    borderRightColor: 'rgba(255,255,255,0.85)',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  sm: 12,
  md: 20,
  card: 24,
  lg: 28,
  xl: 36,
  full: 999,
} as const;

export const FontSize = {
  wordmark: 34,
  h1: 28,
  h2: 22,
  h3: 18,
  body: 15,
  caption: 12,
  button: 16,
} as const;

export const FontWeight = {
  regular: '400' as const,
  semiBold: '600' as const,
  bold: '700' as const,
};

/**
 * One family per weight. Android does not select custom font files from
 * `fontWeight`, so every weight is a distinct family name registered in
 * the root layout. Never use fontWeight with these families.
 */
export const FontFamily = {
  wordmark: 'PlusJakartaSans_700Bold',
  display: 'PlusJakartaSans_700Bold',
  displayBold: 'PlusJakartaSans_700Bold',
  heading: 'PlusJakartaSans_700Bold',
  button: 'PlusJakartaSans_600SemiBold',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
} as const;

/** Reusable claymorphism outer elevation shadow */
export const clayElevation = {
  shadowColor: Colors.shadowColor,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.14,
  shadowRadius: 14,
  elevation: 6,
} as const;

/** Typography presets */
export const Typography = StyleSheet.create({
  wordmark: { fontSize: FontSize.wordmark, fontFamily: FontFamily.wordmark, color: Colors.text },
  h1: { fontSize: FontSize.h1, fontFamily: FontFamily.displayBold, color: Colors.text },
  h2: { fontSize: FontSize.h2, fontFamily: FontFamily.displayBold, color: Colors.text },
  h3: { fontSize: FontSize.h3, fontFamily: FontFamily.heading, color: Colors.text },
  body: { fontSize: FontSize.body, fontFamily: FontFamily.body, color: Colors.text },
  bodyBold: { fontSize: FontSize.body, fontFamily: FontFamily.bodyBold, color: Colors.text },
  caption: { fontSize: FontSize.caption, fontFamily: FontFamily.body, color: Colors.textSecondary },
  captionBold: { fontSize: FontSize.caption, fontFamily: FontFamily.bodyMedium, color: Colors.textSecondary },
  button: { fontSize: FontSize.button, fontFamily: FontFamily.button, color: Colors.white },
});

export type TypographyVariant = keyof typeof Typography;

