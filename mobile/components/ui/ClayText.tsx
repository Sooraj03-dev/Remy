// mobile/components/ui/ClayText.tsx
// Text with the Thrifty Owl type scale, colour tokens and capped scaling.

import React from 'react';
import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { Colors, Typography, type TypographyVariant } from '@constants/theme';

export interface ClayTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: keyof typeof Colors | string;
  align?: TextStyle['textAlign'];
  /** Tight UI (chips, buttons, badges) caps scaling so layouts survive large text. */
  maxFontSizeMultiplier?: number;
  style?: StyleProp<TextStyle>;
}

export function ClayText({
  variant = 'body',
  color,
  align,
  maxFontSizeMultiplier = 1.3,
  style,
  children,
  ...rest
}: ClayTextProps) {
  const resolvedColor = color
    ? color in Colors
      ? Colors[color as keyof typeof Colors]
      : color
    : undefined;

  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[Typography[variant], resolvedColor ? { color: resolvedColor } : null, align ? { textAlign: align } : null, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}
