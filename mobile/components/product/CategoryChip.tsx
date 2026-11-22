// mobile/components/product/CategoryChip.tsx
// Clay category filter chip with a typed icon and selected state.

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ClayPressable } from '@components/fx/ClayPressable';
import { ClayText } from '@components/ui/ClayText';
import { Icon } from '@components/ui/Icon';
import { CategoryIcons, type IconName } from '@constants/icons';
import { Radius, Spacing } from '@constants/theme';

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
        <Icon name={iconName} size={18} color={color} />
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
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
});
