// mobile/components/product/ProductCard.tsx
// Product listing card with clay squish, typed icons and a heart-burst wishlist.

import React from 'react';
import { View, Image, StyleSheet, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { ClayPressable } from '@components/fx/ClayPressable';
import { HeartBurst } from '@components/fx/HeartBurst';
import { ClayText } from '@components/ui/ClayText';
import { Icon } from '@components/ui/Icon';
import { StatusBadge } from './StatusBadge';
import type { Product } from '@shared/index';
import { Colors, Spacing, Radius } from '@constants/theme';

interface ProductCardProps {
  product: Product;
  style?: ViewStyle;
  isWishlisted?: boolean;
  onWishlistToggle?: () => void;
}

export function ProductCard({
  product,
  style,
  isWishlisted = false,
  onWishlistToggle,
}: ProductCardProps) {
  const router = useRouter();

  return (
    <ClayPressable
      onPress={() => router.push(`/product/${product.id}`)}
      accessibilityLabel={`${product.title}, ₹${product.price}`}
      style={[styles.card, style]}
      tone="oat"
    >
      <View style={styles.imageWrapper}>
        {product.images[0] ? (
          <Image
            source={{ uri: product.images[0] }}
            style={styles.image}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Icon name="ImageSquare" size="lg" color="textSecondary" />
          </View>
        )}
        <View style={styles.badgeOverlay}>
          <StatusBadge status={product.status} />
        </View>
        {onWishlistToggle ? (
          <View style={styles.heartButton}>
            <HeartBurst
              active={isWishlisted}
              onPress={onWishlistToggle}
              size={18}
              accessibilityLabel={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <ClayText variant="bodyBold" numberOfLines={1}>
          {product.title}
        </ClayText>
        <ClayText variant="h3" color="primary">
          ₹{product.price.toLocaleString('en-IN')}
        </ClayText>
        <ClayText variant="caption" numberOfLines={1}>
          {product.sellerName}
        </ClayText>
      </View>
    </ClayPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
  },
  imageWrapper: { position: 'relative', margin: Spacing.xs, marginBottom: 0 },
  image: {
    width: '100%',
    height: 120,
    borderRadius: Radius.md,
  },
  placeholder: { backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  badgeOverlay: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
  },
  heartButton: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
  },
  info: {
    padding: Spacing.md,
    gap: 2,
  },
});
