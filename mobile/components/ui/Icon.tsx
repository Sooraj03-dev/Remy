// mobile/components/ui/Icon.tsx
// Typed wrapper around the Phosphor registry. No other file imports icon sets.

import React from 'react';
import type { IconWeight } from 'phosphor-react-native';
import { IconRegistry, type IconName } from '@constants/icons';
import { Colors } from '@constants/theme';

const SIZES = { sm: 20, md: 24, lg: 28 } as const;
export type IconSize = keyof typeof SIZES;

type Glyph = React.ComponentType<{
  size?: number;
  color?: string;
  weight?: IconWeight;
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityElementsHidden?: boolean;
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
}>;

export interface IconProps {
  name: IconName;
  size?: IconSize | number;
  weight?: IconWeight;
  /** Token key from Colors, or a raw colour string. */
  color?: keyof typeof Colors | string;
  /** Decorative icons are hidden from screen readers. */
  decorative?: boolean;
  accessibilityLabel?: string;
}

export function resolveColor(color: IconProps['color']): string {
  if (!color) return Colors.text;
  return color in Colors ? Colors[color as keyof typeof Colors] : color;
}

export function Icon({
  name,
  size = 'md',
  weight = 'regular',
  color,
  decorative = true,
  accessibilityLabel,
}: IconProps) {
  const GlyphComponent = IconRegistry[name] as unknown as Glyph;
  const px = typeof size === 'number' ? size : SIZES[size];

  return (
    <GlyphComponent
      size={px}
      color={resolveColor(color)}
      weight={weight}
      accessible={!decorative}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
    />
  );
}
