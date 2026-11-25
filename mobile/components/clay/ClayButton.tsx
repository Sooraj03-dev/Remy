// mobile/components/clay/ClayButton.tsx
// Clay pill button with tactile press feedback, optional leading AppIcon, and a loading spinner.

import React from 'react';
import { StyleSheet, View, type PressableProps, type TextStyle, type ViewStyle } from 'react-native';
import { ClayPressable } from '@components/fx/ClayPressable';
import { AppIcon, type ThemeColorToken } from '@components/ui/AppIcon';
import { ClayText } from '@components/ui/ClayText';
import type { IconName } from '@constants/icons';
import { Colors, Radius, Spacing, type ClayTone } from '@constants/theme';

export type ClayButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ClayButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ClayButtonVariant;
  leftIcon?: IconName;
  iconTint?: ThemeColorToken;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles: Record<
  ClayButtonVariant,
  { tone?: ClayTone; color: string; tint: ThemeColorToken }
> = {
  primary: {
    tone: 'espresso',
    color: Colors.background,
    tint: 'background',
  },
  secondary: {
    tone: 'muted',
    color: Colors.primary,
    tint: 'primary',
  },
  ghost: {
    color: Colors.primary,
    tint: 'primary',
  },
  danger: {
    tone: 'terracotta',
    color: Colors.surface,
    tint: 'surface',
  },
};

export function ClayButton({
  label,
  variant = 'primary',
  leftIcon,
  iconTint,
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
      gradient={variant === 'primary'}
      pressScale={0.97}
      style={[styles.base, style]}
    >
      <View style={styles.content}>
        {leftIcon ? <AppIcon name={leftIcon} size={18} tint={iconTint ?? vs.tint} /> : null}
        <ClayText
          variant="button"
          style={[{ color: vs.color }, textStyle]}
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
        >
          {label}
        </ClayText>
      </View>
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
});
