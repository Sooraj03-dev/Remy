// mobile/components/product/ProductGallery.tsx
// Edge-to-edge parallax hero gallery with top readability scrim and animated page dots.

import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { AppIcon } from '@components/ui/AppIcon';
import { Durations, Easings } from '@constants/motion';
import { Colors, Radius, Spacing } from '@constants/theme';

const HERO_HEIGHT = 310;

function PageDot({ active }: { active: boolean }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    const target = active ? 1 : 0;
    progress.value = reduced
      ? target
      : withTiming(target, { duration: Durations.micro, easing: Easings.enter });
  }, [active, progress, reduced]);

  const dotStyle = useAnimatedStyle(() => ({
    width: 7 + progress.value * 13,
    opacity: 0.55 + progress.value * 0.45,
  }));

  return <Animated.View style={[styles.dot, dotStyle]} />;
}

export function ProductGallery({
  images,
  title,
  topInset = 0,
  scrollY,
}: {
  images: string[];
  title: string;
  topInset?: number;
  scrollY?: SharedValue<number>;
}) {
  const [selected, setSelected] = useState(0);
  const reduced = useReducedMotion();
  const index = selected < images.length ? selected : 0;
  const photo = images[index];

  const parallaxStyle = useAnimatedStyle(() => {
    if (!scrollY || reduced) return {};
    const y = scrollY.value;
    return {
      transform: [
        {
          translateY: y > 0 ? y * 0.35 : y * 0.45,
        },
        {
          scale: interpolate(y, [-120, 0, HERO_HEIGHT], [1.14, 1, 1], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <View>
      <View style={styles.heroWrap}>
        <Animated.View style={[styles.heroMedia, parallaxStyle]}>
          {photo ? (
            <Image
              source={photo}
              style={styles.photo}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={reduced ? 0 : Durations.micro}
              accessible
              accessibilityLabel={`${title}, photo ${index + 1} of ${images.length}`}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.photo} accessible accessibilityLabel="No listing photo">
              <AppIcon name="image" size={48} tint="textSecondary" />
            </View>
          )}
        </Animated.View>

        {/* Top scrim ensures status bar and floating back action remain legible on bright photos */}
        <LinearGradient
          colors={['rgba(36,23,16,0.62)', 'rgba(36,23,16,0.24)', 'rgba(36,23,16,0)']}
          locations={[0, 0.55, 1]}
          style={[styles.topScrim, { height: topInset + 78 }]}
          pointerEvents="none"
        />

        {images.length > 1 ? (
          <View style={styles.dots} pointerEvents="none">
            {images.map((_, position) => (
              <PageDot key={`dot-${position}`} active={position === index} />
            ))}
          </View>
        ) : null}
      </View>

      {images.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {images.map((uri, position) => (
            <Pressable
              key={`${position}-${uri}`}
              onPress={() => setSelected(position)}
              accessibilityRole="button"
              accessibilityLabel={`Show photo ${position + 1} of ${images.length}`}
              accessibilityState={{ selected: position === index }}
              style={[styles.thumbnail, position === index && styles.selected]}
            >
              <Image source={uri} style={styles.preview} cachePolicy="memory-disk" contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: { position: 'relative', height: HERO_HEIGHT, overflow: 'hidden', backgroundColor: Colors.surfaceMuted },
  heroMedia: { width: '100%', height: HERO_HEIGHT },
  photo: {
    width: '100%',
    height: HERO_HEIGHT,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  dots: {
    position: 'absolute',
    bottom: Spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  strip: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
  },
  thumbnail: {
    width: 52,
    height: 52,
    padding: 2,
    borderRadius: Radius.sm,
    borderColor: Colors.border,
    borderWidth: 2,
  },
  selected: { borderColor: Colors.primary },
  preview: { width: '100%', height: '100%', borderRadius: Radius.sm - 4, backgroundColor: Colors.surfaceMuted },
});
