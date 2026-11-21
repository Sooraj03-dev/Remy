// mobile/components/clay/ClayHeader.tsx
// Screen header with large title, optional subtitle and a 44px right action.

import React from 'react';
import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClayText } from '@components/ui/ClayText';
import { Spacing } from '@constants/theme';

interface ClayHeaderProps {
  title: string;
  subtitle?: string;
  rightIcon?: React.ReactNode;
  onRightPress?: () => void;
  rightLabel?: string;
  style?: ViewStyle;
}

export function ClayHeader({
  title,
  subtitle,
  rightIcon,
  onRightPress,
  rightLabel = 'Header action',
  style,
}: ClayHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }, style]}>
      <View style={styles.textBlock}>
        <ClayText variant="h1" numberOfLines={1}>
          {title}
        </ClayText>
        {subtitle ? (
          <ClayText variant="caption" numberOfLines={1}>
            {subtitle}
          </ClayText>
        ) : null}
      </View>
      {rightIcon ? (
        <Pressable
          onPress={onRightPress}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel={rightLabel}
          hitSlop={12}
        >
          {rightIcon}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  textBlock: { flex: 1, gap: 2 },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
