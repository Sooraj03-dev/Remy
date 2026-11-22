// mobile/components/fx/HeartBurst.tsx
// Wishlist heart: spring pop + radiating sparkle/heart particles + haptic.

import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Icon } from '@components/ui/Icon';
import { Springs } from '@constants/motion';

export interface HeartBurstProps {
  active: boolean;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const PARTICLES = 7;

export function HeartBurst({
  active,
  onPress,
  size = 24,
  disabled = false,
  accessibilityLabel = active ? 'Remove from wishlist' : 'Save to wishlist',
}: HeartBurstProps) {
  const reduced = useReducedMotion();
  const pop = useSharedValue(1);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (reduced) return;
    pop.value = withSequence(withSpring(1.25, Springs.bouncy), withSpring(1, Springs.bouncy));
  }, [active, pop, reduced]);

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    if (!active && !reduced) setBurst((key) => key + 1);
    onPress();
  }, [active, onPress, reduced]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: active, disabled }}
        hitSlop={12}
        style={styles.hitArea}
      >
        <Animated.View style={reduced ? undefined : heartStyle}>
          <Icon name="Heart" size={size} weight={active ? 'fill' : 'regular'} color={active ? 'error' : 'text'} decorative={false} accessibilityLabel={accessibilityLabel} />
        </Animated.View>
      </Pressable>
      {burst > 0 && !reduced
        ? Array.from({ length: PARTICLES }).map((_, index) => (
            <Particle key={`${burst}-${index}`} index={index} total={PARTICLES} size={size} />
          ))
        : null}
    </View>
  );
}

function Particle({ index, total, size }: { index: number; total: number; size: number }) {
  const progress = useSharedValue(0);
  const angle = (index / total) * Math.PI * 2;
  const distance = size * 1.8 + (index % 3) * 4;

  useEffect(() => {
    progress.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: Math.cos(angle) * distance * progress.value },
      { translateY: Math.sin(angle) * distance * progress.value },
      { scale: 1 - progress.value * 0.4 },
    ],
  }));

  return (
    <Animated.View style={[styles.particle, animatedStyle]} pointerEvents="none">
      <Icon name={index % 2 === 0 ? 'Heart' : 'SealCheck'} size={size * 0.42} weight="fill" color={index % 2 === 0 ? 'accent' : 'primary'} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  hitArea: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
