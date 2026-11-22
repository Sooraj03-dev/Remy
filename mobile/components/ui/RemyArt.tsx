import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import art from '../../assets/brand/source/remy-art.json';
import { Colors } from '@constants/theme';

type Part = Exclude<keyof typeof art, 'width' | 'height' | 'peekHeight' | 'colors' | 'poses'>;

const fills: Record<string, string> = art.colors;
export const REMY_FACE = ['cheeks', 'nose', 'mouth', 'whiskers'] as const;
export const REMY_PEEK_ASPECT_RATIO = art.width / art.peekHeight;

interface RemyArtProps {
  size: number;
  pose?: Exclude<keyof typeof art.poses, 'peeking'>;
  parts?: readonly Part[];
  peek?: boolean;
}

export const RemyArt = React.memo(function RemyArt({ size, pose = 'sitting', parts = art.poses[pose] as Part[], peek }: RemyArtProps) {
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
}, (previous, next) => (
  previous.size === next.size && previous.pose === next.pose && previous.peek === next.peek && (
    previous.parts === next.parts || (
      previous.parts !== undefined && next.parts !== undefined &&
      previous.parts.length === next.parts.length &&
      previous.parts.every((part, index) => part === next.parts?.[index])
    )
  )
));

export function RemyLayer({ style, ...artProps }: RemyArtProps & { style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, style]} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      <RemyArt {...artProps} />
    </Animated.View>
  );
}
