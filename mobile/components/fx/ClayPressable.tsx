// mobile/components/fx/ClayPressable.tsx
// Clay squish press feedback shared by ClayButton, ProductCard and CategoryChip.

import React, { useCallback } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '@constants/theme';
import { Springs } from '@constants/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ClayPressableProps extends Omit<PressableProps, 'style' | 'children'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Shows a three-dot bounce and blocks presses. */
  loading?: boolean;
  /** Defaults to a light selection tick. */
  haptic?: boolean;
  /** Dot colour while loading. */
  loadingColor?: string;
}

export function ClayPressable({
  children,
  style,
  loading = false,
  haptic = true,
  loadingColor,
  disabled,
  onPressIn,
  onPressOut,
  accessibilityLabel,
  ...rest
}: ClayPressableProps) {
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const reduced = useReducedMotion();
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: lift.value }],
  }));

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      if (!isDisabled) {
        scale.value = withSpring(0.96, Springs.snappy);
        lift.value = withSpring(1, Springs.snappy);
        if (haptic && Platform.OS !== 'web') {
          Haptics.selectionAsync().catch(() => undefined);
        }
      }
      onPressIn?.(event);
    },
    [haptic, isDisabled, lift, onPressIn, scale],
  );

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (event) => {
      scale.value = withSpring(1, Springs.bouncy);
      lift.value = withSpring(0, Springs.bouncy);
      onPressOut?.(event);
    },
    [lift, onPressOut, scale],
  );

  return (
    <AnimatedPressable
      {...rest}
      disabled={isDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, ...rest.accessibilityState }}
      style={[style, isDisabled && styles.disabled, reduced ? undefined : animatedStyle]}
    >
      {loading ? <Dots color={loadingColor} /> : children}
    </AnimatedPressable>
  );
}

/** Three clay dots that bounce in sequence while work is in flight. */
export function Dots({ color = Colors.primary }: { color?: string }) {
  return (
    <View style={styles.dots} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {[0, 1, 2].map((index) => (
        <BouncingDot key={index} index={index} color={color} />
      ))}
    </View>
  );
}

function BouncingDot({ index, color }: { index: number; color: string }) {
  const progress = useSharedValue(0);
  const reduced = useReducedMotion();

  React.useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      progress.value = withSpring(1, { damping: 8, stiffness: 220 }, (finished) => {
        if (finished) {
          progress.value = withSpring(0, { damping: 12, stiffness: 160 });
        }
      });
    };
    const timer = setInterval(run, 260 + index * 90);
    run();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [index, progress, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * progress.value }],
    opacity: 0.45 + progress.value * 0.55,
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, animatedStyle]} />;
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.55 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', height: 20 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
