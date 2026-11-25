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
import { runOnUI, useSharedValue } from 'react-native-reanimated';
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
  const keystrokes = useSharedValue(0);

  useEffect(() => {
    if (!showMascotOnFocus || !focused) return;
    // Android can dismiss the keyboard while the TextInput still has focus.
    const show = Keyboard.addListener('keyboardDidShow', () => setPeekVisible(true));
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setPeekVisible(false);
        keystrokes.value = 0;
      },
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [focused, keystrokes, showMascotOnFocus]);

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
      keystrokes.value = 0;
      onBlur?.(e);
    },
    [keystrokes, onBlur],
  );

  const handleChangeText = useCallback((text: string) => {
    if (peekVisible) {
      runOnUI(() => {
        'worklet';
        keystrokes.value += 1;
      })();
    }
    onChangeText?.(text);
  }, [keystrokes, onChangeText, peekVisible]);

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
      underlineColorAndroid="transparent"
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
    backgroundColor: Colors.input,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 48,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
    color: Colors.text,
  },
  focused: {
    borderColor: Colors.accent,
    backgroundColor: Colors.surface,
  },
  errored: {
    borderColor: Colors.errorText,
  },
});

