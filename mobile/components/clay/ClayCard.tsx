// mobile/components/clay/ClayCard.tsx
// Claymorphism card surface

import React from 'react';
import { View, StyleSheet, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { Colors, Radius, Spacing, clayElevation } from '@constants/theme';

export type ClayCardVariant = 'default' | 'mint' | 'peach' | 'lavender';

const variantBackground: Record<ClayCardVariant, string> = {
  default: Colors.white,
  mint: Colors.mint,
  peach: Colors.peach,
  lavender: Colors.lavender,
};

interface ClayCardProps extends ViewProps {
  variant?: ClayCardVariant;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function ClayCard({
  variant = 'default',
  style,
  children,
  ...rest
}: ClayCardProps) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: variantBackground[variant] },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    padding: Spacing.base,
    ...clayElevation,
  },
});

