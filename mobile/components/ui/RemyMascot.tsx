import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { ClayCard } from '@components/clay/ClayCard';
import { Copy } from '@constants/copy';
import { Durations, Springs } from '@constants/motion';
import { Colors, Radius, Spacing } from '@constants/theme';
import { ClayText } from './ClayText';
import { RemyArt } from './RemyArt';

interface TypingProps {
  state: 'typing';
  visible: boolean;
  keystrokes: number;
}

interface LoadingProps {
  state: 'loading';
  status?: string;
  size?: number;
  paused?: boolean;
  busy?: boolean;
}

interface RoamingProps {
  state: 'roaming';
  paused?: boolean;
}

export function RemyMascot(props: TypingProps | LoadingProps | RoamingProps) {
  switch (props.state) {
    case 'typing':
      return <TypingRemy {...props} />;
    case 'loading':
      return <LoadingRemy {...props} />;
    case 'roaming':
      return <RoamingRemy {...props} />;
  }
}

const PEEK_SIZE = 62;
const ROAM_SIZE = 54;
const REST_STOPS = [0.84, 0.12, 0.56, 0.06, 0.94, 0.38];

function TypingRemy({ visible, keystrokes }: TypingProps) {
  const reducedMotion = useReducedMotion();
  const reveal = useSharedValue(0);
  const glance = useSharedValue(0);
  const pawTap = useSharedValue(0);

  useEffect(() => {
    const target = visible ? 1 : 0;
    reveal.value = reducedMotion
      ? target
      : withTiming(target, { duration: visible ? Durations.slow : Durations.base });
  }, [reducedMotion, reveal, visible]);

  useEffect(() => {
    if (!visible || !keystrokes || reducedMotion) {
      glance.value = 0;
      pawTap.value = 0;
      return;
    }
    glance.value = withSequence(
      withTiming(keystrokes % 2 ? -1.8 : 1.8, { duration: Durations.fast }),
      withDelay(320, withTiming(0, { duration: Durations.base })),
    );
    pawTap.value = withSequence(
      withTiming(-2.5, { duration: 65 }),
      withSpring(0, Springs.snappy),
    );
  }, [glance, keystrokes, pawTap, reducedMotion, visible]);

  const peek = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * 40 }],
  }));
  const eyes = useAnimatedStyle(() => ({ transform: [{ translateX: glance.value }] }));
  const paws = useAnimatedStyle(() => ({ transform: [{ translateY: pawTap.value }] }));

  return (
    <View style={styles.peek} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      <Animated.View style={peek}>
        <RemyArt size={PEEK_SIZE} peek parts={['leftEar', 'rightEar', 'body', 'face']} />
        <Animated.View style={[StyleSheet.absoluteFillObject, eyes]}>
          <RemyArt size={PEEK_SIZE} peek parts={['eyes']} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFillObject, paws]}>
          <RemyArt size={PEEK_SIZE} peek parts={['peekPaws']} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function LoadingRemy({ status, size = 60, paused, busy = true }: LoadingProps) {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion || paused) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1050, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(pulse);
      pulse.value = 0;
    };
  }, [paused, pulse, reducedMotion]);

  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: -5 * pulse.value }] }));
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 0.88 + pulse.value * 0.12 }] }));
  const mint = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <ClayCard
      style={styles.loadingCard}
      accessible={Boolean(status) || busy}
      accessibilityLabel={status ?? (busy ? 'Loading' : undefined)}
      accessibilityRole={busy ? 'progressbar' : undefined}
      accessibilityState={{ busy }}
    >
      <View style={[styles.loadingStage, { width: size + 12, height: size + 12 }]}>
        <Animated.View style={[styles.ring, ring]}>
          <Animated.View style={[styles.ring, styles.mintRing, mint]} />
        </Animated.View>
        <Animated.View style={bob}>
          <RemyArt size={size} pose="bouncing" />
        </Animated.View>
      </View>
      {status ? <ClayText variant="caption" align="center">{status}</ClayText> : null}
    </ClayCard>
  );
}

function RoamingRemy({ paused }: RoamingProps) {
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const position = useSharedValue(REST_STOPS[0]);
  const breath = useSharedValue(0);
  const blink = useSharedValue(1);
  const walk = useSharedValue(0);
  const facing = useSharedValue(1);
  const hop = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const pop = useSharedValue(0);
  const popLift = useSharedValue(0);

  useEffect(() => {
    if (paused || reducedMotion) return;
    breath.value = withRepeat(withTiming(1, { duration: 1350, easing: Easing.inOut(Easing.sin) }), -1, true);
    blink.value = withRepeat(withSequence(
      withDelay(3600, withTiming(0.12, { duration: 80 })),
      withTiming(1, { duration: 110 }),
    ), -1);

    let stop = REST_STOPS[0];
    let timer: ReturnType<typeof setTimeout>;
    const scheduleScurry = () => {
      timer = setTimeout(() => {
        const choices = REST_STOPS.filter((next) => Math.abs(next - stop) > 0.2);
        const next = choices[Math.floor(Math.random() * choices.length)];
        facing.value = next > stop ? -1 : 1;
        position.value = withTiming(next, { duration: 760, easing: Easing.inOut(Easing.quad) });
        walk.value = withSequence(
          withTiming(1, { duration: 650, easing: Easing.linear }),
          withTiming(0, { duration: 110 }),
        );
        stop = next;
        scheduleScurry();
      }, 8000 + Math.random() * 4000);
    };
    position.value = stop;
    scheduleScurry();

    return () => {
      clearTimeout(timer);
      cancelAnimation(position);
      breath.value = 0;
      blink.value = 1;
      walk.value = 0;
      hop.value = 0;
      wiggle.value = 0;
      pop.value = 0;
    };
  }, [blink, breath, facing, hop, paused, pop, position, reducedMotion, walk, wiggle]);

  const travel = useAnimatedStyle(() => ({
    transform: [{ translateX: Spacing.sm + position.value * Math.max(0, width - ROAM_SIZE - Spacing.base) }],
  }));
  const bodyMotion = useAnimatedStyle(() => ({
    transform: [{ translateY: hop.value }, { scaleY: 1 + breath.value * 0.045 }],
  }));
  const resting = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, walk.value * 8),
  }));
  const walking = useAnimatedStyle(() => ({
    opacity: Math.min(1, walk.value * 8),
    transform: [{ scaleX: facing.value }, { translateY: -Math.abs(Math.sin(walk.value * Math.PI * 6)) * 4 }],
  }));
  const leftEar = useAnimatedStyle(() => ({ transform: [{ rotate: `${wiggle.value}deg` }] }));
  const rightEar = useAnimatedStyle(() => ({ transform: [{ rotate: `${-wiggle.value}deg` }] }));
  const eyes = useAnimatedStyle(() => ({ opacity: blink.value }));
  const sparkles = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ translateY: popLift.value }],
  }));

  const celebrate = () => {
    walk.value = 0;
    pop.value = withSequence(withTiming(1, { duration: 0 }), withDelay(200, withTiming(0, { duration: 440 })));
    if (reducedMotion) return;
    popLift.value = withSequence(withTiming(0, { duration: 0 }), withTiming(-24, { duration: 640 }));
    hop.value = withSequence(withTiming(-10, { duration: 115 }), withSpring(0, Springs.bouncy));
    wiggle.value = withSequence(
      withTiming(-6, { duration: 95 }),
      withTiming(5, { duration: 100 }),
      withSpring(0, Springs.snappy),
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={styles.roamSpace}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 && !paused ? (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <Animated.View style={[styles.traveler, travel]} pointerEvents="box-none">
            <Animated.View style={[styles.sparkles, sparkles]} pointerEvents="none">
              <Svg width={38} height={24} viewBox="0 0 38 24">
                <Path d="M19 19C17 16 10 12 10 8C10 3 16 2 19 7C22 2 28 3 28 8C28 12 21 16 19 19Z" fill={Colors.peach} stroke={Colors.text} />
                <Path d="M5 6L6.5 10L10 11.5L6.5 13L5 17L3.5 13L0 11.5L3.5 10Z" fill={Colors.primary} stroke={Colors.text} strokeWidth={0.6} />
                <Path d="M33 10L34.5 14L38 15.5L34.5 17L33 21L31.5 17L28 15.5L31.5 14Z" fill={Colors.mint} stroke={Colors.text} strokeWidth={0.6} />
              </Svg>
            </Animated.View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={Copy.app.name}
              accessibilityHint={reducedMotion ? 'Shows a heart' : 'Makes Remy hop'}
              onPress={celebrate}
              style={styles.roamButton}
            >
              <Animated.View style={bodyMotion} pointerEvents="none">
                <Animated.View style={resting}>
                  <RemyArt size={ROAM_SIZE} parts={['tail', 'feet']} />
                  <Animated.View style={[StyleSheet.absoluteFillObject, leftEar]}>
                    <RemyArt size={ROAM_SIZE} parts={['leftEar']} />
                  </Animated.View>
                  <Animated.View style={[StyleSheet.absoluteFillObject, rightEar]}>
                    <RemyArt size={ROAM_SIZE} parts={['rightEar']} />
                  </Animated.View>
                  <View style={StyleSheet.absoluteFillObject}>
                    <RemyArt size={ROAM_SIZE} parts={['body', 'face', 'paws']} />
                  </View>
                  <Animated.View style={[StyleSheet.absoluteFillObject, eyes]}>
                    <RemyArt size={ROAM_SIZE} parts={['eyes']} />
                  </Animated.View>
                </Animated.View>
                <Animated.View style={[StyleSheet.absoluteFillObject, walking]}>
                  <RemyArt size={ROAM_SIZE} pose="walking" />
                </Animated.View>
              </Animated.View>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  peek: { position: 'absolute', bottom: '100%', right: Spacing.md, overflow: 'hidden' },
  loadingCard: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    gap: Spacing.xs,
  },
  loadingStage: { alignItems: 'center', justifyContent: 'center' },
  ring: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderRadius: Radius.full, borderColor: Colors.primary },
  mintRing: { borderColor: Colors.mint, margin: -2 },
  roamSpace: { height: ROAM_SIZE },
  traveler: { position: 'absolute', bottom: 0 },
  roamButton: { width: ROAM_SIZE, height: ROAM_SIZE, alignItems: 'center', justifyContent: 'center' },
  sparkles: { position: 'absolute', left: Spacing.sm, top: -Spacing.sm, zIndex: 1 },
});
