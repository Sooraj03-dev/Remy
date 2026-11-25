// mobile/components/clay/ClayFinish.tsx
// Clean uniform surface gradient and hairline border (no asymmetric corner-notch bevels).

import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ClayGradients, Colors, Radius, type ClayTone } from '@constants/theme';

interface ClayFinishProps {
  tone?: ClayTone;
  radius?: number;
  gradient?: boolean;
  outlined?: boolean;
}

export function resolveClayRadius(radius: ViewStyle['borderRadius']) {
  return typeof radius === 'number' ? Math.min(Radius.lg, Math.max(16, radius)) : Radius.card;
}

/** Decorative face and uniform border. Parent supplies shape and shadow. */
export const ClayFinish = React.memo(function ClayFinish({
  tone = 'oat',
  radius = Radius.card,
  gradient = false,
  outlined = false,
}: ClayFinishProps) {
  const isDark = tone === 'espresso' || tone === 'terracotta';
  const borderColor = isDark
    ? 'rgba(255,235,215,0.18)'
    : outlined
    ? Colors.border
    : 'rgba(74,46,27,0.08)';

  return (
    <View
      style={[styles.clip, { borderRadius: radius, borderColor }]}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
    >
      {gradient ? (
        <LinearGradient
          colors={ClayGradients[tone]}
          locations={[0, 0.42, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  clip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderWidth: 1,
  },
});
