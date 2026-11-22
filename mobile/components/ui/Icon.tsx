// mobile/components/ui/Icon.tsx
// Typed wrapper for the shared Lucide stroke and sizes.

import React from 'react';
import { IconRegistry, type IconName } from '@constants/icons';
import { Colors } from '@constants/theme';

const SIZES = { sm: 20, md: 24, lg: 28 } as const;
export type IconSize = keyof typeof SIZES;

type IconWeight = 'regular' | 'bold' | 'duotone' | 'fill';

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
  const GlyphComponent = IconRegistry[name];
  const px = typeof size === 'number' ? size : SIZES[size];
  const ink = resolveColor(color);

  return (
    <GlyphComponent
      size={px}
      color={ink}
      strokeWidth={1.75}
      fill={name === 'Heart' && weight === 'fill' ? ink : 'none'}
      accessible={!decorative}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
    />
  );
}
