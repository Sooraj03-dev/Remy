// mobile/components/fx/VerifiedBadge.tsx
// Remy and a check seal with a single shine sweep when it first appears.

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { RemyArt } from '@components/ui/RemyArt';
import { Icon } from '@components/ui/Icon';
import { ClayText } from '@components/ui/ClayText';
import { Colors, Radius } from '@constants/theme';

export interface VerifiedBadgeProps {
  label?: string;
  compact?: boolean;
}

export function VerifiedBadge({ label = 'Verified', compact = false }: VerifiedBadgeProps) {
  const reduced = useReducedMotion();
  const shine = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    shine.value = withDelay(180, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }));
  }, [reduced, shine]);

  const shineStyle = useAnimatedStyle(() => ({
    opacity: shine.value === 0 || shine.value === 1 ? 0 : 0.8,
    transform: [{ translateX: (shine.value * 2 - 1) * 90 }],
  }));

  return (
    <View style={[styles.badge, compact && styles.compact]}>
      <View style={styles.mascot}>
        <RemyArt size={compact ? 20 : 23} />
      </View>
      <Icon name="SealCheck" size="sm" weight="fill" color="successText" />
      <ClayText variant="captionBold" style={styles.label}>
        {label}
      </ClayText>
      {reduced ? null : (
        <Animated.View style={[styles.shine, shineStyle]} pointerEvents="none">
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.9)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successBg,
    borderRadius: Radius.full,
    paddingVertical: 5,
    paddingHorizontal: 10,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  compact: { paddingVertical: 3, paddingHorizontal: 8 },
  mascot: { width: 26, height: 22, alignItems: 'center', justifyContent: 'center' },
  label: { color: Colors.successText },
  shine: { ...StyleSheet.absoluteFillObject },
});
