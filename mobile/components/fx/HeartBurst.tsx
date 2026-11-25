// mobile/components/fx/HeartBurst.tsx
// Wishlist heart: spring pop + radiating sparkle/heart particles + haptic.

import React, { useCallback, useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Icon } from '@components/ui/Icon';
import { Springs } from '@constants/motion';
import { Colors } from '@constants/theme';

export interface HeartBurstProps {
  active: boolean;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const SPARK_ANGLES = [-155, -121, -90, -59, -25];

export function HeartBurst({
  active,
  onPress,
  size = 24,
  disabled = false,
  accessibilityLabel = active ? 'Remove from wishlist' : 'Save to wishlist',
}: HeartBurstProps) {
  const reduced = useReducedMotion();
  const pop = useSharedValue(1);
  const burst = useSharedValue(1);
  const requestedSave = useRef(false);

  useEffect(() => {
    if (!requestedSave.current) return;
    if (active && !reduced) {
      burst.value = withSequence(withTiming(0, { duration: 0 }), withTiming(1, {
        duration: 340, easing: Easing.out(Easing.quad),
      }));
      pop.value = withSequence(withTiming(1.12, { duration: 85 }), withSpring(1, Springs.snappy));
    }
    if (active || !disabled) requestedSave.current = false;
  }, [active, burst, disabled, pop, reduced]);

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    requestedSave.current = !active;
    if (!reduced) {
      pop.value = withSequence(withTiming(0.9, { duration: 65 }), withSpring(1, Springs.snappy));
    }
    onPress();
  }, [active, onPress, pop, reduced]);

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
          <Icon name="Heart" size={size} weight={active ? 'fill' : 'regular'} color={active ? 'error' : 'text'} />
        </Animated.View>
      </Pressable>
      {!reduced
        ? SPARK_ANGLES.map((degrees) => (
            <Particle key={degrees} degrees={degrees} size={size} progress={burst} />
          ))
        : null}
    </View>
  );
}

function Particle({ degrees, size, progress }: { degrees: number; size: number; progress: SharedValue<number> }) {
  const angle = degrees * Math.PI / 180;
  const dx = Math.cos(angle) * size;
  const dy = Math.sin(angle) * size;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: dx * (0.48 + 0.7 * progress.value) },
      { translateY: dy * (0.48 + 0.7 * progress.value) },
      { scale: 1 - progress.value * 0.5 },
    ],
  }));

  return (
    <Animated.View style={[styles.particle, animatedStyle]} pointerEvents="none" />
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  hitArea: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.accent },
});
