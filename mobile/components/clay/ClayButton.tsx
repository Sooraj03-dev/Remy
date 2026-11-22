// mobile/components/clay/ClayButton.tsx
// Clay pill button with tactile press feedback and a loading spinner.

import React from 'react';
import { StyleSheet, type PressableProps, type TextStyle, type ViewStyle } from 'react-native';
import { ClayPressable } from '@components/fx/ClayPressable';
import { ClayText } from '@components/ui/ClayText';
import { Colors, Radius, Spacing, type ClayTone } from '@constants/theme';

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
  { tone?: ClayTone; color: string }
> = {
  primary: {
    tone: 'espresso',
    color: Colors.background,
  },
  secondary: {
    tone: 'muted',
    color: Colors.primary,
  },
  ghost: {
    color: Colors.primary,
  },
  danger: {
    tone: 'terracotta',
    color: Colors.surface,
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
      loadingColor={vs.color}
      disabled={disabled}
      accessibilityLabel={rest.accessibilityLabel ?? label}
      tone={vs.tone}
      pressScale={0.95}
      style={[styles.base, style]}
    >
      <ClayText variant="button" style={[{ color: vs.color }, textStyle]} maxFontSizeMultiplier={1.2} numberOfLines={1}>
        {label}
      </ClayText>
    </ClayPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: Radius.card,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
