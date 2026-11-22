// mobile/components/fx/ClayPressable.tsx
// Clay squish press feedback shared by ClayButton, ProductCard and CategoryChip.

import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
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
import { ClayGradients, Colors, clayElevation, type ClayTone } from '@constants/theme';
import { ClayFinish, resolveClayRadius } from '@components/clay/ClayFinish';
import { Springs } from '@constants/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const usesElevation = Platform.OS === 'android';

export interface ClayPressableProps extends Omit<PressableProps, 'style' | 'children'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
  haptic?: boolean;
  loadingColor?: string;
  tone?: ClayTone;
  gradient?: boolean;
  pressScale?: number;
}

export function ClayPressable({
  children,
  style,
  loading = false,
  haptic = true,
  loadingColor = Colors.primary,
  tone,
  gradient = false,
  pressScale = 0.96,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  accessibilityLabel,
  ...rest
}: ClayPressableProps) {
  const pressure = useSharedValue(0);
  const reduced = useReducedMotion();
  const isDisabled = disabled || loading;
  const radius = resolveClayRadius(StyleSheet.flatten(style)?.borderRadius);

  const animatedStyle = useAnimatedStyle(() => {
    const depth = pressure.value;
    return {
      transform: [{ translateY: 2 * depth }, { scale: 1 + (pressScale - 1) * depth }],
      ...(gradient && tone && (usesElevation
        ? { elevation: clayElevation.elevation - depth * 4 }
        : {
            shadowOpacity: clayElevation.shadowOpacity - depth * 0.06,
            shadowRadius: clayElevation.shadowRadius - depth * 6,
          })),
    };
  });

  const handlePress = useCallback<NonNullable<PressableProps['onPress']>>(
    (event) => {
      if (haptic && Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      }
      onPress?.(event);
    },
    [haptic, onPress],
  );

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      if (!isDisabled && !reduced) {
        pressure.value = withSpring(1, { ...Springs.snappy, overshootClamping: true });
      }
      onPressIn?.(event);
    },
    [isDisabled, onPressIn, pressure, reduced],
  );

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (event) => {
      if (!reduced) pressure.value = withSpring(0, { ...Springs.snappy, overshootClamping: true });
      onPressOut?.(event);
    },
    [onPressOut, pressure, reduced],
  );

  return (
    <AnimatedPressable
      {...rest}
      disabled={isDisabled}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ ...rest.accessibilityState, disabled: isDisabled, busy: loading }}
      style={[
        tone && [clayElevation, { backgroundColor: ClayGradients[tone][gradient ? 0 : 1], elevation: gradient ? clayElevation.elevation : 3 }],
        style,
        tone && { borderRadius: radius },
        disabled && !loading && styles.disabled,
        reduced ? undefined : animatedStyle,
      ]}
    >
      {tone ? <ClayFinish tone={tone} radius={radius} gradient={gradient} /> : null}
      {loading ? <ActivityIndicator color={loadingColor} accessibilityLabel="Loading" /> : children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.55 },
});
