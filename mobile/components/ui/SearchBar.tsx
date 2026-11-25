// mobile/components/ui/SearchBar.tsx
// Unified SearchBar shared across Home and Explore screens.

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AppIcon } from '@components/ui/AppIcon';
import { ClayText } from '@components/ui/ClayText';
import { Durations } from '@constants/motion';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@constants/theme';

export interface SearchBarProps extends Omit<TextInputProps, 'style'> {
  value?: string;
  onChangeText?: (text: string) => void;
  onClear?: () => void;
  /** When provided, renders as an interactive search trigger button (e.g. Home -> Explore). */
  onPressTrigger?: () => void;
  loading?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function SearchBar({
  value = '',
  onChangeText,
  onClear,
  onPressTrigger,
  loading = false,
  placeholder = 'Search by title, brand, or course...',
  accessibilityLabel = 'Search campus listings',
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotion();
  const focusScale = useSharedValue(1);
  const clearProgress = useSharedValue(value.length > 0 ? 1 : 0);

  useEffect(() => {
    const target = value.length > 0 ? 1 : 0;
    clearProgress.value = reduced ? target : withTiming(target, { duration: Durations.fast });
  }, [clearProgress, reduced, value]);

  useEffect(() => {
    const target = focused ? 1.015 : 1;
    focusScale.value = reduced
      ? 1
      : withTiming(target, { duration: Durations.fast, easing: Easing.out(Easing.cubic) });
  }, [focusScale, focused, reduced]);

  const containerMotion = useAnimatedStyle(() => ({
    transform: [{ scale: focusScale.value }],
  }));

  const clearMotion = useAnimatedStyle(() => ({
    opacity: clearProgress.value,
    transform: [{ scale: 0.85 + 0.15 * clearProgress.value }],
  }));

  if (onPressTrigger) {
    return (
      <Pressable
        onPress={onPressTrigger}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.shell,
          pressed && styles.triggerPressed,
          containerStyle,
        ]}
      >
        <View style={styles.leadingIcon}>
          <AppIcon name="search" size={20} tint="textSecondary" />
        </View>
        <ClayText variant="body" color="textSecondary" numberOfLines={1} style={styles.triggerText}>
          {placeholder}
        </ClayText>
      </Pressable>
    );
  }

  const hasValue = value.length > 0;

  return (
    <Animated.View
      style={[
        styles.shell,
        focused && styles.shellFocused,
        containerMotion,
        containerStyle,
      ]}
    >
      <View style={styles.leadingIcon} pointerEvents="none">
        {loading && !reduced ? (
          <ActivityIndicator size="small" color={Colors.primary} accessibilityLabel="Searching" />
        ) : (
          <AppIcon name="search" size={20} tint={focused ? 'primary' : 'textSecondary'} />
        )}
      </View>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        underlineColorAndroid="transparent"
        returnKeyType="search"
        accessibilityLabel={accessibilityLabel}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={styles.input}
        {...rest}
      />

      <Animated.View
        pointerEvents={hasValue ? 'auto' : 'none'}
        accessibilityElementsHidden={!hasValue}
        importantForAccessibility={hasValue ? 'auto' : 'no-hide-descendants'}
        style={clearMotion}
      >
        <Pressable
          onPress={() => {
            if (onClear) onClear();
            else onChangeText?.('');
          }}
          disabled={!hasValue}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={6}
          style={styles.clearBtn}
        >
          <AppIcon name="closeCircle" size={20} tint="primary" />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    backgroundColor: Colors.input,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    gap: Spacing.sm,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  shellFocused: {
    borderColor: Colors.accent,
    backgroundColor: Colors.surface,
  },
  triggerPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  leadingIcon: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerText: {
    flex: 1,
    paddingVertical: Spacing.md,
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
    color: Colors.text,
  },
  clearBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
