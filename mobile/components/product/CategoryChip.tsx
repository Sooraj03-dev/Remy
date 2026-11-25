// mobile/components/product/CategoryChip.tsx
// Clay category filter chip with a typed icon and selected state.

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, withSpring } from 'react-native-reanimated';
import { ClayPressable } from '@components/fx/ClayPressable';
import { ClayText } from '@components/ui/ClayText';
import { Icon } from '@components/ui/Icon';
import { CategoryIcons, type IconName } from '@constants/icons';
import { Springs } from '@constants/motion';
import { Colors, Radius, Spacing } from '@constants/theme';

export interface CategoryChipProps {
  label: string;
  category: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

export const CategoryChip = React.memo(function CategoryChip({
  label,
  category,
  selected = false,
  onPress,
  icon,
  style,
}: CategoryChipProps) {
  const iconName = icon ?? CategoryIcons[category] ?? 'Package';
  const color = selected ? 'background' : 'textPrimary';
  const reduced = useReducedMotion();
  const iconMotion = useAnimatedStyle(() => {
    const scale = selected ? 1.08 : 1;
    return { transform: [{ scale: reduced ? 1 : withSpring(scale, Springs.snappy) }] };
  });

  return (
    <ClayPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      tone={selected ? 'espresso' : 'muted'}
      pressScale={0.95}
      style={[styles.chip, style]}
    >
      <View style={styles.content} pointerEvents="none">
        <Animated.View style={[styles.iconWell, selected && styles.activeIconWell, iconMotion]}>
          <Icon name={iconName} size={17} color="primary" />
        </Animated.View>
        <ClayText variant="captionBold" color={color} numberOfLines={1}>{label}</ClayText>
      </View>
    </ClayPressable>
  );
});

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
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.md,
  },
  iconWell: {
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  activeIconWell: { backgroundColor: Colors.accentSoft },
});
