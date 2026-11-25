// mobile/app/wishlist/index.tsx
// Saved Wishlist Screen — Display and manage saved campus products

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  type ListRenderItem,
} from 'react-native';
import { RemyMascot } from '@components/ui/RemyMascot';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { AppIcon, ClayHeader, ClayCard, ProductCard, ClayButton } from '@components/index';
import { Colors, Spacing, Typography, FontSize, FontFamily } from '@constants/theme';
import { fetchWishlist, removeFromWishlist } from '../../services/api';
import type { Product } from '../../../shared/types';

const productKey = (product: Product) => product.id;

export default function WishlistScreen() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWishlist = useCallback(async () => {
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required.');
      const data = await fetchWishlist(token);
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your saved items.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    setLoading(true);
    loadWishlist();
  }, [loadWishlist]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWishlist();
  }, [loadWishlist]);

  const handleRemove = useCallback(async (productId: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      await removeFromWishlist(token, productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err) {
      console.warn('[Wishlist remove error]', err);
    }
  }, [getToken]);

  const renderProduct = useCallback<ListRenderItem<Product>>(({ item }) => (
    <View style={styles.cardContainer}>
      <ProductCard product={item} />
      <Pressable style={styles.removeBtn} onPress={() => handleRemove(item.id)}>
        <AppIcon name="close" size={13} tint="errorText" />
        <Text style={styles.removeBtnText}>Remove</Text>
      </Pressable>
    </View>
  ), [handleRemove]);

  return (
    <View style={styles.container}>
      <ClayHeader title="Saved Wishlist" subtitle="Items you are interested in buying" />

      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <RemyMascot state="loading" status="Loading saved items..." />
        </View>
      ) : error ? (
        <View style={styles.content}>
          <ClayCard variant="peach" style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <AppIcon name="warning" size={40} tint="errorText" />
            </View>
            <Text style={Typography.bodyBold}>Could not load wishlist</Text>
            <Text style={[Typography.caption, styles.errorText]}>{error}</Text>
            <ClayButton label="Retry" variant="secondary" onPress={loadWishlist} style={{ marginTop: Spacing.sm }} />
          </ClayCard>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.content}>
          <ClayCard variant="lavender" style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <AppIcon name="favorite" size={40} tint="errorText" variant="duotone" />
            </View>
            <Text style={Typography.bodyBold}>Your wishlist is empty</Text>
            <Text style={[Typography.caption, styles.emptyText]}>
              Tap the heart icon on any product to save it here for later.
            </Text>
            <ClayButton
              label="Explore Marketplace"
              onPress={() => router.push('/(tabs)/home')}
              style={{ marginTop: Spacing.md }}
            />
          </ClayCard>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={productKey}
          removeClippedSubviews={true}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          renderItem={renderProduct}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  emptyCard: { padding: Spacing.xl, alignItems: 'center' },
  emptyIconWrap: { marginBottom: Spacing.sm },
  emptyText: { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.xs },
  errorText: { color: Colors.error, textAlign: 'center', marginTop: Spacing.xs },
  listContent: { padding: Spacing.sm, paddingBottom: Spacing.xxxl },
  columnWrapper: { justifyContent: 'space-between', marginBottom: Spacing.sm },
  cardContainer: { width: '48%' },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 48,
    paddingVertical: Spacing.xs,
    marginTop: 4,
    backgroundColor: Colors.white,
    borderRadius: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  removeBtnText: { fontSize: FontSize.caption, fontFamily: FontFamily.bodyBold, color: Colors.error },
});

