// mobile/components/clay/ClayCard.tsx
// Claymorphism card surface

import React from 'react';
import { View, StyleSheet, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { ClayGradients, Colors, Spacing, clayElevation, type ClayTone } from '@constants/theme';
import { ClayFinish, resolveClayRadius } from './ClayFinish';

export type ClayCardVariant = 'default' | 'muted' | 'success' | 'error' | 'mint' | 'peach' | 'lavender';

const variantTone: Record<ClayCardVariant, ClayTone> = {
  default: 'oat',
  muted: 'muted',
  success: 'sage',
  error: 'blush',
  mint: 'sage',
  peach: 'blush',
  lavender: 'muted',
};

interface ClayCardProps extends ViewProps {
  variant?: ClayCardVariant;
  outlined?: boolean;
  gradient?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function ClayCard({
  variant = 'default',
  outlined = false,
  gradient = false,
  style,
  children,
  ...rest
}: ClayCardProps) {
  const tone = variantTone[variant];
  const radius = resolveClayRadius(StyleSheet.flatten(style)?.borderRadius);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: ClayGradients[tone][gradient ? 0 : 1], elevation: gradient ? clayElevation.elevation : 3 },
        style,
        { borderRadius: radius },
        outlined && styles.outlined,
      ]}
      {...rest}
    >
      <ClayFinish tone={tone} radius={radius} gradient={gradient} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.base,
    ...clayElevation,
  },
  outlined: { borderWidth: 1, borderColor: Colors.border },
});

