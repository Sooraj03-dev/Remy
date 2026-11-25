// mobile/components/ui/Icon.tsx
// Native renderer for the bundled Kubai icon artwork.

import React from 'react';
import Svg, { Path } from 'react-native-svg';
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

export const Icon = React.memo(function Icon({
  name,
  size = 'md',
  weight = 'regular',
  color,
  decorative = true,
  accessibilityLabel,
}: IconProps) {
  const { body, accent } = IconRegistry[name];
  const px = typeof size === 'number' ? size : SIZES[size];
  const ink = resolveColor(color);
  const filledHeart = name === 'Heart' && weight === 'fill';

  return (
    <Svg
      width={px}
      height={px}
      viewBox="0 0 16 16"
      accessible={!decorative}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
    >
      {body ? <Path d={body} fill={ink} fillOpacity={filledHeart ? 1 : 0.52} /> : null}
      {accent ? <Path d={accent} fill={ink} fillOpacity={filledHeart ? 0.52 : 1} /> : null}
    </Svg>
  );
});
