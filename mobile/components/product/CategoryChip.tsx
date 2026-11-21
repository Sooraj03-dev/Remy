// mobile/components/product/CategoryChip.tsx
// Clay category filter chip with a typed icon and selected state.

import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { ClayPressable } from '@components/fx/ClayPressable';
import { ClayText } from '@components/ui/ClayText';
import { Icon } from '@components/ui/Icon';
import { CategoryIcons, type IconName } from '@constants/icons';
import { Colors, Radius, Spacing } from '@constants/theme';

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

  return (
    <ClayPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      haptic={false}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? Colors.mint : Colors.lavender,
          borderColor: selected ? Colors.primary : 'transparent',
        },
        style,
      ]}
    >
      <Icon name={iconName} size="sm" weight={selected ? 'fill' : 'regular'} color={selected ? 'primary' : 'text'} />
      <ClayText variant="captionBold" color={selected ? 'text' : 'textSecondary'} numberOfLines={1}>
        {label}
      </ClayText>
    </ClayPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
});
