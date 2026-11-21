// mobile/components/product/ProductCard.tsx
// Product listing card with clay squish, typed icons and a heart-burst wishlist.

import React from 'react';
import { View, Image, StyleSheet, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { ClayPressable } from '@components/fx/ClayPressable';
import { HeartBurst } from '@components/fx/HeartBurst';
import { ClayText } from '@components/ui/ClayText';
import { StatusBadge } from './StatusBadge';
import type { Product } from '@shared/index';
import { Colors, Spacing, Radius } from '@constants/theme';

interface ProductCardProps {
  product: Product;
  style?: ViewStyle;
  isWishlisted?: boolean;
  onWishlistToggle?: () => void;
}

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/160x120/B9A0EB/FFFFFF?text=Owl';

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
      haptic={false}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: product.images[0] ?? PLACEHOLDER_IMAGE }}
          style={styles.image}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
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
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    overflow: 'hidden',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 7,
  },
  imageWrapper: { position: 'relative' },
  image: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
  },
  badgeOverlay: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
  },
  heartButton: {
    position: 'absolute',
    top: -4,
    left: -4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: Radius.full,
  },
  info: {
    padding: Spacing.md,
    gap: 2,
  },
});
