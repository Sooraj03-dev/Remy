// mobile/components/ui/AppIcon.tsx
// Unified Kubai Line icon wrapper (24x24 grid, rounded strokes, theme-token tinting).

import React from 'react';
import Svg, { Path } from 'react-native-svg';
import {
  SemanticIcons,
  resolveIconName,
  type AppIconName,
  type IconName,
  type KubaiLineLayer,
} from '@constants/icons';
import { Colors } from '@constants/theme';

const SIZES = { sm: 18, md: 24, lg: 28 } as const;
export type IconSize = keyof typeof SIZES;
export type ThemeColorToken = keyof typeof Colors;
export type AppIconVariant = 'line' | 'duotone' | 'fill';

export interface AppIconProps {
  name: IconName;
  size?: IconSize | number;
  /** Must be a theme color token from Colors. */
  tint?: ThemeColorToken;
  variant?: AppIconVariant;
  strokeWidth?: number;
  /** Accessible description for standalone/non-decorative icons; omitted hides from screen readers. */
  contentDescription?: string;
  /** Knockout stroke/fill token used inside filled icons (e.g. check inside badge). */
  knockoutTint?: ThemeColorToken;
}

export const AppIcon = React.memo(function AppIcon({
  name,
  size = 24,
  tint = 'textPrimary',
  variant = 'line',
  strokeWidth = 1.85,
  contentDescription,
  knockoutTint = 'surface',
}: AppIconProps) {
  const semantic = resolveIconName(name);
  const glyph = SemanticIcons[semantic];
  const px = typeof size === 'number' ? size : SIZES[size];
  const ink = Colors[tint];
  const knockout = Colors[knockoutTint];
  const isDecorative = !contentDescription;

  const layers: KubaiLineLayer[] = variant === 'fill' && glyph.f?.length ? glyph.f : glyph.o;

  return (
    <Svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      accessible={!isDecorative}
      accessibilityRole={isDecorative ? undefined : 'image'}
      accessibilityLabel={contentDescription}
      accessibilityElementsHidden={isDecorative}
      importantForAccessibility={isDecorative ? 'no-hide-descendants' : 'auto'}
    >
      {variant === 'duotone'
        ? layers.map((layer, idx) =>
            layer.k === 'shell' ? (
              <Path key={`fill-${idx}`} d={layer.d} fill={ink} fillOpacity={0.18} />
            ) : null,
          )
        : null}

      {layers.map((layer, idx) => {
        const cap = (layer.cap === 'butt' ? 'butt' : 'round') as 'butt' | 'round';
        if (variant === 'fill') {
          if (layer.k === 'line') {
            return (
              <Path
                key={`layer-${idx}`}
                d={layer.d}
                fill="none"
                stroke={layer.on ? knockout : ink}
                strokeWidth={strokeWidth}
                strokeLinecap={cap}
                strokeLinejoin="round"
              />
            );
          }
          if (layer.k === 'solid' && layer.on) {
            return <Path key={`layer-${idx}`} d={layer.d} fill={knockout} />;
          }
          return <Path key={`layer-${idx}`} d={layer.d} fill={ink} />;
        }

        if (layer.k === 'solid') {
          return <Path key={`layer-${idx}`} d={layer.d} fill={ink} />;
        }

        return (
          <Path
            key={`layer-${idx}`}
            d={layer.d}
            fill="none"
            stroke={ink}
            strokeWidth={strokeWidth}
            strokeLinecap={cap}
            strokeLinejoin="round"
          />
        );
      })}
    </Svg>
  );
});

export type { AppIconName, IconName };
