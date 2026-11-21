// mobile/components/fx/FloatingBlobs.tsx
// Slow pastel clay blobs for headers, auth screens and empty states.

import React, { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@constants/theme';

type BlobTone = 'lavender' | 'mint' | 'peach';

const TONES: Record<BlobTone, string> = {
  lavender: Colors.primary,
  mint: Colors.mint,
  peach: Colors.peach,
};

interface BlobSpec {
  tone: BlobTone;
  size: number;
  top: number;
  left: DimensionValue;
  opacity: number;
  drift: [number, number];
  duration: number;
}

const LAYOUTS: Record<'header' | 'auth' | 'empty', BlobSpec[]> = {
  header: [
    { tone: 'lavender', size: 180, top: -70, left: '-8%', opacity: 0.5, drift: [14, 10], duration: 7000 },
    { tone: 'mint', size: 130, top: -30, left: '58%', opacity: 0.55, drift: [-12, 12], duration: 8600 },
    { tone: 'peach', size: 96, top: 30, left: '28%', opacity: 0.4, drift: [10, -8], duration: 9600 },
  ],
  auth: [
    { tone: 'lavender', size: 220, top: -90, left: '-20%', opacity: 0.45, drift: [18, 12], duration: 8200 },
    { tone: 'mint', size: 160, top: 60, left: '62%', opacity: 0.5, drift: [-14, 16], duration: 7400 },
    { tone: 'peach', size: 120, top: 200, left: '4%', opacity: 0.35, drift: [12, -10], duration: 9000 },
  ],
  empty: [
    { tone: 'lavender', size: 160, top: -40, left: '8%', opacity: 0.4, drift: [10, 8], duration: 8000 },
    { tone: 'mint', size: 120, top: 20, left: '64%', opacity: 0.45, drift: [-10, 10], duration: 9000 },
  ],
};

export interface FloatingBlobsProps {
  variant?: 'header' | 'auth' | 'empty';
  /** Set false when the screen loses focus so loops are cancelled. */
  paused?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function FloatingBlobs({ variant = 'header', paused = false, style }: FloatingBlobsProps) {
  return (
    <View pointerEvents="none" style={[styles.container, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {LAYOUTS[variant].map((spec, index) => (
        <Blob key={`${variant}-${index}`} spec={spec} paused={paused} />
      ))}
    </View>
  );
}

function Blob({ spec, paused }: { spec: BlobSpec; paused: boolean }) {
  const reduced = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (paused || reduced) {
      drift.value = withTiming(0, { duration: 200 });
      return;
    }
    drift.value = withRepeat(
      withTiming(1, { duration: spec.duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [drift, paused, reduced, spec.duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: drift.value * spec.drift[0] },
      { translateY: drift.value * spec.drift[1] },
      { scale: 1 + drift.value * 0.06 },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.blob,
        {
          width: spec.size,
          height: spec.size * 0.82,
          borderRadius: spec.size,
          top: spec.top,
          left: spec.left,
          opacity: spec.opacity,
          backgroundColor: TONES[spec.tone],
        },
        reduced ? undefined : animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  blob: { position: 'absolute' },
});
