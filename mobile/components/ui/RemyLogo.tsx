import React, { useCallback, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnUI,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ClayFinish } from '@components/clay/ClayFinish';
import { Copy } from '@constants/copy';
import { Springs } from '@constants/motion';
import { ClayGradients, Colors, FontSize, Radius, Spacing, clayElevation } from '@constants/theme';
import { ClayText } from './ClayText';
import { RemyArt } from './RemyArt';

const sizes = {
  sm: { badge: 50, text: FontSize.h3, radius: 22 },
  md: { badge: 64, text: FontSize.h1, radius: Radius.card },
  lg: { badge: 112, text: FontSize.wordmark, radius: Radius.lg },
};

interface RemyLogoProps {
  size?: keyof typeof sizes;
  stacked?: boolean;
  badgeOnly?: boolean;
  tone?: 'caramel' | 'muted';
  gradient?: boolean;
  /** Subtle <= 3s breathe loop on auth screens; pauses while typing. */
  idleMotion?: boolean;
  paused?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const RemyLogo = React.memo(function RemyLogo({
  size = 'md',
  stacked = false,
  badgeOnly = false,
  tone = 'caramel',
  gradient = false,
  idleMotion = false,
  paused = false,
  style,
}: RemyLogoProps) {
  const { badge, text, radius } = sizes[size];
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const breathe = useSharedValue(0);

  useEffect(() => {
    if (!idleMotion || paused || reducedMotion) {
      cancelAnimation(breathe);
      breathe.value = withTiming(0, { duration: 180 });
      return;
    }
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withDelay(200, withTiming(0, { duration: 1300, easing: Easing.inOut(Easing.sin) })),
      ),
      -1,
    );
    return () => cancelAnimation(breathe);
  }, [breathe, idleMotion, paused, reducedMotion]);

  const bounce = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * (1 + breathe.value * 0.025) },
      { translateY: -2 * breathe.value },
    ],
  }));
  const onPress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    if (!reducedMotion) {
      runOnUI(() => {
        'worklet';
        scale.value = withSequence(withSpring(1.07, Springs.snappy), withSpring(1, Springs.bouncy));
      })();
    }
  }, [reducedMotion, scale]);

  return (
    <Pressable
      accessibilityLabel={Copy.app.name}
      accessibilityRole="button"
      accessibilityHint={reducedMotion ? undefined : 'Makes Remy bounce'}
      onPress={onPress}
      style={[styles.touchTarget, style]}
    >
      <Animated.View style={[styles.lockup, stacked && styles.stacked, bounce]} pointerEvents="none">
        <View style={[styles.badge, { width: badge, height: badge, borderRadius: radius, backgroundColor: ClayGradients[tone][gradient ? 0 : 1] }]}>
          <ClayFinish tone={tone} radius={radius} gradient={gradient} />
          <RemyArt size={badge * 0.82} />
        </View>
        {badgeOnly ? null : <ClayText variant="wordmark" style={{ fontSize: text }}>{Copy.app.name}</ClayText>}
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  touchTarget: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stacked: { flexDirection: 'column', gap: Spacing.xs },
  badge: {
    ...clayElevation,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
