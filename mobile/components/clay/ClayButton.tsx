// mobile/components/clay/ClayButton.tsx
// Claymorphism pill button — squish, haptics, dot loader and disabled style.

import React from 'react';
import { StyleSheet, type PressableProps, type TextStyle, type ViewStyle } from 'react-native';
import { ClayPressable } from '@components/fx/ClayPressable';
import { ClayText } from '@components/ui/ClayText';
import { Colors, Radius, Spacing, clayElevation } from '@constants/theme';

export type ClayButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ClayButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ClayButtonVariant;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles: Record<
  ClayButtonVariant,
  { container: ViewStyle; text: TextStyle; loadingColor: string; elevated: boolean }
> = {
  primary: {
    container: { backgroundColor: Colors.primary },
    text: { color: Colors.white },
    loadingColor: Colors.white,
    elevated: true,
  },
  secondary: {
    container: {
      backgroundColor: Colors.white,
      borderWidth: 1.5,
      borderColor: Colors.primary,
    },
    text: { color: Colors.primary },
    loadingColor: Colors.primary,
    elevated: true,
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: Colors.primary },
    loadingColor: Colors.primary,
    elevated: false,
  },
  danger: {
    container: { backgroundColor: Colors.error },
    text: { color: Colors.white },
    loadingColor: Colors.white,
    elevated: true,
  },
};

export function ClayButton({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  textStyle,
  ...rest
}: ClayButtonProps) {
  const vs = variantStyles[variant];

  return (
    <ClayPressable
      {...rest}
      loading={loading}
      loadingColor={vs.loadingColor}
      disabled={disabled || loading}
      accessibilityLabel={rest.accessibilityLabel ?? label}
      style={[styles.base, vs.elevated && clayElevation, vs.container, style]}
    >
      <ClayText variant="button" style={[vs.text, textStyle]} maxFontSizeMultiplier={1.2} numberOfLines={1}>
        {label}
      </ClayText>
    </ClayPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
