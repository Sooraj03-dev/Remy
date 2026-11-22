import React from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
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
  style?: StyleProp<ViewStyle>;
}

export function RemyLogo({ size = 'md', stacked = false, badgeOnly = false, tone = 'caramel', style }: RemyLogoProps) {
  const { badge, text, radius } = sizes[size];
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const bounce = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityLabel={Copy.app.name}
      accessibilityRole="button"
      accessibilityHint={reducedMotion ? undefined : 'Makes Remy bounce'}
      onPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        }
        if (!reducedMotion) {
          scale.value = withSequence(withSpring(1.07, Springs.snappy), withSpring(1, Springs.bouncy));
        }
      }}
      style={[styles.touchTarget, style]}
    >
      <Animated.View style={[styles.lockup, stacked && styles.stacked, bounce]} pointerEvents="none">
        <View style={[styles.badge, { width: badge, height: badge, borderRadius: radius, backgroundColor: ClayGradients[tone][0] }]}>
          <ClayFinish tone={tone} radius={radius} />
          <RemyArt size={badge * 0.82} />
        </View>
        {badgeOnly ? null : <ClayText variant="wordmark" style={{ fontSize: text }}>{Copy.app.name}</ClayText>}
      </Animated.View>
    </Pressable>
  );
}

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
