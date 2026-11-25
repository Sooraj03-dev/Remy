// mobile/components/product/ProductGallery.tsx
// Edge-to-edge hero gallery with top readability scrim and thumbnail switcher.

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useReducedMotion } from 'react-native-reanimated';
import { AppIcon } from '@components/ui/AppIcon';
import { Durations } from '@constants/motion';
import { Colors, Radius, Spacing } from '@constants/theme';

export function ProductGallery({
  images,
  title,
  topInset = 0,
}: {
  images: string[];
  title: string;
  topInset?: number;
}) {
  const [selected, setSelected] = useState(0);
  const reduced = useReducedMotion();
  const index = selected < images.length ? selected : 0;
  const photo = images[index];

  return (
    <View>
      <View style={styles.heroWrap}>
        {photo ? (
          <Image
            source={photo}
            style={styles.photo}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={reduced ? 0 : Durations.fast}
            accessible
            accessibilityLabel={`${title}, photo ${index + 1} of ${images.length}`}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.photo} accessible accessibilityLabel="No listing photo">
            <AppIcon name="image" size={48} tint="textSecondary" />
          </View>
        )}

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
              <View
                key={`dot-${position}`}
                style={[styles.dot, position === index && styles.dotActive]}
              />
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
  heroWrap: { position: 'relative' },
  photo: {
    width: '100%',
    height: 310,
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
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dotActive: {
    width: 20,
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
