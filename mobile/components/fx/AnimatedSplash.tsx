// mobile/components/fx/AnimatedSplash.tsx
// Post-native splash with a logo entrance and handoff to the app.

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { RemyLogo } from '@components/ui/RemyLogo';
import { FloatingBlobs } from './FloatingBlobs';
import { ClayText } from '@components/ui/ClayText';
import { Colors } from '@constants/theme';
import { Springs } from '@constants/motion';
import { Copy } from '@constants/copy';

export interface AnimatedSplashProps {
  /** True once fonts and auth state are ready. */
  ready: boolean;
  onFinish?: () => void;
}

const MIN_VISIBLE_MS = 900;
const MAX_VISIBLE_MS = 1800;

export function AnimatedSplash({ ready, onFinish }: AnimatedSplashProps) {
  const reduced = useReducedMotion();
  const [mountedAt] = useState(() => Date.now());
  const [done, setDone] = useState(false);
  const exiting = useRef(false);
  const finished = useRef(false);

  const opacity = useSharedValue(1);
  const scale = useSharedValue(reduced ? 1 : 0.72);
  const wobble = useSharedValue(0);
  const glow = useSharedValue(0);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    setDone(true);
    onFinish?.();
  };

  const exit = () => {
    if (exiting.current) return;
    exiting.current = true;
    opacity.value = withTiming(0, { duration: reduced ? 120 : 280, easing: Easing.out(Easing.quad) }, (ok) => {
      if (ok) runOnJS(finish)();
    });
    scale.value = withTiming(1.04, { duration: reduced ? 120 : 280 });
  };

  // Entrance
  useEffect(() => {
    if (reduced) return;
    scale.value = withSpring(1, Springs.bouncy);
    wobble.value = withDelay(
      260,
      withSequence(
        withTiming(-3, { duration: 140 }),
        withTiming(2.4, { duration: 140 }),
        withSpring(0, Springs.gentle),
      ),
    );
    glow.value = withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) }), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // Leave after the minimum display time once auth is ready…
  useEffect(() => {
    if (exiting.current) return;
    const elapsed = Date.now() - mountedAt;
    if (!ready) return;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const timer = setTimeout(exit, wait);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // …but never block the app for longer than the hard cap.
  useEffect(() => {
    const cap = setTimeout(exit, MAX_VISIBLE_MS);
    return () => clearTimeout(cap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${wobble.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + glow.value * 0.3,
    transform: [{ scale: 0.9 + glow.value * 0.12 }],
  }));

  if (done) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]} accessibilityViewIsModal>
      <FloatingBlobs variant="auth" />
      <Animated.View style={[styles.glow, glowStyle]} />
      <Animated.View style={logoStyle}>
        <RemyLogo size="lg" stacked style={styles.branding} />
      </Animated.View>
      <ClayText variant="caption" color="textSecondary" style={styles.tagline}>
        {Copy.app.tagline}
      </ClayText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 100,
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: Colors.primary,
  },
  branding: { minHeight: 195 },
  tagline: { marginTop: 6 },
});
