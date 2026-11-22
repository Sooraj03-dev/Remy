import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Copy } from '@constants/copy';
import { Springs } from '@constants/motion';
import { Colors, FontSize, Radius, Spacing, clayElevation } from '@constants/theme';
import { ClayText } from './ClayText';
import { RemyArt } from './RemyArt';

const sizes = {
  sm: { badge: 32, text: FontSize.h3, radius: Radius.sm },
  md: { badge: 64, text: FontSize.h1, radius: Radius.md },
  lg: { badge: 112, text: FontSize.wordmark, radius: Radius.lg },
};

interface RemyLogoProps {
  size?: keyof typeof sizes;
  stacked?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function RemyLogo({ size = 'md', stacked = false, style }: RemyLogoProps) {
  const { badge, text, radius } = sizes[size];
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const bounce = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityLabel={Copy.app.name}
      accessibilityRole={reducedMotion ? 'image' : 'button'}
      accessibilityHint={reducedMotion ? undefined : 'Makes Remy bounce'}
      onPress={reducedMotion ? undefined : () => {
        scale.value = withSequence(withSpring(1.08, Springs.snappy), withSpring(1, Springs.bouncy));
      }}
      style={[styles.touchTarget, style]}
    >
      <Animated.View style={[styles.lockup, stacked && styles.stacked, bounce]} pointerEvents="none">
        <View style={[styles.badge, { width: badge, height: badge, borderRadius: radius }]}>
          <LinearGradient
            colors={[Colors.lavender, Colors.primary, `${Colors.text}25`]}
            locations={[0, 0.58, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
          />
          <RemyArt size={badge * 0.85} />
        </View>
        <ClayText variant="wordmark" style={{ fontSize: text }}>{Copy.app.name}</ClayText>
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
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: `${Colors.white}80`,
  },
});
