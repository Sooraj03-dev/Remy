import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Springs } from '@constants/motion';
import { Spacing } from '@constants/theme';
import { REMY_FACE, RemyArt, RemyLayer } from './RemyArt';

export function NibblingRemy({ size, paused }: { size: number; paused?: boolean }) {
  const reduced = useReducedMotion();
  const chew = useSharedValue(0);

  useEffect(() => {
    if (reduced || paused) return;
    chew.value = withRepeat(withTiming(1, { duration: 105, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => {
      cancelAnimation(chew);
      chew.value = 0;
    };
  }, [chew, paused, reduced]);

  const cheeks = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1.06 + chew.value * 0.13 }, { scaleY: 1.07 + chew.value * 0.11 }],
  }));
  const mouth = useAnimatedStyle(() => ({ transform: [{ translateY: chew.value * 1.2 }] }));
  const bite = useAnimatedStyle(() => ({
    transform: [{ translateY: -chew.value * size * 0.067 }, { rotate: `${-chew.value * 4}deg` }],
  }));

  return (
    <View pointerEvents="none">
      <RemyArt size={size} parts={['tail', 'feet', 'leftEar', 'rightEar', 'body']} />
      <RemyLayer size={size} parts={['cheeks']} style={[{ transformOrigin: '50% 56%' }, cheeks]} />
      <RemyLayer size={size} parts={['nose', 'whiskers', 'eyes']} />
      <RemyLayer size={size} parts={['mouth']} style={mouth} />
      <RemyLayer size={size} parts={['cheeseWedge']} style={[{ transformOrigin: '52% 66%' }, bite]} />
    </View>
  );
}

export function DizzyRemy({ size = 82, attempt = 0 }: { size?: number; attempt?: number }) {
  const reduced = useReducedMotion();
  const droop = useSharedValue(reduced ? 1 : 0);
  const shake = useSharedValue(0);
  const lastAttempt = useRef(attempt);

  useEffect(() => {
    droop.value = reduced ? 1 : withSpring(1, Springs.gentle);
  }, [droop, reduced]);

  useEffect(() => {
    if (attempt === lastAttempt.current) return;
    lastAttempt.current = attempt;
    if (reduced) return;
    shake.value = withSequence(
      withTiming(-1, { duration: 65 }),
      withTiming(1, { duration: 95 }),
      withTiming(-0.6, { duration: 85 }),
      withSpring(0, Springs.snappy),
    );
  }, [attempt, reduced, shake]);

  const left = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value * 3 }, { rotate: `${-30 * droop.value + shake.value * 9}deg` }],
  }));
  const right = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value * 3 }, { rotate: `${30 * droop.value + shake.value * 9}deg` }],
  }));
  const head = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value * 3 }, { rotate: `${shake.value * 8}deg` }],
  }));

  return (
    <View pointerEvents="none">
      <RemyArt size={size} parts={['curledTail', 'feet']} />
      <RemyLayer size={size} parts={['leftEar']} style={[{ transformOrigin: '36% 34%' }, left]} />
      <RemyLayer size={size} parts={['rightEar']} style={[{ transformOrigin: '66% 34%' }, right]} />
      <RemyLayer size={size} parts={['body', 'paws']} />
      <RemyLayer size={size} parts={[...REMY_FACE, 'dizzyEyes']} style={[{ transformOrigin: '50% 52%' }, head]} />
    </View>
  );
}

export function CelebratingRemy({ size }: { size: number }) {
  const reduced = useReducedMotion();
  const jump = useSharedValue(0);
  const wag = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    jump.value = withSequence(
      withTiming(3, { duration: 80 }),
      withTiming(-size * 0.18, { duration: 180, easing: Easing.out(Easing.quad) }),
      withSpring(0, Springs.bouncy),
    );
    wag.value = withSequence(
      withRepeat(withSequence(withTiming(-18, { duration: 95 }), withTiming(18, { duration: 95 })), 6),
      withSpring(0, Springs.snappy),
    );
  }, [jump, reduced, size, wag]);

  const leap = useAnimatedStyle(() => ({ transform: [{ translateY: jump.value }] }));
  const tail = useAnimatedStyle(() => ({ transform: [{ rotate: `${wag.value}deg` }] }));

  return (
    <View style={{ paddingTop: reduced ? 0 : size * 0.13 }} pointerEvents="none">
      <Animated.View style={leap}>
        <RemyArt size={size} parts={['feet']} />
        <RemyLayer size={size} parts={['tail']} style={[{ transformOrigin: '72% 80%' }, tail]} />
        <RemyLayer size={size} parts={['leftEar', 'rightEar', 'body', ...REMY_FACE, 'eyes', 'raisedPaws']} />
      </Animated.View>
    </View>
  );
}

const REFRESH_SIZE = 64;

export function RefreshingRemy({
  pull,
  refreshing,
  paused,
}: {
  pull: SharedValue<number>;
  refreshing: boolean;
  paused?: boolean;
}) {
  const reduced = useReducedMotion();
  const hold = useSharedValue(0);
  const sniff = useSharedValue(0);

  useEffect(() => {
    const target = refreshing && !paused ? REFRESH_SIZE : 0;
    hold.value = reduced || paused ? target : withSpring(target, Springs.snappy);
  }, [hold, paused, reduced, refreshing]);

  useAnimatedReaction(
    () => Math.max(pull.value, hold.value) > 20 && !reduced && !paused,
    (visible, previous) => {
      if (visible === previous) return;
      if (visible) {
        sniff.value = withRepeat(withTiming(1, { duration: 110 }), -1, true);
      } else {
        cancelAnimation(sniff);
        sniff.value = 0;
      }
    },
    [paused, reduced],
  );

  const peek = useAnimatedStyle(() => {
    const distance = Math.min(REFRESH_SIZE, Math.max(pull.value, hold.value));
    return {
      opacity: paused ? 0 : Math.min(1, distance / 24),
      transform: [{ translateY: reduced && distance > 0 ? 0 : distance - REFRESH_SIZE }],
    };
  });
  const nose = useAnimatedStyle(() => ({
    transform: [{ translateX: 1.25 * sniff.value }, { translateY: -2 * sniff.value }, { scale: 1 + sniff.value * 0.24 }],
  }));

  return (
    <View style={styles.refreshWindow} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={peek}>
        <RemyArt size={REFRESH_SIZE} parts={['leftEar', 'rightEar', 'body', 'cheeks', 'mouth', 'whiskers', 'eyes', 'peekPaws']} peek />
        <RemyLayer size={REFRESH_SIZE} parts={['nose']} style={[{ transformOrigin: '49% 74%' }, nose]} peek />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  refreshWindow: {
    position: 'absolute',
    top: 0,
    right: Spacing.xl,
    width: REFRESH_SIZE,
    height: REFRESH_SIZE,
    overflow: 'hidden',
    zIndex: 1,
  },
});
