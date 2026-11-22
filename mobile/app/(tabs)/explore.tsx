// mobile/app/(tabs)/explore.tsx
// Explore — live search with a skeleton grid and empty/error states.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import {
  ClayHeader,
  ClayInput,
  ClayCard,
  ProductCard,
  ClayButton,
  ClayText,
  SkeletonCard,
  StaggeredItem,
  Icon,
} from '@components/index';
import { RemyArt } from '@components/ui/RemyArt';
import { RemyMascot } from '@components/ui/RemyMascot';
import { Colors, Spacing } from '@constants/theme';
import { Copy, isOfflineError } from '@constants/copy';
import { fetchProducts } from '../../services/api';
import type { Product } from '../../../shared/types';

export default function ExploreScreen() {
  const focused = useIsFocused();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(async (query: string) => {
    setError(null);
    try {
      const data = await fetchProducts({ search: query.trim() || undefined });
      setProducts(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to search products.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, performSearch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    performSearch(search);
  }, [performSearch, search]);

  return (
    <View style={styles.container}>
      <ClayHeader title="Explore" subtitle="Find second-hand gems on campus" />

      <View style={styles.searchBar}>
        <ClayInput
          showMascotOnFocus
          value={search}
          onChangeText={setSearch}
          placeholder="Search by title, brand, or course..."
          returnKeyType="search"
          accessibilityLabel="Search products"
        />
      </View>

      <View style={styles.results}>
        {loading && !refreshing ? (
          <View style={styles.skeletonGrid}>
            {[0, 1, 2, 3].map((index) => (
              <SkeletonCard key={index} width={160} height={196} paused={!focused} />
            ))}
            <View style={styles.loadingOverlay} pointerEvents="none">
              <RemyMascot state="loading" status={Copy.loading.search[0]} paused={!focused} />
            </View>
          </View>
        ) : error ? (
          <ClayCard variant="peach" style={styles.emptyCard}>
            {isOfflineError(error) ? (
              <Icon name="WifiSlash" size="lg" weight="duotone" color="primary" />
            ) : (
              <RemyArt size={110} />
            )}
            <ClayText variant="bodyBold" align="center">
              {isOfflineError(error) ? Copy.error.offlineTitle : Copy.error.title}
            </ClayText>
            <ClayText variant="caption" style={styles.errorText}>
              {isOfflineError(error) ? `${Copy.error.offline} (${error})` : error}
            </ClayText>
            <ClayButton
              label={Copy.error.retry}
              variant="secondary"
              onPress={() => performSearch(search)}
              style={{ marginTop: Spacing.sm }}
            />
          </ClayCard>
        ) : products.length === 0 ? (
          <ClayCard style={styles.emptyCard}>
            <RemyArt size={118} />
            <ClayText variant="bodyBold" align="center">
              {Copy.empty.searchTitle}
            </ClayText>
            <ClayText variant="caption" align="center" style={styles.emptyText}>
              {search.trim()
                ? `Nothing matches "${search}". ${Copy.empty.search}`
                : 'There are currently no approved products listed on campus.'}
            </ClayText>
          </ClayCard>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <StaggeredItem index={index} style={styles.card}>
                <ProductCard product={item} />
              </StaggeredItem>
            )}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
          />
        )}
      </View>
      {!loading ? <RemyMascot state="roaming" paused={!focused} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBar: { paddingHorizontal: Spacing.base, marginTop: Spacing.xs, zIndex: 1 },
  results: { flex: 1 },
  list: { padding: Spacing.base, gap: Spacing.sm },
  row: { gap: Spacing.sm },
  card: { flex: 1 },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    padding: Spacing.base,
  },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', padding: Spacing.base },
  emptyCard: {
    margin: Spacing.base,
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  errorText: { color: Colors.error, textAlign: 'center' },
  emptyText: { textAlign: 'center', color: Colors.textSecondary },
});
