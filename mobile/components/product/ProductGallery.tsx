import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useReducedMotion } from 'react-native-reanimated';
import { Icon } from '@components/ui/Icon';
import { Durations } from '@constants/motion';
import { Colors, Radius, Spacing } from '@constants/theme';

export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [selected, setSelected] = useState(0);
  const reduced = useReducedMotion();
  const index = selected < images.length ? selected : 0;
  const photo = images[index];

  return (
    <View>
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
          <Icon name="ImageSquare" size={48} color="textSecondary" />
        </View>
      )}
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
  photo: {
    width: '100%', height: 260, backgroundColor: Colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  strip: {
    gap: Spacing.sm, paddingHorizontal: Spacing.base, paddingTop: Spacing.md,
  },
  thumbnail: {
    width: 52, height: 52, padding: 2, borderRadius: Radius.sm,
    borderColor: Colors.border, borderWidth: 2,
  },
  selected: { borderColor: Colors.primary },
  preview: { width: '100%', height: '100%', borderRadius: Radius.sm - 4, backgroundColor: Colors.surfaceMuted },
});
