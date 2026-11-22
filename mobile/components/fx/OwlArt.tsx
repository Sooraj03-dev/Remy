// mobile/components/fx/OwlArt.tsx
// Static owl geometry shared by AnimatedOwl, AnimatedSplash and VerifiedBadge.
// Only SVG transforms are used here; no external image is loaded at runtime.

import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { Colors } from '@constants/theme';

export const OWL_VIEWBOX = { width: 512, height: 400 } as const;

export const OWL_GEOMETRY = {
  bubble:
    'M76 24H436C464.719 24 488 47.2812 488 76V268C488 296.719 464.719 320 436 320H232L178 368L170 320H76C47.2812 320 24 296.719 24 268V76C24 47.2812 47.2812 24 76 24Z',
  leftEar: 'M196 110L178 68L226 92Z',
  rightEar: 'M316 110L334 68L286 92Z',
  body: 'M256 86C324 86 360 144 360 198C360 260 314 300 256 300C198 300 152 260 152 198C152 144 188 86 256 86Z',
  beak: 'M246 214H266L256 236Z',
  eye: { cx: 212, cy: 186, r: 34 },
  rightEye: { cx: 300, cy: 186, r: 34 },
  pupil: { r: 13 },
} as const;

export interface OwlArtProps {
  size?: number;
  /** Bubble is part of the logo; hide it for compact marks. */
  bubble?: boolean;
  ink?: string;
  bubbleFill?: string;
  style?: { opacity?: number };
}

/**
 * Static owl drawing (eyes included). AnimatedOwl uses `OwlBodyOnly` and
 * draws animated eye layers itself.
 */
export function OwlArt({
  size = 180,
  bubble = true,
  ink = Colors.text,
  bubbleFill = Colors.white,
}: OwlArtProps) {
  const height = (size * OWL_VIEWBOX.height) / OWL_VIEWBOX.width;

  return (
    <Svg width={size} height={height} viewBox={`0 0 ${OWL_VIEWBOX.width} ${OWL_VIEWBOX.height}`}>
      {bubble ? <Path d={OWL_GEOMETRY.bubble} fill={bubbleFill} /> : null}
      <G>
        <Path d={OWL_GEOMETRY.leftEar} fill={ink} />
        <Path d={OWL_GEOMETRY.rightEar} fill={ink} />
        <Path d={OWL_GEOMETRY.body} fill={ink} />
        <Ellipse cx={256} cy={238} rx={64} ry={48} fill={bubbleFill} />
        <Circle cx={OWL_GEOMETRY.eye.cx} cy={OWL_GEOMETRY.eye.cy} r={OWL_GEOMETRY.eye.r} fill={bubbleFill} />
        <Circle
          cx={OWL_GEOMETRY.rightEye.cx}
          cy={OWL_GEOMETRY.rightEye.cy}
          r={OWL_GEOMETRY.rightEye.r}
          fill={bubbleFill}
        />
        <Circle cx={220} cy={190} r={OWL_GEOMETRY.pupil.r} fill={ink} />
        <Circle cx={308} cy={190} r={OWL_GEOMETRY.pupil.r} fill={ink} />
        <Path d={OWL_GEOMETRY.beak} fill={Colors.accent} />
      </G>
    </Svg>
  );
}

/** Owl without eyes/pupils; AnimatedOwl layers animated views on top. */
export function OwlBodyOnly({
  size = 180,
  bubble = true,
  ink = Colors.text,
  bubbleFill = Colors.white,
}: OwlArtProps) {
  const height = (size * OWL_VIEWBOX.height) / OWL_VIEWBOX.width;

  return (
    <Svg width={size} height={height} viewBox={`0 0 ${OWL_VIEWBOX.width} ${OWL_VIEWBOX.height}`}>
      {bubble ? <Path d={OWL_GEOMETRY.bubble} fill={bubbleFill} /> : null}
      <Path d={OWL_GEOMETRY.leftEar} fill={ink} />
      <Path d={OWL_GEOMETRY.rightEar} fill={ink} />
      <Path d={OWL_GEOMETRY.body} fill={ink} />
      <Ellipse cx={256} cy={238} rx={64} ry={48} fill={bubbleFill} />
      <Path d={OWL_GEOMETRY.beak} fill={Colors.accent} />
    </Svg>
  );
}
