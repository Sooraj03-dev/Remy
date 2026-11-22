// mobile/components/clay/ClayInput.tsx
// Claymorphism text input with label, error and focus states

import React, { useState, useCallback, useEffect } from 'react';
import {
  Keyboard,
  Platform,
  View,
  TextInput,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { ClayText } from '@components/ui/ClayText';
import { RemyMascot } from '@components/ui/RemyMascot';
import { Colors, Radius, Spacing, FontSize, FontFamily } from '@constants/theme';

interface ClayInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  showMascotOnFocus?: boolean;
}

export function ClayInput({
  label,
  error,
  containerStyle,
  style,
  onFocus,
  onBlur,
  onChangeText,
  showMascotOnFocus = false,
  ...rest
}: ClayInputProps) {
  const [focused, setFocused] = useState(false);
  const [peekMounted, setPeekMounted] = useState(false);
  const [peekVisible, setPeekVisible] = useState(false);
  const [keystrokes, setKeystrokes] = useState(0);

  useEffect(() => {
    if (!showMascotOnFocus || !focused) return;
    // Android can dismiss the keyboard while the TextInput still has focus.
    const show = Keyboard.addListener('keyboardDidShow', () => setPeekVisible(true));
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setPeekVisible(false);
        setKeystrokes(0);
      },
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [focused, showMascotOnFocus]);

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
      setFocused(true);
      if (showMascotOnFocus) {
        setPeekMounted(true);
        setPeekVisible(true);
      }
      onFocus?.(e);
    },
    [onFocus, showMascotOnFocus],
  );

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
      setFocused(false);
      setPeekVisible(false);
      setKeystrokes(0);
      onBlur?.(e);
    },
    [onBlur],
  );

  const handleChangeText = (text: string) => {
    if (peekVisible) setKeystrokes((previous) => previous + 1);
    onChangeText?.(text);
  };

  const input = (
    <TextInput
      style={[
        styles.input,
        focused && styles.focused,
        error ? styles.errored : null,
        style,
      ]}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChangeText={showMascotOnFocus ? handleChangeText : onChangeText}
      placeholderTextColor={Colors.textSecondary}
      accessibilityLabel={label}
      {...rest}
    />
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <ClayText variant="captionBold" color="text" style={styles.label}>
          {label}
        </ClayText>
      ) : null}
      {showMascotOnFocus ? (
        <View>
          {peekMounted ? (
            <RemyMascot state="typing" visible={peekVisible && focused} keystrokes={keystrokes} />
          ) : null}
          {input}
        </View>
      ) : input}
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

