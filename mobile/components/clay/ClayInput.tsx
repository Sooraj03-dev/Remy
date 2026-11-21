// mobile/components/clay/ClayInput.tsx
// Claymorphism text input with label, error and focus states

import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { ClayText } from '@components/ui/ClayText';
import { Colors, Radius, Spacing, FontSize, FontFamily } from '@constants/theme';

interface ClayInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function ClayInput({
  label,
  error,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}: ClayInputProps) {
  const [focused, setFocused] = useState(false);

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
      setFocused(true);
      onFocus?.(e);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
      setFocused(false);
      onBlur?.(e);
    },
    [onBlur],
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <ClayText variant="captionBold" color="text" style={styles.label}>
          {label}
        </ClayText>
      ) : null}
      <TextInput
        style={[
          styles.input,
          focused && styles.focused,
          error ? styles.errored : null,
          style,
        ]}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholderTextColor={Colors.textSecondary}
        accessibilityLabel={label}
        {...rest}
      />
      {error ? (
        <ClayText variant="caption" color="error">
          {error}
        </ClayText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.caption,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: Spacing.base,
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
    color: Colors.text,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  focused: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  errored: {
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: FontSize.caption,
    color: Colors.error,
  },
});

