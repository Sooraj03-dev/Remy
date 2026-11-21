// mobile/constants/theme.ts
// Design tokens — single source of truth for all styling.
// Every component must import from here; no raw hex values in components.

import { StyleSheet } from 'react-native';

export const Colors = {
  background: '#F3EEFA',
  primary: '#B9A0EB',
  mint: '#CFF2E2',
  peach: '#FFC6BA',
  text: '#342949',
  textSecondary: '#7B6E8D',
  white: '#FFFFFF',
  error: '#FF6B6B',
  border: '#E2D5F5',
  shadowColor: '#B9A0EB',
  overlay: 'rgba(52,41,73,0.4)',
  // Lavender tint card
  lavender: '#E8DFFF',
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
  wordmark: 'Fredoka_700Bold',
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  heading: 'Fredoka_600SemiBold',
  button: 'Fredoka_600SemiBold',
  body: 'Nunito_400Regular',
  bodyMedium: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
} as const;

/** Reusable claymorphism outer elevation shadow */
export const clayElevation = {
  shadowColor: Colors.shadowColor,
  shadowOffset: { width: 4, height: 6 },
  shadowOpacity: 0.35,
  shadowRadius: 10,
  elevation: 8,
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

