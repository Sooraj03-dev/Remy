// mobile/components/fx/Stagger.tsx
// Staggered entrances (fade + 12dp rise, 40ms steps, max 8 items) and shimmer skeletons.

import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  cancelAnimation,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Radius, Spacing } from '@constants/theme';
import { Durations, Easings, Stagger } from '@constants/motion';

/** Entrance animation for static/staggered content (fade + 12dp rise, 40ms step, capped at 8). */
export function useStaggeredEntrance(index: number) {
  const reduced = useReducedMotion();
  if (reduced || index >= Stagger.maxAnimatedItems) return undefined;
  return FadeInDown.delay(index * Stagger.step)
    .duration(Durations.standard)
    .easing(Easings.enter)
    .withInitialValues({
      opacity: 0,
      transform: [{ translateY: Stagger.riseDistance }],
    });
}

export function StaggeredItem({
  index,
  children,
  style,
}: {
  index: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const entering = useStaggeredEntrance(index);
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}

interface SkeletonCardProps {
  width?: number;
  height?: number;
  paused?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonCard({ width = 160, height = 200, paused = false, style }: SkeletonCardProps) {
  return (
    <View style={[styles.card, { width, height }, style]} accessibilityLabel="Loading listing" accessibilityRole="progressbar">
      <View style={[styles.block, { height: height * 0.55 }]} />
      <View style={styles.lines}>
        <View style={[styles.block, styles.lineWide]} />
        <View style={[styles.block, styles.lineShort]} />
      </View>
      <ShimmerSweep width={width} paused={paused} />
    </View>
  );
}

export function ShimmerSweep({ width = 160, paused = false }: { width?: number; paused?: boolean }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (paused || reduced) {
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(
      withTiming(1, { duration: 1250, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [paused, progress, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.value * 2 - 1) * width }],
  }));

  if (reduced) return null;

  return (
    <Animated.View style={[styles.shimmer, animatedStyle]} pointerEvents="none" />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    overflow: 'hidden',
    padding: 0,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  block: { backgroundColor: Colors.surfaceMuted },
  lines: { padding: Spacing.md, gap: Spacing.sm },
  lineWide: { height: 12, borderRadius: 6, width: '82%' },
  lineShort: { height: 10, borderRadius: 5, width: '48%' },
  shimmer: { ...StyleSheet.absoluteFillObject, width: '36%', backgroundColor: Colors.white, opacity: 0.24 },
});
