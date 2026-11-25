// mobile/components/fx/MotionPrimitives.tsx
// Reusable, interruptible, reduced-motion-aware animation primitives (transform & opacity only).

import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { Durations, Easings, Springs } from '@constants/motion';
import { Colors } from '@constants/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Short horizontal shake for validation/submission errors. */
export function useShakeAnimation(triggerCount: number) {
  const reduced = useReducedMotion();
  const offset = useSharedValue(0);

  useEffect(() => {
    if (triggerCount <= 0 || reduced) {
      offset.value = 0;
      return;
    }
    offset.value = withSequence(
      withTiming(-8, { duration: 45, easing: Easing.linear }),
      withTiming(8, { duration: 60, easing: Easing.linear }),
      withTiming(-5, { duration: 55, easing: Easing.linear }),
      withTiming(3, { duration: 50, easing: Easing.linear }),
      withTiming(0, { duration: 45, easing: Easings.enter }),
    );
  }, [offset, reduced, triggerCount]);

  return useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));
}

/** Animated check draw inside a circular badge for OTP / checkout success. */
export function AnimatedCheckDraw({
  visible = true,
  size = 52,
  bgColor = Colors.successText,
  checkColor = Colors.white,
}: {
  visible?: boolean;
  size?: number;
  bgColor?: string;
  checkColor?: string;
}) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);
  const scale = useSharedValue(reduced ? 1 : 0.8);

  useEffect(() => {
    if (!visible) {
      progress.value = 0;
      scale.value = 0.8;
      return;
    }
    if (reduced) {
      progress.value = 1;
      scale.value = 1;
      return;
    }
    scale.value = withSpring(1, Springs.bouncy);
    progress.value = withDelay(90, withTiming(1, { duration: Durations.large, easing: Easings.enter }));
  }, [progress, reduced, scale, visible]);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pathLength = 26;
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLength * (1 - progress.value),
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.checkWrap, wrapStyle]} accessible accessibilityLabel="Success">
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <Circle cx={16} cy={16} r={15} fill={bgColor} />
        <AnimatedPath
          d="M10 16.5L14.2 20.5L22.5 11.5"
          fill="none"
          stroke={checkColor}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLength}
          animatedProps={animatedProps}
        />
      </Svg>
    </Animated.View>
  );
}

/** Soft opacity + scale pulse for online / unread status dots. */
export function PulseDot({
  color = Colors.successText,
  size = 8,
  active = true,
  style,
}: {
  color?: string;
  size?: number;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!active || reduced) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [active, pulse, reduced]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.85 }],
  }));

  return (
    <View style={[{ width: size * 2, height: size * 2 }, styles.dotCenter, style]}>
      {active && !reduced ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
            },
            haloStyle,
          ]}
        />
      ) : null}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** Three-dot typing / AI processing rhythm. */
export function TypingDots({ color = Colors.primary }: { color?: string }) {
  const reduced = useReducedMotion();
  const clock = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    clock.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(clock);
  }, [clock, reduced]);

  return (
    <View style={styles.dotsRow} accessibilityLabel="Typing">
      {[0, 1, 2].map((index) => (
        <TypingDotItem key={index} index={index} color={color} clock={clock} reduced={reduced} />
      ))}
    </View>
  );
}

function TypingDotItem({
  index,
  color,
  clock,
  reduced,
}: {
  index: number;
  color: string;
  clock: SharedValue<number>;
  reduced: boolean;
}) {
  const style = useAnimatedStyle(() => {
    if (reduced) return { opacity: 0.7 };
    const phase = (clock.value + index * 0.25) % 1;
    const wave = Math.sin(phase * Math.PI);
    return {
      opacity: 0.35 + wave * 0.65,
      transform: [{ translateY: -3 * wave }],
    };
  });

  return <Animated.View style={[styles.typingDot, { backgroundColor: color }, style]} />;
}

/** Fade + slight rise reveal for AI results or expanded sections. */
export function ExpandReveal({
  visible,
  children,
  style,
}: {
  visible: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  if (!visible) return null;

  return (
    <Animated.View
      entering={
        reduced
          ? undefined
          : FadeIn.duration(Durations.standard)
              .easing(Easings.enter)
              .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })
      }
      style={style}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  checkWrap: { alignItems: 'center', justifyContent: 'center' },
  dotCenter: { alignItems: 'center', justifyContent: 'center' },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  typingDot: { width: 6, height: 6, borderRadius: 3 },
});
