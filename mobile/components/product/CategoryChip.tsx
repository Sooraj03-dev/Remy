// mobile/components/product/CategoryChip.tsx
// Clay category filter chip with a typed icon and selected state.

import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { ClayFinish, resolveClayRadius } from '@components/clay/ClayFinish';
import { ClayPressable } from '@components/fx/ClayPressable';
import { ClayText } from '@components/ui/ClayText';
import { Icon } from '@components/ui/Icon';
import { CategoryIcons, type IconName } from '@constants/icons';
import { Colors, Radius, Spacing } from '@constants/theme';
import { Springs } from '@constants/motion';

export interface CategoryChipProps {
  label: string;
  category: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

export function CategoryChip({
  label,
  category,
  selected = false,
  onPress,
  icon,
  style,
}: CategoryChipProps) {
  const iconName = icon ?? CategoryIcons[category] ?? 'Package';
  const radius = resolveClayRadius(StyleSheet.flatten(style)?.borderRadius);
  const reduced = useReducedMotion();
  const active = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    const target = selected ? 1 : 0;
    active.value = reduced ? target : withSpring(target, { ...Springs.snappy, overshootClamping: true });
  }, [active, reduced, selected]);

  const selectedStyle = useAnimatedStyle(() => ({ opacity: active.value }));

  return (
    <ClayPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      tone="muted"
      pressScale={0.95}
      style={[styles.chip, style]}
    >
      <View style={styles.content} pointerEvents="none">
        <Icon name={iconName} size={18} color="textPrimary" />
        <ClayText variant="captionBold" color="textPrimary" numberOfLines={1}>{label}</ClayText>
      </View>
      <Animated.View
        style={[StyleSheet.absoluteFillObject, styles.content, { backgroundColor: Colors.primary, borderRadius: radius }, selectedStyle]}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <ClayFinish tone="espresso" radius={radius} />
        <Icon name={iconName} size={18} color="background" />
        <ClayText variant="captionBold" color="background" numberOfLines={1}>{label}</ClayText>
      </Animated.View>
    </ClayPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 48,
    borderRadius: Radius.card,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
});
