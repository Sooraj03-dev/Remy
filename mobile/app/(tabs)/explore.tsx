// mobile/app/(tabs)/explore.tsx
// Explore — live search with a skeleton grid and empty/error states.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  type ListRenderItem,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import {
  ClayHeader,
  ClayCard,
  ProductCard,
  ClayText,
  SearchBar,
  SkeletonCard,
  StaggeredItem,
} from '@components/index';
import { MarketplaceError } from '@components/product/MarketplaceError';
import { RemyMascot } from '@components/ui/RemyMascot';
import { MagnifierRemy, RefreshingRemy } from '@components/ui/RemyReactions';
import { useFeedMascot } from '@hooks/useFeedMascot';
import { Colors, Spacing } from '@constants/theme';
import { Copy } from '@constants/copy';
import { fetchProducts } from '../../services/api';
import type { Product } from '../../../shared/types';

const EMPTY_PRODUCTS: Product[] = [];
const productKey = (product: Product) => product.id;

export default function ExploreScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const focused = useIsFocused();
  const [search, setSearch] = useState(typeof q === 'string' ? q : '');
  const [settledQuery, setSettledQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentRequest = useRef(0);
  const { gesture, onFeedScroll, pull, browsingTime } = useFeedMascot(refreshing, focused);

  useEffect(() => {
    if (typeof q === 'string') setSearch(q);
  }, [q]);

  const performSearch = useCallback(async (query: string) => {
    const request = ++currentRequest.current;
    try {
      const data = await fetchProducts({ search: query.trim() || undefined });
      if (request !== currentRequest.current) return;
      setError(null);
      setProducts(data);
    } catch (err) {
      if (request !== currentRequest.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to search products.';
      setError(msg);
    } finally {
      if (request === currentRequest.current) {
        setSettledQuery(query.trim());
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(search);
    }, 350);
    return () => {
      clearTimeout(timer);
      currentRequest.current += 1;
    };
  }, [search, performSearch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    performSearch(search);
  }, [performSearch, search]);

  const pendingQuery = search.trim() !== settledQuery;
  const showLoading = !refreshing && (loading || (pendingQuery && (products.length === 0 || !!error)));
  const visibleProducts = showLoading || error ? EMPTY_PRODUCTS : products;
  const renderProduct = useCallback<ListRenderItem<Product>>(({ item, index }) => (
    <StaggeredItem index={index} style={styles.card}>
      <ProductCard product={item} />
    </StaggeredItem>
  ), []);

  return (
    <View style={styles.container}>
      <StaggeredItem index={0}>
        <ClayHeader title="Explore" subtitle="Find second-hand gems on campus" />
      </StaggeredItem>

      <View style={styles.searchBar}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
          loading={focused && pendingQuery}
          placeholder="Search by title, brand, or course..."
          accessibilityLabel="Search products"
        />
      </View>

      <View style={styles.results}>
        <GestureDetector gesture={gesture}>
          <Animated.FlatList
            data={visibleProducts}
            keyExtractor={productKey}
            removeClippedSubviews={true}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={visibleProducts.length > 0 ? styles.list : styles.emptyList}
            onScroll={onFeedScroll}
            scrollEventThrottle={16}
            alwaysBounceVertical
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            renderItem={renderProduct}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
            ListEmptyComponent={showLoading ? (
              <View style={styles.skeletonGrid}>
                {[0, 1, 2, 3].map((index) => (
                  <SkeletonCard key={index} width={160} height={196} paused={!focused} />
                ))}
                <View style={styles.loadingOverlay} pointerEvents="none">
                  <RemyMascot state="loading" nibble status={Copy.loading.search[0]} paused={!focused} />
                </View>
              </View>
            ) : error ? (
              <MarketplaceError error={error} onRetry={() => performSearch(search)} style={styles.resultMargin} />
            ) : (
              <ClayCard outlined style={styles.emptyCard}>
                <MagnifierRemy size={86} paused={!focused} />
                <ClayText variant="bodyBold" align="center">
                  {Copy.empty.searchTitle}
                </ClayText>
                <ClayText variant="caption" align="center" style={styles.emptyText}>
                  {search.trim()
                    ? `Nothing matches "${search}". ${Copy.empty.search}`
                    : 'There are currently no approved products listed on campus.'}
                </ClayText>
              </ClayCard>
            )}
          />
        </GestureDetector>
        <RefreshingRemy pull={pull} refreshing={refreshing} paused={!focused} />
      </View>
      {!loading ? (
        <View style={styles.mascotDock} pointerEvents="box-none">
          <RemyMascot state="roaming" paused={!focused} browsingTime={browsingTime} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBar: { paddingHorizontal: Spacing.base, marginTop: Spacing.xs, marginBottom: Spacing.xs, zIndex: 1 },
  results: { flex: 1 },
  list: { padding: Spacing.base, paddingBottom: 76, gap: Spacing.sm },
  emptyList: { flexGrow: 1, paddingBottom: 76 },
  mascotDock: { position: 'absolute', left: 0, right: 0, bottom: 0 },
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
  resultMargin: { margin: Spacing.base },
  emptyText: { textAlign: 'center', color: Colors.textSecondary },
});
