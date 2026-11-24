import React, { useCallback, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  runOnUI,
  useAnimatedReaction,
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
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { ClayCard } from '@components/clay/ClayCard';
import { Copy } from '@constants/copy';
import { Durations, Springs } from '@constants/motion';
import { Colors, Radius, Spacing } from '@constants/theme';
import { ClayText } from './ClayText';
import { REMY_FACE, REMY_PEEK_ASPECT_RATIO, RemyArt, RemyLayer } from './RemyArt';
import { NibblingRemy } from './RemyReactions';

interface TypingProps {
  state: 'typing';
  visible: boolean;
  keystrokes: SharedValue<number>;
}

interface LoadingProps {
  state: 'loading';
  status?: string;
  size?: number;
  paused?: boolean;
  busy?: boolean;
  nibble?: boolean;
}

interface RoamingProps {
  state: 'roaming';
  paused?: boolean;
  browsingTime?: SharedValue<number>;
}

export const RemyMascot = React.memo(function RemyMascot(props: TypingProps | LoadingProps | RoamingProps) {
  switch (props.state) {
    case 'typing':
      return <TypingRemy {...props} />;
    case 'loading':
      return <LoadingRemy {...props} />;
    case 'roaming':
      return <RoamingRemy {...props} />;
  }
});

const PEEK_SIZE = 62;
const ROAM_SIZE = 54;
const REST_STOPS = [0.84, 0.12, 0.56, 0.06, 0.94, 0.38];
const restingBody = ['body', ...REMY_FACE, 'paws'] as const;

const groundShadow = (
  <Svg width={48} height={12} viewBox="0 0 48 12">
    <Defs>
      <RadialGradient id="remy-ground">
        <Stop offset="0" stopColor={Colors.shadowColor} stopOpacity={0.38} />
        <Stop offset="1" stopColor={Colors.shadowColor} stopOpacity={0} />
      </RadialGradient>
    </Defs>
    <Ellipse cx={24} cy={6} rx={24} ry={6} fill="url(#remy-ground)" />
  </Svg>
);
const hopSparkles = (
  <Svg width={38} height={24} viewBox="0 0 38 24">
    <Path d="M19 3L21 8L26 10L21 12L19 17L17 12L12 10L17 8ZM7 11L8 14L11 15L8 16L7 19L6 16L3 15L6 14ZM31 12L32 15L35 16L32 17L31 20L30 17L27 16L30 15Z" fill={Colors.accent} />
  </Svg>
);

function TypingRemy({ visible, keystrokes }: TypingProps) {
  const reducedMotion = useReducedMotion();
  const reveal = useSharedValue(0);
  const glance = useSharedValue(0);
  const pawTap = useSharedValue(0);
  const twitch = useSharedValue(0);

  useEffect(() => {
    const target = visible ? 1 : 0;
    reveal.value = reducedMotion
      ? target
      : withTiming(target, { duration: visible ? Durations.slow : Durations.base });
  }, [reducedMotion, reveal, visible]);

  useAnimatedReaction(
    () => visible && !reducedMotion ? keystrokes.value : 0,
    (count, previous) => {
      if (count === previous) return;
      if (!count) {
        glance.value = 0;
        pawTap.value = 0;
        twitch.value = 0;
        return;
      }
      const direction = count % 2 ? -1 : 1;
      glance.value = withSequence(
        withTiming(1.8 * direction, { duration: Durations.fast }),
        withDelay(320, withTiming(0, { duration: Durations.base })),
      );
      pawTap.value = withSequence(
        withTiming(-2.5, { duration: 65 }),
        withSpring(0, Springs.snappy),
      );
      twitch.value = withSequence(
        withTiming(direction, { duration: 55 }),
        withTiming(-0.55 * direction, { duration: 85 }),
        withSpring(0, Springs.snappy),
      );
    },
  );

  const peek = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * 40 }],
  }));
  const eyes = useAnimatedStyle(() => ({ transform: [{ translateX: glance.value }] }));
  const paws = useAnimatedStyle(() => ({ transform: [{ translateY: pawTap.value }] }));
  const leftEar = useAnimatedStyle(() => ({ transform: [{ rotate: `${14 * reveal.value}deg` }, { translateY: -1.6 * reveal.value }] }));
  const rightEar = useAnimatedStyle(() => ({ transform: [{ rotate: `${-14 * reveal.value}deg` }, { translateY: -1.6 * reveal.value }] }));
  const whiskers = useAnimatedStyle(() => ({
    transform: [{ translateY: 1.6 * twitch.value }, { scaleX: 1 + 0.045 * Math.abs(twitch.value) }, { rotate: `${twitch.value * 4}deg` }],
  }));

  return (
    <View style={styles.peek} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      <Animated.View style={peek}>
        <View style={styles.peekBody} />
        <RemyLayer size={PEEK_SIZE} peek parts={['leftEar']} style={[{ transformOrigin: '36% 46%' }, leftEar]} />
        <RemyLayer size={PEEK_SIZE} peek parts={['rightEar']} style={[{ transformOrigin: '66% 46%' }, rightEar]} />
        <RemyLayer size={PEEK_SIZE} peek parts={['body', 'cheeks', 'nose', 'mouth']} />
        <RemyLayer size={PEEK_SIZE} peek parts={['whiskers']} style={[{ transformOrigin: '50% 81%' }, whiskers]} />
        <RemyLayer size={PEEK_SIZE} peek parts={['eyes']} style={eyes} />
        <RemyLayer size={PEEK_SIZE} peek parts={['peekPaws']} style={paws} />
      </Animated.View>
    </View>
  );
}

function LoadingRemy({ status, size = 60, paused, busy = true, nibble = false }: LoadingProps) {
  const reducedMotion = useReducedMotion();
  const focused = useIsFocused();
  const isPaused = paused || !focused;
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion || isPaused || (nibble && !busy)) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1050, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(pulse);
      pulse.value = 0;
    };
  }, [busy, isPaused, nibble, pulse, reducedMotion]);

  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: -5 * pulse.value }] }));
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 0.88 + pulse.value * 0.12 }] }));
  const accentRing = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <ClayCard
      variant="muted"
      style={styles.loadingCard}
      accessible={Boolean(status) || busy}
      accessibilityLabel={status ?? (busy ? 'Loading' : undefined)}
      accessibilityRole={busy ? 'progressbar' : undefined}
      accessibilityState={{ busy }}
    >
      <View style={[styles.loadingStage, { width: size + 12, height: size + 12 }]}>
        {busy || !nibble ? (
          <Animated.View style={[styles.ring, ring]}>
            <Animated.View style={[styles.ring, styles.accentRing, accentRing]} />
          </Animated.View>
        ) : null}
        {nibble ? (
          <NibblingRemy size={size} paused={isPaused} />
        ) : (
          <Animated.View style={bob}>
            <RemyArt size={size} pose="bouncing" />
          </Animated.View>
        )}
      </View>
      {status ? <ClayText variant="caption" align="center">{status}</ClayText> : null}
    </ClayCard>
  );
}

function RoamingRemy({ paused, browsingTime }: RoamingProps) {
  const reducedMotion = useReducedMotion();
  const focused = useIsFocused();
  const isPaused = paused || !focused;
  const width = useSharedValue(0);
  const scurryClock = useSharedValue(0);
  const position = useSharedValue(REST_STOPS[0]);
  const restingPlace = useSharedValue(REST_STOPS[0]);
  const edgeSide = useSharedValue<-1 | 0 | 1>(0);
  const edge = useSharedValue(0);
  const breath = useSharedValue(0);
  const blink = useSharedValue(1);
  const wag = useSharedValue(0);
  const walk = useSharedValue(0);
  const facing = useSharedValue(1);
  const hop = useSharedValue(0);
  const squash = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const idleWiggle = useSharedValue(0);
  const pop = useSharedValue(0);
  const popLift = useSharedValue(0);

  useEffect(() => {
    if (isPaused || reducedMotion) return;
    runOnUI(() => {
      'worklet';
      breath.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
      blink.value = withRepeat(withSequence(
        withDelay(3600, withTiming(0.12, { duration: 80 })),
        withTiming(1, { duration: 110 }),
        withDelay(4800, withTiming(0.12, { duration: 75 })),
        withTiming(1, { duration: 110 }),
      ), -1);

      // Each completed delay schedules the next randomized scurry on the UI runtime.
      function scheduleScurry() {
        scurryClock.value = withDelay(
          8000 + Math.random() * 4000,
          withTiming(1 - scurryClock.value, { duration: 0 }, (finished) => {
            if (!finished) return;
            const browsing = browsingTime !== undefined && Date.now() - browsingTime.value < 3000;
            const stop = restingPlace.value;
            const side = edgeSide.value === 0 && Math.random() < (browsing ? 0.55 : 0.18)
              ? (stop >= 0.5 ? -1 : 1)
              : 0;
            const choices = REST_STOPS.filter((next) => Math.abs(next - stop) > 0.2);
            const next = side ? (side < 0 ? 0 : 1) : choices[Math.floor(Math.random() * choices.length)];
            edgeSide.value = side;
            edge.value = withDelay(side ? 490 : 0, withTiming(side, { duration: 270 }));
            facing.value = next > stop ? -1 : 1;
            position.value = withTiming(next, { duration: 760, easing: Easing.inOut(Easing.quad) });
            walk.value = withSequence(
              withTiming(1, { duration: 650, easing: Easing.linear }),
              withTiming(0, { duration: 110 }),
            );
            restingPlace.value = next;
            scheduleScurry();
          }),
          ReduceMotion.Never,
        );
      }

      scheduleScurry();
    })();

    return () => {
      runOnUI(() => {
        'worklet';
        cancelAnimation(scurryClock);
        restingPlace.value = REST_STOPS[0];
        position.value = REST_STOPS[0];
        edge.value = 0;
        edgeSide.value = 0;
        breath.value = 0;
        blink.value = 1;
        wag.value = 0;
        walk.value = 0;
        hop.value = 0;
        squash.value = 0;
        wiggle.value = 0;
        idleWiggle.value = 0;
        pop.value = 0;
        popLift.value = 0;
      })();
    };
  }, [blink, breath, browsingTime, edge, edgeSide, facing, hop, idleWiggle, isPaused, pop, popLift, position, reducedMotion, restingPlace, scurryClock, squash, wag, walk, wiggle]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    width.value = event.nativeEvent.layout.width;
  }, [width]);

  const travel = useAnimatedStyle(() => {
    const span = Math.max(0, width.value - ROAM_SIZE);
    const inset = Spacing.base * (1 - Math.min(1, Math.abs(edge.value)));
    return {
      opacity: width.value > 0 ? 1 : 0,
      transform: [{ translateX: inset + position.value * Math.max(0, span - inset * 2) }],
    };
  });
  const bodyMotion = useAnimatedStyle(() => ({
    transform: [
      { translateX: edge.value * 23 },
      { translateY: hop.value + squash.value * 3 },
      { rotate: `${Math.max(-1, Math.min(1, edge.value)) * -11}deg` },
      { scaleX: 1 + squash.value * 0.11 },
      { scaleY: 1 + breath.value * 0.045 - squash.value * 0.17 },
    ],
  }));
  const resting = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, walk.value * 8),
  }));
  const walking = useAnimatedStyle(() => ({
    opacity: Math.min(1, walk.value * 8),
    transform: [{ scaleX: facing.value }, { translateY: -Math.abs(Math.sin(walk.value * Math.PI * 6)) * 4 }],
  }));
  const leftEar = useAnimatedStyle(() => ({ transform: [{ rotate: `${wiggle.value + idleWiggle.value}deg` }] }));
  const rightEar = useAnimatedStyle(() => ({ transform: [{ rotate: `${-wiggle.value - idleWiggle.value}deg` }] }));
  const eyes = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const tail = useAnimatedStyle(() => ({ transform: [{ rotate: `${wag.value}deg` }, { scaleX: 1 - wag.value * 0.01 }] }));
  const sparkles = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ translateY: popLift.value }],
  }));
  const ground = useAnimatedStyle(() => ({
    opacity: 1 + Math.min(0, hop.value) * 0.038,
    transform: [{ scaleX: 1 + Math.min(0, hop.value) * 0.022 }],
  }));

  const celebrate = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    runOnUI(() => {
      'worklet';
      const side = edgeSide.value;
      if (side && !reducedMotion && Math.abs(edge.value) >= 0.45) {
        const next = side < 0 ? 0.29 : 0.71;
        edgeSide.value = 0;
        restingPlace.value = next;
        edge.value = withSequence(
          withTiming(side * 2.7, { duration: 125, easing: Easing.in(Easing.quad) }),
          withDelay(240, withTiming(0, { duration: 290 })),
        );
        position.value = withDelay(365, withTiming(next, { duration: 425, easing: Easing.out(Easing.quad) }));
        walk.value = withDelay(365, withSequence(withTiming(1, { duration: 330 }), withTiming(0, { duration: 95 })));
        facing.value = side;
        return;
      }
      if (!reducedMotion) {
        cancelAnimation(position);
        restingPlace.value = position.value;
        edgeSide.value = 0;
        edge.value = withTiming(0, { duration: Durations.fast });
      }
      walk.value = 0;
      const popDelay = reducedMotion ? 0 : 75;
      pop.value = withDelay(popDelay, withSequence(withTiming(1, { duration: 0 }), withDelay(190, withTiming(0, { duration: 440 }))));
      if (reducedMotion) return;
      squash.value = withSequence(withTiming(1, { duration: 70 }), withSpring(0, Springs.snappy));
      popLift.value = withDelay(popDelay, withSequence(withTiming(0, { duration: 0 }), withTiming(-24, { duration: 640 })));
      hop.value = withDelay(popDelay, withSequence(withTiming(-15, { duration: 145 }), withSpring(0, Springs.bouncy)));
      wiggle.value = withDelay(popDelay, withSequence(
        withTiming(-14, { duration: 80 }),
        withTiming(11, { duration: 100 }),
        withTiming(-5, { duration: 75 }),
        withSpring(0, Springs.snappy),
      ));
    })();
  }, [edge, edgeSide, facing, hop, pop, popLift, position, reducedMotion, restingPlace, squash, walk, wiggle]);

  return (
    <View
      pointerEvents="box-none"
      style={styles.roamSpace}
      onLayout={onLayout}
    >
      {!isPaused ? (
        <Animated.View style={[styles.traveler, travel]} pointerEvents="box-none">
          <Animated.View style={[styles.ground, ground]} pointerEvents="none">
            {groundShadow}
          </Animated.View>
          <Animated.View style={[styles.sparkles, sparkles]} pointerEvents="none">
            {hopSparkles}
          </Animated.View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={Copy.app.name}
            accessibilityHint={reducedMotion ? 'Shows sparkles' : 'Makes Remy hop or retreat from the edge'}
            onPress={celebrate}
            style={styles.roamButton}
          >
            <Animated.View style={bodyMotion} pointerEvents="none">
              <Animated.View style={resting}>
                <RemyArt size={ROAM_SIZE} parts={['feet']} />
                <RemyLayer size={ROAM_SIZE} parts={['tail']} style={[{ transformOrigin: '72% 80%' }, tail]} />
                <RemyLayer size={ROAM_SIZE} parts={['leftEar']} style={[{ transformOrigin: '36% 34%' }, leftEar]} />
                <RemyLayer size={ROAM_SIZE} parts={['rightEar']} style={[{ transformOrigin: '66% 34%' }, rightEar]} />
                <RemyLayer size={ROAM_SIZE} parts={restingBody} />
                <RemyLayer size={ROAM_SIZE} parts={['eyes']} style={[{ transformOrigin: '49% 47%' }, eyes]} />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFillObject, walking]}>
                <RemyArt size={ROAM_SIZE} pose="walking" />
              </Animated.View>
            </Animated.View>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  peek: { position: 'absolute', bottom: '100%', right: Spacing.md, overflow: 'hidden' },
  peekBody: { width: PEEK_SIZE, aspectRatio: REMY_PEEK_ASPECT_RATIO },
  loadingCard: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    gap: Spacing.xs,
  },
  loadingStage: { alignItems: 'center', justifyContent: 'center' },
  ring: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderRadius: Radius.full, borderColor: Colors.primary },
  accentRing: { borderColor: Colors.accent, margin: -2 },
  roamSpace: { height: ROAM_SIZE },
  traveler: { position: 'absolute', bottom: 0 },
  ground: { position: 'absolute', left: 3, bottom: -2 },
  roamButton: { width: ROAM_SIZE, height: ROAM_SIZE, alignItems: 'center', justifyContent: 'center' },
  sparkles: { position: 'absolute', left: Spacing.sm, top: -Spacing.sm, zIndex: 1 },
});
