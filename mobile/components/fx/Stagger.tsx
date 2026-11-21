// mobile/components/fx/Stagger.tsx
// First-ten-items entrance stagger and shimmer skeletons.

import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Spacing } from '@constants/theme';
import { Stagger } from '@constants/motion';

/**
 * Entrance animation for a list item. Items past the first ten render instantly
 * so long lists stay cheap on mid-range Android.
 */
export function useStaggeredEntrance(index: number): FadeInDown | undefined {
  const reduced = useReducedMotion();
  if (reduced || index >= Stagger.maxAnimatedItems) return undefined;
  return FadeInDown.delay(index * Stagger.step)
    .duration(320)
    .springify()
    .damping(16)
    .stiffness(180);
}

/** Wrap a list item to get the capped entrance stagger. */
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
  }, [paused, progress, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.55,
    transform: [{ translateX: (progress.value * 2 - 1) * width }],
  }));

  if (reduced) return null;

  return (
    <Animated.View style={[styles.shimmer, animatedStyle]} pointerEvents="none">
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.85)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    overflow: 'hidden',
    padding: 0,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  block: { backgroundColor: Colors.lavender },
  lines: { padding: Spacing.md, gap: Spacing.sm },
  lineWide: { height: 12, borderRadius: 6, width: '82%' },
  lineShort: { height: 10, borderRadius: 5, width: '48%' },
  shimmer: { ...StyleSheet.absoluteFillObject },
  gradient: { flex: 1, width: '60%' },
});
