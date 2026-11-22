import React from 'react';
import Svg, { Path } from 'react-native-svg';
import art from '../../assets/brand/source/remy-art.json';
import { Colors } from '@constants/theme';

type Part = Exclude<keyof typeof art, 'width' | 'height' | 'peekHeight' | 'colors' | 'poses'>;

const fills: Record<string, string> = art.colors;

interface RemyArtProps {
  size: number;
  pose?: Exclude<keyof typeof art.poses, 'peeking'>;
  parts?: readonly Part[];
  peek?: boolean;
}

export function RemyArt({ size, pose = 'sitting', parts = art.poses[pose] as Part[], peek }: RemyArtProps) {
  const height = peek ? art.peekHeight : art.height;

  return (
    <Svg width={size} height={size * height / art.width} viewBox={`0 0 ${art.width} ${height}`}>
      {parts.map((part) =>
        art[part].map(({ d, fill, stroke, opacity }: {
          d: string;
          fill?: string;
          stroke?: number;
          opacity?: number;
        }, index) => (
          <Path
            key={`${part}-${index}`}
            d={d}
            fill={fill ? fills[fill] : 'none'}
            stroke={stroke ? Colors.text : undefined}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={opacity}
          />
        )),
      )}
    </Svg>
  );
}
