// mobile/components/ui/Icon.tsx
// Compatibility wrapper delegating to AppIcon so all icons come from Kubai Line.

import React from 'react';
import { Colors } from '@constants/theme';
import { AppIcon, type AppIconVariant, type IconSize, type ThemeColorToken } from './AppIcon';
import type { IconName } from '@constants/icons';

export type { IconSize };

type IconWeight = 'regular' | 'bold' | 'duotone' | 'fill';

export interface IconProps {
  name: IconName;
  size?: IconSize | number;
  weight?: IconWeight;
  /** Token key from Colors (or legacy fallback). */
  color?: ThemeColorToken | (string & {});
  /** Decorative icons are hidden from screen readers. */
  decorative?: boolean;
  accessibilityLabel?: string;
}

const HEX_TO_TOKEN = new Map<string, ThemeColorToken>(
  (Object.entries(Colors) as [ThemeColorToken, string][]).map(([k, v]) => [v.toLowerCase(), k]),
);

function toThemeToken(color?: string): ThemeColorToken {
  if (!color) return 'textPrimary';
  if (color in Colors) return color as ThemeColorToken;
  return HEX_TO_TOKEN.get(color.toLowerCase()) ?? 'textPrimary';
}

export const Icon = React.memo(function Icon({
  name,
  size = 'md',
  weight = 'regular',
  color,
  decorative = true,
  accessibilityLabel,
}: IconProps) {
  const variant: AppIconVariant =
    weight === 'fill' ? 'fill' : weight === 'duotone' ? 'duotone' : 'line';
  const strokeWidth = weight === 'bold' ? 2.15 : 1.85;

  return (
    <AppIcon
      name={name}
      size={size}
      tint={toThemeToken(color)}
      variant={variant}
      strokeWidth={strokeWidth}
      contentDescription={decorative ? undefined : accessibilityLabel}
    />
  );
});
