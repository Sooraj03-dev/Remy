// mobile/components/fx/AnimatedOwl.tsx
// The Thrifty Owl mascot: code-driven Reanimated + SVG, transform/opacity only.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { OwlBodyOnly, OWL_GEOMETRY, OWL_VIEWBOX } from './OwlArt';
import { ClayText } from '@components/ui/ClayText';
import { Colors } from '@constants/theme';
import { Springs } from '@constants/motion';
import { Copy } from '@constants/copy';

export type OwlMood = 'idle' | 'happy' | 'curious' | 'sleepy' | 'shocked' | 'celebrate';

export interface AnimatedOwlProps {
  mood?: OwlMood;
  size?: number;
  /** Pause looping animations when the screen is not focused. */
  paused?: boolean;
  /** Normalised -1..1 target used by the curious mood. */
  lookAt?: { x: number; y: number };
  bubble?: boolean;
  onHoot?: () => void;
  accessibilityLabel?: string;
}

const CONFETTI_COLORS = [Colors.primary, Colors.successBg, Colors.accentSoft, Colors.text, Colors.white];

export function AnimatedOwl({
  mood = 'idle',
  size = 180,
  paused = false,
  lookAt,
  bubble = true,
  onHoot,
  accessibilityLabel = 'Thrifty Owl mascot. Tap for a hoot.',
}: AnimatedOwlProps) {
  const reduced = useReducedMotion();

  const breath = useSharedValue(1);
  const tilt = useSharedValue(0);
  const hop = useSharedValue(0);
  const eyeOpen = useSharedValue(1);
  const pupilX = useSharedValue(0);
  const pupilY = useSharedValue(0);
  const spin = useSharedValue(0);
  const zzz = useSharedValue(0);
  const toastOpacity = useSharedValue(0);
  const toastLift = useSharedValue(0);

  const [burstKey, setBurstKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const taps = useRef<number[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scale = size / OWL_VIEWBOX.width;
  const height = size * (OWL_VIEWBOX.height / OWL_VIEWBOX.width);
  const eyeSize = (OWL_GEOMETRY.eye.r * 2 + 8) * scale;
  const pupilSize = (OWL_GEOMETRY.pupil.r * 2 + 4) * scale;

  useEffect(() => {
    // Reset every value so mood changes never stack animations.
    cancelAnimation(breath);
    cancelAnimation(tilt);
    cancelAnimation(hop);
    cancelAnimation(eyeOpen);
    cancelAnimation(pupilX);
    cancelAnimation(pupilY);
    cancelAnimation(spin);
    cancelAnimation(zzz);
    breath.value = 1;
    tilt.value = 0;
    hop.value = 0;
    eyeOpen.value = 1;
    pupilX.value = 0;
    pupilY.value = 0;
    spin.value = 0;
    zzz.value = 0;

    if (reduced || paused) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const scheduleBlink = (delay: number) => {
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          eyeOpen.value = withSequence(
            withTiming(0.08, { duration: 80 }),
            withTiming(1, { duration: 110 }),
          );
          scheduleBlink(3000 + Math.random() * 2000);
        }, delay),
      );
    };

    const driftPupils = () => {
      pupilX.value = withTiming((Math.random() - 0.5) * 2 * (size * 0.028), {
        duration: 1400,
        easing: Easing.inOut(Easing.sin),
      });
      pupilY.value = withTiming((Math.random() - 0.5) * 2 * (size * 0.02), {
        duration: 1400,
        easing: Easing.inOut(Easing.sin),
      });
      timers.push(setTimeout(driftPupils, 1800));
    };

    switch (mood) {
      case 'idle':
        breath.value = withRepeat(withTiming(1.035, { duration: 2200, easing: Easing.inOut(Easing.ease) }), -1, true);
        scheduleBlink(1600);
        timers.push(setTimeout(driftPupils, 1200));
        break;
      case 'happy':
        eyeOpen.value = withTiming(0.45, { duration: 200 });
        hop.value = withRepeat(
          withSequence(withTiming(-size * 0.08, { duration: 180 }), withSpring(0, Springs.bouncy)),
          2,
          false,
        );
        break;
      case 'curious':
        tilt.value = withSpring(8, Springs.gentle);
        pupilX.value = withSpring((lookAt?.x ?? 0.6) * size * 0.032, Springs.gentle);
        pupilY.value = withSpring((lookAt?.y ?? 0) * size * 0.024, Springs.gentle);
        scheduleBlink(2800);
        break;
      case 'sleepy':
        eyeOpen.value = withTiming(0.16, { duration: 600 });
        breath.value = withRepeat(withTiming(1.02, { duration: 3400, easing: Easing.inOut(Easing.ease) }), -1, true);
        zzz.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false);
        break;
      case 'shocked':
        tilt.value = withSequence(
          withTiming(-7, { duration: 90 }),
          withTiming(7, { duration: 120 }),
          withSpring(0, Springs.snappy),
        );
        hop.value = withSequence(withTiming(-size * 0.05, { duration: 110 }), withSpring(0, Springs.bouncy));
        break;
      case 'celebrate':
        spin.value = withRepeat(withTiming(360, { duration: 780, easing: Easing.inOut(Easing.cubic) }), 2, false);
        hop.value = withRepeat(
          withSequence(withTiming(-size * 0.12, { duration: 200 }), withSpring(0, Springs.bouncy)),
          3,
          false,
        );
        eyeOpen.value = withTiming(0.4, { duration: 160 });
        setBurstKey((key) => key + 1);
        break;
      default:
        break;
    }

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      cancelAnimation(breath);
      cancelAnimation(tilt);
      cancelAnimation(hop);
      cancelAnimation(eyeOpen);
      cancelAnimation(pupilX);
      cancelAnimation(pupilY);
      cancelAnimation(spin);
      cancelAnimation(zzz);
    };
  }, [breath, eyeOpen, hop, lookAt, mood, paused, pupilX, pupilY, reduced, size, spin, tilt, zzz]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const showToast = useCallback(
    (message: string) => {
      setToast(message);
      toastOpacity.value = withTiming(1, { duration: 160 });
      toastLift.value = withSpring(-4, Springs.snappy);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => {
        toastOpacity.value = withTiming(0, { duration: 200 });
        toastLift.value = withTiming(0, { duration: 200 });
      }, 1400);
    },
    [toastLift, toastOpacity],
  );

  const handlePress = useCallback(() => {
    onHoot?.();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    if (reduced) return;

    hop.value = withSequence(withSpring(-8, Springs.bouncy), withSpring(0, Springs.bouncy));

    const now = Date.now();
    taps.current = [...taps.current.filter((time) => now - time < 1500), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      spin.value = withTiming(360, { duration: 900, easing: Easing.inOut(Easing.cubic) });
      setBurstKey((key) => key + 1);
      showToast(Copy.owl.easterEgg);
    }
  }, [hop, onHoot, reduced, showToast, spin]);

  const rootStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${tilt.value}deg` },
      { translateY: hop.value },
      { scale: breath.value },
      { rotate: `${spin.value}deg` },
    ],
  }));

  const eyeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: eyeOpen.value }],
  }));

  const pupilStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pupilX.value }, { translateY: pupilY.value }],
  }));

  const zzzStyle = useAnimatedStyle(() => ({
    opacity: zzz.value === 0 ? 0 : 1 - zzz.value,
    transform: [{ translateY: -zzz.value * size * 0.12 }, { translateX: zzz.value * size * 0.03 }],
  }));

  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastOpacity.value,
    transform: [{ translateY: toastLift.value }],
  }));

  return (
    <View style={{ width: size, height }}>
      <Animated.View style={[styles.fill, reduced ? undefined : rootStyle]}>
        <Pressable
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint="Plays a hoot reaction. Tap five times quickly for a surprise."
          style={styles.fill}
        >
          <OwlBodyOnly size={size} bubble={bubble} />

          <Animated.View
            style={[
              styles.eye,
              {
                width: eyeSize,
                height: eyeSize,
                borderRadius: eyeSize / 2,
                left: (OWL_GEOMETRY.eye.cx - OWL_GEOMETRY.eye.r - 4) * scale,
                top: (OWL_GEOMETRY.eye.cy - OWL_GEOMETRY.eye.r - 4) * scale,
              },
              reduced ? undefined : eyeStyle,
            ]}
          >
            <Animated.View
              style={[
                styles.pupil,
                {
                  width: pupilSize,
                  height: pupilSize,
                  borderRadius: pupilSize / 2,
                  left: (eyeSize - pupilSize) / 2,
                  top: (eyeSize - pupilSize) / 2,
                },
                reduced ? undefined : pupilStyle,
              ]}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.eye,
              {
                width: eyeSize,
                height: eyeSize,
                borderRadius: eyeSize / 2,
                left: (OWL_GEOMETRY.rightEye.cx - OWL_GEOMETRY.rightEye.r - 4) * scale,
                top: (OWL_GEOMETRY.rightEye.cy - OWL_GEOMETRY.rightEye.r - 4) * scale,
              },
              reduced ? undefined : eyeStyle,
            ]}
          >
            <Animated.View
              style={[
                styles.pupil,
                {
                  width: pupilSize,
                  height: pupilSize,
                  borderRadius: pupilSize / 2,
                  left: (eyeSize - pupilSize) / 2,
                  top: (eyeSize - pupilSize) / 2,
                },
                reduced ? undefined : pupilStyle,
              ]}
            />
          </Animated.View>

          {mood === 'sleepy' && !reduced ? (
            <Animated.View style={[styles.zzz, { left: size * 0.64, top: size * 0.03 }, zzzStyle]} pointerEvents="none">
              <ClayText variant="h3" color="primary">
                z
              </ClayText>
              <ClayText variant="caption" color="primary" style={styles.zzzSmall}>
                z
              </ClayText>
            </Animated.View>
          ) : null}
        </Pressable>
      </Animated.View>

      {toast ? (
        <Animated.View style={[styles.toast, toastStyle]} pointerEvents="none">
          <ClayText variant="captionBold" color="text">
            {toast}
          </ClayText>
        </Animated.View>
      ) : null}

      {burstKey > 0 && !reduced ? (
        <View style={styles.confetti} pointerEvents="none">
          <ConfettiCannon
            key={`owl-confetti-${burstKey}`}
            count={60}
            origin={{ x: size / 2, y: height * 0.35 }}
            autoStart
            fadeOut
            fallSpeed={2400}
            explosionSpeed={340}
            colors={CONFETTI_COLORS}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  eye: {
    position: 'absolute',
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pupil: { position: 'absolute', backgroundColor: Colors.text },
  zzz: { position: 'absolute', flexDirection: 'row', alignItems: 'flex-end' },
  zzzSmall: { marginBottom: 4 },
  toast: {
    position: 'absolute',
    top: -6,
    alignSelf: 'center',
    backgroundColor: Colors.white,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confetti: { ...StyleSheet.absoluteFillObject, overflow: 'visible' },
});
