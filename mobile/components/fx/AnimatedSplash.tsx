// mobile/components/fx/AnimatedSplash.tsx
// Post-native splash with a logo entrance and handoff to the app.

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  ZoomIn,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { RemyLogo } from '@components/ui/RemyLogo';
import { ClayText } from '@components/ui/ClayText';
import { Colors, Spacing } from '@constants/theme';
import { Copy } from '@constants/copy';

export interface AnimatedSplashProps {
  /** True once fonts and auth state are ready. */
  ready: boolean;
  onFinish?: () => void;
}

const MIN_VISIBLE_MS = 900;
const MAX_VISIBLE_MS = 1800;
const badgeEntrance = ZoomIn.springify().damping(18);
const nameEntrance = FadeInDown.delay(120).springify().damping(18);
const taglineEntrance = FadeInDown.delay(220).springify().damping(18);

export function AnimatedSplash({ ready, onFinish }: AnimatedSplashProps) {
  const reduced = useReducedMotion();
  const [mountedAt] = useState(() => Date.now());
  const [done, setDone] = useState(false);
  const exiting = useRef(false);
  const finished = useRef(false);

  const opacity = useSharedValue(1);

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
  };

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

  const fadeOut = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (done) return null;

  return (
    <Animated.View style={[styles.overlay, fadeOut]} accessibilityViewIsModal>
      <Animated.View entering={reduced ? undefined : badgeEntrance}>
        <RemyLogo size="lg" tone="muted" badgeOnly gradient />
      </Animated.View>
      <Animated.View entering={reduced ? undefined : nameEntrance} style={styles.name}>
        <ClayText variant="wordmark">{Copy.app.name}</ClayText>
      </Animated.View>
      <Animated.View entering={reduced ? undefined : taglineEntrance}>
        <ClayText variant="body" color="textSecondary">{Copy.app.tagline}</ClayText>
      </Animated.View>
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
  name: { marginTop: Spacing.base, marginBottom: Spacing.xs },
});
